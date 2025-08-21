-- Debug query to check postcard data and NFT descriptors
SELECT 
  id,
  title,
  processing_status,
  nft_descriptors,
  jsonb_pretty(nft_descriptors) as nft_descriptors_formatted,
  created_at,
  updated_at
FROM postcards 
WHERE id = '47343e7a-7b1b-48ed-ad42-54739498d903';

-- Also check all postcards to see their status
SELECT 
  id,
  title,
  processing_status,
  CASE 
    WHEN nft_descriptors IS NULL THEN 'NULL'
    WHEN nft_descriptors = '{}' THEN 'EMPTY_OBJECT'
    ELSE 'HAS_DATA'
  END as nft_descriptors_status,
  created_at
FROM postcards 
ORDER BY created_at DESC
LIMIT 10;