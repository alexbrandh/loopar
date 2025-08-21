-- Create processing status enum
CREATE TYPE processing_status AS ENUM ('processing', 'ready', 'error', 'needs_better_image');

-- Create postcards table
CREATE TABLE postcards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  video_url TEXT NOT NULL,
  nft_descriptors JSONB,
  processing_status processing_status DEFAULT 'processing',
  error_message TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_postcards_user_id ON postcards(user_id);
CREATE INDEX idx_postcards_status ON postcards(processing_status);
CREATE INDEX idx_postcards_public ON postcards(is_public);
CREATE INDEX idx_postcards_created_at ON postcards(created_at DESC);

-- Enable RLS
ALTER TABLE postcards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own postcards
CREATE POLICY "Users can view own postcards" ON postcards
  FOR SELECT USING (auth.uid()::text = user_id);

-- Users can insert their own postcards
CREATE POLICY "Users can insert own postcards" ON postcards
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own postcards
CREATE POLICY "Users can update own postcards" ON postcards
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Users can delete their own postcards
CREATE POLICY "Users can delete own postcards" ON postcards
  FOR DELETE USING (auth.uid()::text = user_id);

-- Public can view public postcards (for AR viewer)
CREATE POLICY "Public can view public postcards" ON postcards
  FOR SELECT USING (is_public = true);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('postcard-images', 'postcard-images', false),
  ('postcard-videos', 'postcard-videos', false),
  ('nft-descriptors', 'nft-descriptors', false);

-- Storage policies for postcard-images bucket
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

CREATE POLICY "Users can delete their own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'postcard-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for postcard-videos bucket
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

CREATE POLICY "Users can delete their own videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'postcard-videos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for nft-descriptors bucket
CREATE POLICY "Users can upload their own NFT descriptors" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'nft-descriptors' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view NFT descriptors" ON storage.objects
  FOR SELECT USING (bucket_id = 'nft-descriptors');

CREATE POLICY "Users can delete their own NFT descriptors" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'nft-descriptors' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON postcards TO anon;
GRANT ALL PRIVILEGES ON postcards TO authenticated;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_postcards_updated_at
  BEFORE UPDATE ON postcards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();