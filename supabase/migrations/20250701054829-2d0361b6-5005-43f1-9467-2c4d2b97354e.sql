
-- Add video support to photos table
ALTER TABLE public.photos 
ADD COLUMN file_type TEXT NOT NULL DEFAULT 'image',
ADD COLUMN duration INTEGER, -- for videos in seconds
ADD COLUMN thumbnail_url TEXT; -- for video thumbnails

-- Create index for better performance
CREATE INDEX idx_photos_file_type ON public.photos(file_type);

-- Update existing records to have 'image' type
UPDATE public.photos SET file_type = 'image' WHERE file_type IS NULL;

-- Add policy for public viewing of photos in active albums
CREATE POLICY "Public can view photos in active albums" ON public.photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.albums 
      WHERE albums.id = photos.album_id 
      AND albums.is_active = true
    )
  );

-- Add policy for public viewing of albums
CREATE POLICY "Public can view active albums" ON public.albums
  FOR SELECT USING (is_active = true);

-- Create storage bucket for wedding media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wedding-media', 'wedding-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access to wedding media
CREATE POLICY "Public can view wedding media" ON storage.objects
  FOR SELECT USING (bucket_id = 'wedding-media');

-- Create policy for public upload to wedding media
CREATE POLICY "Public can upload wedding media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'wedding-media' 
    AND (storage.extension(name) = ANY(ARRAY['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'mkv', 'webm']))
  );

-- Update photos table to use new storage bucket path
ALTER TABLE public.photos 
ADD COLUMN storage_path TEXT;

-- Function to validate file uploads
CREATE OR REPLACE FUNCTION public.validate_media_upload(
  file_size_bytes BIGINT,
  file_type TEXT,
  file_extension TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check file size limits
  IF file_type = 'image' AND file_size_bytes > 50 * 1024 * 1024 THEN -- 50MB for images
    RETURN FALSE;
  END IF;
  
  IF file_type = 'video' AND file_size_bytes > 1024 * 1024 * 1024 THEN -- 1GB for videos
    RETURN FALSE;
  END IF;
  
  -- Check allowed extensions
  IF file_type = 'image' AND file_extension NOT IN ('jpg', 'jpeg', 'png', 'gif', 'webp') THEN
    RETURN FALSE;
  END IF;
  
  IF file_type = 'video' AND file_extension NOT IN ('mp4', 'mov', 'avi', 'mkv', 'webm') THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;
