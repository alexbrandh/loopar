-- Create postcards bucket for NFT descriptor files

-- Create postcards bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('postcards', 'postcards', false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for postcards bucket
CREATE POLICY "Users can upload their own postcard NFT files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'postcards' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own postcard NFT files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'postcards' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own postcard NFT files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'postcards' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own postcard NFT files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'postcards' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow anonymous access to NFT descriptor files for AR viewing
CREATE POLICY "Anonymous access to NFT descriptors" ON storage.objects
FOR SELECT USING (
  bucket_id = 'postcards' AND
  name LIKE '%/nft/%'
);

-- Grant permissions to authenticated users
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;