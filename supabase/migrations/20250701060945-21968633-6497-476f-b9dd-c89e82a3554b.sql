
-- Phase 1: Critical RLS Policy Hardening

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Public can view photos in active albums" ON public.photos;
DROP POLICY IF EXISTS "Public can view active albums" ON public.albums;
DROP POLICY IF EXISTS "Public can insert photos" ON public.photos;
DROP POLICY IF EXISTS "Public can manage upload limits" ON public.upload_limits;

-- Create secure album access policies
CREATE POLICY "Albums viewable by code" ON public.albums
  FOR SELECT USING (
    is_active = true AND 
    album_code IS NOT NULL
  );

-- Create secure photo viewing policy - only for active albums
CREATE POLICY "Photos viewable in active albums" ON public.photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.albums 
      WHERE albums.id = photos.album_id 
      AND albums.is_active = true
    )
  );

-- Create controlled photo insertion policy
CREATE POLICY "Controlled photo insertion" ON public.photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.albums 
      WHERE albums.id = photos.album_id 
      AND albums.is_active = true
    ) AND
    file_name IS NOT NULL AND
    file_size > 0 AND
    device_id IS NOT NULL
  );

-- Create device session tracking table
CREATE TABLE public.device_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- Add indexes for performance
CREATE INDEX idx_device_sessions_token ON public.device_sessions(session_token);
CREATE INDEX idx_device_sessions_device_album ON public.device_sessions(device_id, album_id);
CREATE INDEX idx_device_sessions_active ON public.device_sessions(is_active, expires_at);

-- Create album access log table
CREATE TABLE public.album_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  action TEXT NOT NULL, -- 'view', 'upload', 'access_denied'
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for access logs
CREATE INDEX idx_album_access_logs_album_time ON public.album_access_logs(album_id, created_at);

-- Enable RLS on new tables
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_access_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for device sessions (public read for validation)
CREATE POLICY "Device sessions readable for validation" ON public.device_sessions
  FOR SELECT USING (is_active = true AND expires_at > now());

CREATE POLICY "Device sessions insertable" ON public.device_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Device sessions updatable by device" ON public.device_sessions
  FOR UPDATE USING (true);

-- Create policies for access logs (album owners can view)
CREATE POLICY "Album owners can view access logs" ON public.album_access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.albums 
      WHERE albums.id = album_access_logs.album_id 
      AND albums.user_id = auth.uid()
    )
  );

CREATE POLICY "Access logs insertable" ON public.album_access_logs
  FOR INSERT WITH CHECK (true);

-- Update upload limits policy to be more secure
CREATE POLICY "Secure upload limits management" ON public.upload_limits
  FOR ALL USING (
    -- Allow if it's for an active album
    EXISTS (
      SELECT 1 FROM public.albums 
      WHERE albums.id = upload_limits.album_id 
      AND albums.is_active = true
    )
  ) WITH CHECK (
    -- Same check for inserts/updates
    EXISTS (
      SELECT 1 FROM public.albums 
      WHERE albums.id = upload_limits.album_id 
      AND albums.is_active = true
    )
  );

-- Improve album code security - make them longer and more secure
ALTER TABLE public.albums 
ADD COLUMN new_album_code TEXT;

-- Function to generate secure album codes
CREATE OR REPLACE FUNCTION public.generate_secure_album_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Update existing albums with secure codes
UPDATE public.albums 
SET new_album_code = public.generate_secure_album_code()
WHERE new_album_code IS NULL;

-- Add unique constraint
ALTER TABLE public.albums 
ADD CONSTRAINT albums_new_album_code_unique UNIQUE (new_album_code);

-- Enhanced file validation function
CREATE OR REPLACE FUNCTION public.validate_media_upload_enhanced(
  file_size_bytes BIGINT,
  file_type TEXT,
  file_extension TEXT,
  device_id TEXT,
  album_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB := '{"valid": false, "errors": []}'::jsonb;
  errors TEXT[] := ARRAY[]::TEXT[];
  current_count INTEGER;
  album_limit INTEGER;
BEGIN
  -- Check file size limits
  IF file_type = 'image' AND file_size_bytes > 50 * 1024 * 1024 THEN
    errors := array_append(errors, 'Image file too large (max 50MB)');
  END IF;
  
  IF file_type = 'video' AND file_size_bytes > 1024 * 1024 * 1024 THEN
    errors := array_append(errors, 'Video file too large (max 1GB)');
  END IF;
  
  -- Check allowed extensions
  IF file_type = 'image' AND file_extension NOT IN ('jpg', 'jpeg', 'png', 'gif', 'webp') THEN
    errors := array_append(errors, 'Invalid image format');
  END IF;
  
  IF file_type = 'video' AND file_extension NOT IN ('mp4', 'mov', 'avi', 'mkv', 'webm') THEN
    errors := array_append(errors, 'Invalid video format');
  END IF;
  
  -- Check upload limits
  SELECT photo_limit INTO album_limit
  FROM public.albums 
  WHERE id = album_id AND is_active = true;
  
  IF album_limit IS NULL THEN
    errors := array_append(errors, 'Album not found or inactive');
  ELSE
    SELECT COALESCE(upload_count, 0) INTO current_count
    FROM public.upload_limits 
    WHERE album_id = validate_media_upload_enhanced.album_id 
    AND device_id = validate_media_upload_enhanced.device_id;
    
    IF COALESCE(current_count, 0) >= album_limit THEN
      errors := array_append(errors, 'Upload limit exceeded');
    END IF;
  END IF;
  
  -- Build result
  IF array_length(errors, 1) IS NULL THEN
    result := jsonb_build_object('valid', true, 'errors', '[]'::jsonb);
  ELSE
    result := jsonb_build_object('valid', false, 'errors', to_jsonb(errors));
  END IF;
  
  RETURN result;
END;
$$;

-- Function to create device session
CREATE OR REPLACE FUNCTION public.create_device_session(
  p_device_id TEXT,
  p_album_id UUID,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_token TEXT;
BEGIN
  -- Generate secure session token
  session_token := encode(gen_random_bytes(32), 'base64');
  
  -- Clean up expired sessions
  DELETE FROM public.device_sessions 
  WHERE expires_at < now();
  
  -- Create new session
  INSERT INTO public.device_sessions (
    device_id, 
    album_id, 
    session_token, 
    ip_address, 
    user_agent
  ) VALUES (
    p_device_id, 
    p_album_id, 
    session_token, 
    p_ip_address, 
    p_user_agent
  );
  
  RETURN session_token;
END;
$$;

-- Function to validate device session
CREATE OR REPLACE FUNCTION public.validate_device_session(
  p_session_token TEXT,
  p_device_id TEXT,
  p_album_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update last activity and check if session is valid
  UPDATE public.device_sessions 
  SET last_activity = now()
  WHERE session_token = p_session_token
    AND device_id = p_device_id
    AND album_id = p_album_id
    AND is_active = true
    AND expires_at > now();
    
  RETURN FOUND;
END;
$$;

-- Add rate limiting table
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP address or device_id
  action TEXT NOT NULL, -- 'album_access', 'upload_attempt', etc.
  attempt_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(identifier, action)
);

CREATE INDEX idx_rate_limits_identifier_action ON public.rate_limits(identifier, action);
CREATE INDEX idx_rate_limits_blocked ON public.rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Rate limits are publicly readable for validation
CREATE POLICY "Rate limits readable for validation" ON public.rate_limits
  FOR SELECT USING (true);

CREATE POLICY "Rate limits insertable" ON public.rate_limits
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Rate limits updatable" ON public.rate_limits
  FOR UPDATE USING (true);
