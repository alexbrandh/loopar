-- Verificar si el bucket postcard-videos existe
SELECT name, id, public FROM storage.buckets WHERE name = 'postcard-videos';

-- Verificar permisos en storage.objects para usuarios autenticados
SELECT 
  grantee, 
  table_name, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'storage' 
  AND table_name = 'objects' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Verificar objetos existentes en el bucket
SELECT 
  name,
  bucket_id,
  owner,
  created_at,
  updated_at,
  metadata
FROM storage.objects 
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'postcard-videos')
ORDER BY created_at DESC;

-- Verificar políticas RLS en storage.objects
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
WHERE schemaname = 'storage' AND tablename = 'objects';