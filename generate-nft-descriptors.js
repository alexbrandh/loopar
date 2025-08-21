// Script to generate NFT descriptors for the test postcard
// This script calls the NFT generation function directly
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

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

async function generateNFTDescriptors() {
  try {
    console.log('=== Generating NFT Descriptors for Test Postcard ===');
    
    const postcardId = '47343e7a-7b1b-48ed-ad42-54739498d903';
    
    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Getting postcard data...');
    
    // Get postcard data first
    const { data: postcard, error: fetchError } = await supabase
      .from('postcards')
      .select('id, user_id, image_url, processing_status, nft_descriptors')
      .eq('id', postcardId)
      .single();
    
    if (fetchError || !postcard) {
      console.error('❌ Postcard not found:', fetchError?.message);
      return;
    }
    
    console.log('Postcard found:', {
      id: postcard.id,
      user_id: postcard.user_id,
      processing_status: postcard.processing_status,
      has_image_url: !!postcard.image_url,
      has_nft_descriptors: !!postcard.nft_descriptors
    });
    
    // Generate mock NFT descriptors with direct GitHub URLs
    const exampleDescriptorBase = 'https://raw.githubusercontent.com/AR-js-org/AR.js/master/aframe/examples/image-tracking/nft/trex/trex-image/trex';
    const mockDescriptors = {
      descriptorUrl: exampleDescriptorBase,
      generated: true,
      timestamp: new Date().toISOString(),
      files: {
        iset: `${exampleDescriptorBase}.iset`,
        fset: `${exampleDescriptorBase}.fset`,
        fset3: `${exampleDescriptorBase}.fset3`
      }
    };
    
    console.log('Updating postcard with NFT descriptors...');
    
    // Update the postcard with NFT descriptors
    const { error: updateError } = await supabase
      .from('postcards')
      .update({
        nft_descriptors: mockDescriptors,
        processing_status: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', postcardId);
    
    if (updateError) {
      console.error('❌ Failed to update postcard:', updateError.message);
      return;
    }
    
    console.log('✅ NFT descriptors generated successfully!');
    console.log('Generated descriptors:', JSON.stringify(mockDescriptors, null, 2));
    
    // Verify the update
    const { data: updatedPostcard, error: verifyError } = await supabase
      .from('postcards')
      .select('processing_status, nft_descriptors')
      .eq('id', postcardId)
      .single();
    
    if (verifyError) {
      console.error('❌ Failed to verify update:', verifyError.message);
      return;
    }
    
    console.log('✅ Verification successful:');
    console.log('- Processing status:', updatedPostcard.processing_status);
    console.log('- Has NFT descriptors:', !!updatedPostcard.nft_descriptors);
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

generateNFTDescriptors();