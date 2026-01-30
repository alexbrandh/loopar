-- Crear postales de prueba con estado 'ready' para testing
-- Estas postales tendrán todos los campos necesarios para mostrar correctamente

INSERT INTO postcards (
  id,
  user_id,
  title,
  description,
  image_url,
  video_url,
  nft_descriptors,
  processing_status,
  is_public,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  'user_31J9GscxynzmpAVeWeOqNddwXwS',
  'Postal de Prueba Lista',
  'Esta es una postal de prueba que está lista para AR',
  '/images/test-postcard-1.jpg',
  '/videos/test-postcard-1.mp4',
  '{"base_path": "test-descriptors-path", "iset": "test.iset", "fset": "test.fset", "fset3": "test.fset3"}',
  'ready',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'user_31J9GscxynzmpAVeWeOqNddwXwS',
  'Segunda Postal Lista',
  'Otra postal de prueba lista para realidad aumentada',
  '/images/test-postcard-2.jpg',
  '/videos/test-postcard-2.mp4',
  '{"base_path": "test-descriptors-path-2", "iset": "test2.iset", "fset": "test2.fset", "fset3": "test2.fset3"}',
  'ready',
  true,
  NOW(),
  NOW()
);

-- Verificar las postales creadas
SELECT id, title, processing_status, image_url, video_url, nft_descriptors 
FROM postcards 
WHERE user_id = 'user_31J9GscxynzmpAVeWeOqNddwXwS'
ORDER BY created_at DESC;