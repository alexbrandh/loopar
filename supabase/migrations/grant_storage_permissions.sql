-- Otorgar permisos SELECT a anon para poder leer objetos públicos
GRANT SELECT ON storage.objects TO anon;

-- Otorgar permisos completos a authenticated para gestionar sus objetos
GRANT ALL PRIVILEGES ON storage.objects TO authenticated;

-- Verificar que los permisos se otorgaron correctamente
SELECT 
  grantee, 
  table_name, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'storage' 
  AND table_name = 'objects' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;