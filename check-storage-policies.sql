-- Verificar políticas de Storage para los buckets
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY tablename, policyname;

-- Verificar buckets existentes
SELECT 
  id,
  name,
  public,
  created_at,
  updated_at
FROM storage.buckets
ORDER BY name;

-- Verificar objetos en buckets
SELECT 
  bucket_id,
  name,
  public,
  created_at
FROM storage.objects 
WHERE bucket_id IN ('postcard-images', 'postcard-videos')
LIMIT 10;