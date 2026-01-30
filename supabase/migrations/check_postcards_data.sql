-- Consulta para verificar los datos de las postales
SELECT 
  id,
  title,
  processing_status,
  image_url,
  video_url,
  nft_descriptors,
  created_at
FROM postcards 
ORDER BY created_at DESC 
LIMIT 10;

-- Verificar si hay postales con status 'ready'
SELECT 
  processing_status,
  COUNT(*) as count
FROM postcards 
GROUP BY processing_status;