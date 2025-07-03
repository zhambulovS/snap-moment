-- Fix storage_path for existing records and update RLS policies for better deletion support

-- Update existing records to have proper storage_path
UPDATE public.photos 
SET storage_path = file_name 
WHERE storage_path IS NULL;

-- Add RLS policy for album owners to delete photos
CREATE POLICY "Album owners can delete photos" ON public.photos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.albums 
      WHERE albums.id = photos.album_id 
      AND albums.user_id = auth.uid()
    )
  );