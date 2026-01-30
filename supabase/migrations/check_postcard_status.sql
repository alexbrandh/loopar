-- Verificar el estado actual de las postales
SELECT 
  id,
  title,
  processing_status,
  nft_descriptors,
  image_url,
  video_url,
  error_message,
  created_at,
  updated_at
FROM postcards 
ORDER BY created_at DESC;

-- Actualizar postales que tienen imagen y video pero están en processing a ready
-- Solo si no tienen descriptores NFT aún
UPDATE postcards 
SET 
  processing_status = 'ready',
  updated_at = now()
WHERE 
  processing_status = 'processing' 
  AND image_url IS NOT NULL 
  AND video_url IS NOT NULL
  AND (nft_descriptors IS NULL OR nft_descriptors = '{}');

-- Verificar el estado después de la actualización
SELECT 
  id,
  title,
  processing_status,
  nft_descriptors,
  image_url,
  video_url,
  error_message,
  created_at,
  updated_at
FROM postcards 
ORDER BY created_at DESC;