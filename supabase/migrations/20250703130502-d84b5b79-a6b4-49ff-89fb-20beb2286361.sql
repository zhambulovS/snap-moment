-- Fix ambiguous column reference in validate_media_upload_enhanced function
-- and add support for HEIC/HEIF formats

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
  v_album_id UUID := album_id; -- Create local variable to avoid ambiguity
BEGIN
  -- Check file size limits
  IF file_type = 'image' AND file_size_bytes > 50 * 1024 * 1024 THEN
    errors := array_append(errors, 'Image file too large (max 50MB)');
  END IF;
  
  IF file_type = 'video' AND file_size_bytes > 1024 * 1024 * 1024 THEN
    errors := array_append(errors, 'Video file too large (max 1GB)');
  END IF;
  
  -- Check allowed extensions (adding HEIC/HEIF support)
  IF file_type = 'image' AND file_extension NOT IN ('jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif') THEN
    errors := array_append(errors, 'Invalid image format. Supported: JPG, PNG, GIF, WebP, HEIC, HEIF');
  END IF;
  
  IF file_type = 'video' AND file_extension NOT IN ('mp4', 'mov', 'avi', 'mkv', 'webm') THEN
    errors := array_append(errors, 'Invalid video format. Supported: MP4, MOV, AVI, MKV, WebM');
  END IF;
  
  -- Check upload limits
  SELECT photo_limit INTO album_limit
  FROM public.albums 
  WHERE id = v_album_id AND is_active = true;
  
  IF album_limit IS NULL THEN
    errors := array_append(errors, 'Album not found or inactive');
  ELSE
    SELECT COALESCE(upload_count, 0) INTO current_count
    FROM public.upload_limits 
    WHERE upload_limits.album_id = v_album_id 
    AND upload_limits.device_id = validate_media_upload_enhanced.device_id;
    
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