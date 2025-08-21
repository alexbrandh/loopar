// Debug script to check postcard data from database
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables from .env.local
let supabaseUrl, supabaseServiceKey;
try {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.split('=')[1].trim();
    }
  });
} catch (err) {
  console.error('Error reading .env.local:', err.message);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugPostcardData() {
  try {
    console.log('=== DEBUG: Checking postcard data in database ===');
    
    // Get specific postcard
    const { data: postcard, error } = await supabase
      .from('postcards')
      .select('*')
      .eq('id', '47343e7a-7b1b-48ed-ad42-54739498d903')
      .single();
    
    if (error) {
      console.error('Error fetching postcard:', error);
      return;
    }
    
    console.log('\n=== POSTCARD DATA ===');
    console.log('ID:', postcard.id);
    console.log('Title:', postcard.title);
    console.log('Processing Status:', postcard.processing_status);
    console.log('NFT Descriptors:', JSON.stringify(postcard.nft_descriptors, null, 2));
    console.log('Created At:', postcard.created_at);
    console.log('Updated At:', postcard.updated_at);
    
    // Check all postcards status
    console.log('\n=== ALL POSTCARDS STATUS ===');
    const { data: allPostcards, error: allError } = await supabase
      .from('postcards')
      .select('id, title, processing_status, nft_descriptors')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allError) {
      console.error('Error fetching all postcards:', allError);
      return;
    }
    
    allPostcards.forEach(p => {
      const nftStatus = !p.nft_descriptors ? 'NULL' : 
                       Object.keys(p.nft_descriptors).length === 0 ? 'EMPTY' : 'HAS_DATA';
      console.log(`${p.id.substring(0, 8)}... | ${p.processing_status} | NFT: ${nftStatus}`);
    });
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

debugPostcardData();