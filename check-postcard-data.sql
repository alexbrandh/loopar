-- Verificar datos específicos de la postcard problemática
SELECT 
  id,
  title,
  processing_status,
  nft_descriptors,
  error_message,
  created_at,
  updated_at
FROM postcards 
WHERE id = '47343e7a-7b1b-48ed-ad42-54739498d903';

-- También verificar todas las postcards para entender el patrón
SELECT 
  id,
  title,
  processing_status,
  nft_descriptors::text as nft_descriptors_text,
  error_message
FROM postcards 
ORDER BY created_at DESC
LIMIT 5