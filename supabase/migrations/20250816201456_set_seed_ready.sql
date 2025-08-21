-- Set seed postcard to ready with AR.js descriptors (id 550e8400-e29b-41d4-a716-446655440001)
INSERT INTO postcards (
  id, user_id, title, description, image_url, video_url,
  nft_descriptors, processing_status, is_public, created_at, updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'user_2abc123def456ghi789jkl',
  'Postal AR de Prueba',
  'Una postal de prueba para demostrar la funcionalidad de realidad aumentada',
  'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20sunset%20landscape%20with%20mountains%20and%20lake%20high%20contrast%20detailed%20texture&image_size=square_hd',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  '{
    "descriptorUrl": "https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/dataNFT/pinball",
    "generated": true,
    "timestamp": "2024-12-15T00:00:00Z",
    "files": {
      "iset": "https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/dataNFT/pinball.iset",
      "fset": "https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/dataNFT/pinball.fset",
      "fset3": "https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/dataNFT/pinball.fset3"
    }
  }',
  'ready',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  video_url = EXCLUDED.video_url,
  nft_descriptors = EXCLUDED.nft_descriptors,
  processing_status = EXCLUDED.processing_status,
  is_public = EXCLUDED.is_public,
  updated_at = NOW();
