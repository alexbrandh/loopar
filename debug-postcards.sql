-- Consultar datos de postcards para debug
SELECT 
  id, 
  title, 
  processing_status, 
  nft_descriptors,
  is_public,
  created_at
FROM postcards 
ORDER BY created_at DESC 
LIMIT 5;