-- Create storage buckets for postcard files

-- Create postcard-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('postcard-images', 'postcard-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create postcard-videos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('postcard-videos', 'postcard-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for postcard-images bucket
CREATE POLICY "Users can upload their own images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'postcard-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'postcard-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

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

CREATE POLICY "Users can update their own images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'postcard-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'postcard-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Set up RLS policies for postcard-videos bucket
CREATE POLICY "Users can upload their own videos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'postcard-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own videos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'postcard-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own videos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'postcard-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own videos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'postcard-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Grant permissions to authenticated users
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;