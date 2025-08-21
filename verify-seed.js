// Verify seed postcard status and nft_descriptors using Service Role
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function readEnv() {
  const envPath = path.join(__dirname, '.env.local');
  const vars = {};
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    vars[key] = value;
  }
  return vars;
}

(async () => {
  try {
    const env = readEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const id = '550e8400-e29b-41d4-a716-446655440001';
    const { data, error } = await supabase
      .from('postcards')
      .select('id, processing_status, nft_descriptors')
      .eq('id', id)
      .single();
    if (error) {
      console.error('DB fetch error:', error.message);
      process.exit(1);
    }
    const files = data?.nft_descriptors?.files || {};
    console.log(JSON.stringify({ id: data.id, status: data.processing_status, files }, null, 2));
  } catch (e) {
    console.error('Verify script error:', e.message);
    process.exit(1);
  }
})();
