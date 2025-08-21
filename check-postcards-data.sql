-- Verificar datos de postcards y descriptores NFT
SELECT 
  id,
  title,
  processing_status,
  is_public,
  nft_descriptors,
  CASE 
    WHEN nft_descriptors IS NULL THEN 'NULL'
    WHEN nft_descriptors = '{}' THEN 'EMPTY_OBJECT'
    WHEN jsonb_typeof(nft_descriptors) = 'object