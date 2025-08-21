-- Add public access policies for postcard images

-- Allow public access to images from public postcards
CREATE POLICY "Public access to public postcard images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'postcard-images' AND
  EXISTS (
    SELECT 1 FROM postcards 
    WHERE postcards.image_url LIKE '%' || storage.objects.name || '%'
    AND postcards.is_public = true
  )
);

-- Allow anonymous access to all postcard images (for sharing)
CREATE POLICY "Anonymous access to postcard images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'postcard-images'
);

-- Grant SELECT permissions to anonymous users for storage objects
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.buckets TO anon;