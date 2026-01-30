-- Insert test postcard data for production testing
-- This will create the specific postcard that's causing the 404 error

INSERT INTO postcards (
  id,
  user_id,
  title,
  description,
  image_url,
  video_url,
  processing_status,
  is_public,
  created_at,
  updated_at
) VALUES (
  '99c543c3-4628-4859-9b1e-bdaa5365a6c4',
  'user_test_production',
  'Test AR Postcard - Production',
  'Esta es una postal de prueba para verificar el funcionamiento en producción',
  'https://example.com/test-image.jpg',
  'https://example.com/test-video.mp4',
  'ready',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  processing_status = EXCLUDED.processing_status,
  updated_at = NOW();

-- Also insert a few more test postcards for general testing
INSERT INTO postcards (
  id,
  user_id,
  title,
  description,
  image_url,
  video_url,
  processing_status,
  is_public,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  'user_test_production',
  'Test AR Postcard 2',
  'Segunda postal de prueba',
  'https://example.com/test-image-2.jpg',
  'https://example.com/test-video-2.mp4',
  'ready',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'user_test_production',
  'Test AR Postcard 3',
  'Tercera postal de prueba',
  'https://example.com/test-image-3.jpg',
  'https://example.com/test-video-3.mp4',
  'processing',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;