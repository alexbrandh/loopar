-- Crear buckets si no existen
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('postcard-images', 'postcard-images', false),
  ('postcard-videos', 'postcard-videos', false)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public;

-- Eliminar políticas existentes para recrearlas
DROP POLICY IF EXISTS "Users can upload their own postcard images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own postcard images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own postcard images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own postcard videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own postcard videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own postcard videos" ON storage.objects;

-- Políticas para postcard-images bucket
CREATE POLICY "Users can upload their own postcard images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'postcard-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own postcard images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'postcard-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own postcard images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'postcard-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Políticas para postcard-videos bucket
CREATE POLICY "Users can upload their own postcard videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'postcard-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own postcard videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'postcard-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own postcard videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'postcard-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política adicional para permitir acceso anónimo a signed URLs
CREATE POLICY "Allow signed URL access"
ON storage.objects FOR SELECT
TO anon
USING (true);