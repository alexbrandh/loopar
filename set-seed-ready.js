// Update seed postcard to 'ready' with AR.js descriptors using Service Role
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables from .env.local (do not log secrets)
function readEnv() {
  const envPath = path.join(__dirname, '.env.local');
  const vars = {};
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split(/\r?\n/)) {
      if (!line || line.trim().startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      vars[key] = value;
    }
  } catch (err) {
    console.error('Failed to read .env.local:', err.message);
    process.exit(1);
  }
  return vars;
}

async function main() {
  const env = readEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const postcardId = '550e8400-e29b-41d4-a716-446655440001';
  const descriptors = {
    descriptorUrl: 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/dataNFT/pinball',
    generated: true,
    timestamp: '2024-12-15T00:00:00Z',
    files: {
      iset: 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/dataNFT/pinball.iset',
      fset: 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/dataNFT/pinball.fset',
      fset3: 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/dataNFT/pinball.fset3',
    },
  };

  try {
    console.log('Upserting postcard to ready with NFT descriptors...');
    const payload = {
      id: postcardId,
      user_id: 'user_2abc123def456ghi789jkl',
      title: 'Postal AR de Prueba',
      description: 'Una postal de prueba para demostrar la funcionalidad de realidad aumentada',
      image_url: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20sunset%20landscape%20with%20mountains%20and%20lake%20high%20contrast%20detailed%20texture&image_size=square_hd',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      processing_status: 'ready',
      nft_descriptors: descriptors,
      is_public: true,
      updated_at: new Date().toISOString(),
    };
    const { data: upsertData, error } = await supabase
      .from('postcards')
      .upsert(payload, { onConflict: 'id' })
      .select('id, processing_status, nft_descriptors');

    if (error) {
      console.error('Update failed:', error.message);
      process.exit(1);
    }
    if (upsertData && Array.isArray(upsertData) && upsertData[0]) {
      const u = upsertData[0];
      console.log('Upsert response:', {
        id: u.id,
        status: u.processing_status,
        hasDescriptors: !!(u.nft_descriptors && u.nft_descriptors.files)
      });
    } else {
      console.log('Upsert completed without return data (possibly existing row). Proceeding to fetch...');
    }

    // Fetch to confirm
    const { data, error: fetchError } = await supabase
      .from('postcards')
      .select('id, processing_status, nft_descriptors')
      .eq('id', postcardId)
      .single();

    if (fetchError) {
      console.error('Fetch after update failed:', fetchError.message);
      process.exit(1);
    }

    const hasDesc = !!(data && data.nft_descriptors && data.nft_descriptors.files);
    console.log('Post-upsert:', { id: data.id, status: data.processing_status, hasDescriptors: hasDesc });
    process.exit(0);
  } catch (e) {
    console.error('Script error:', e.message);
    process.exit(1);
  }
}

main();
