const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables from .env.local
let supabaseUrl, supabaseServiceKey;
try {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.split('=')[1].trim();
    }
  }
} catch (error) {
  console.error('Error reading .env.local:', error.message);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixNFTDescriptors() {
  console.log('=== FIXING NFT DESCRIPTORS ===');
  
  const postcardId = '47343e7a-7b1b-48ed-ad42-54739498d903';
  
  try {
    // First, get the postcard data
    const { data: postcard, error: fetchError } = await supabase
      .from('postcards')
      .select('*')
      .eq('id', postcardId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching postcard:', fetchError);
      return;
    }
    
    console.log('Current postcard data:', {
      id: postcard.id,
      user_id: postcard.user_id,
      processing_status: postcard.processing_status,
      nft_descriptors: postcard.nft_descriptors
    });
    
    // Check if NFT files exist in storage
    const basePath = `postcards/${postcard.user_id}/${postcardId}/nft/target`;
    console.log('\nChecking NFT files in storage at:', basePath);
    
    const nftFiles = ['iset', 'fset', 'fset3'];
    const fileChecks = {};
    
    for (const ext of nftFiles) {
      const filePath = `${basePath}.${ext}`;
      const { data, error } = await supabase.storage
        .from('postcards')
        .list('', { search: filePath });
      
      fileChecks[ext] = {
        path: filePath,
        exists: !error && data && data.length > 0
      };
      
      console.log(`${ext.toUpperCase()} file:`, fileChecks[ext].exists ? '✓ EXISTS' : '✗ NOT FOUND');
    }
    
    // Generate signed URLs for existing files
    const signedUrls = {};
    let allFilesExist = true;
    
    for (const ext of nftFiles) {
      if (fileChecks[ext].exists) {
        const { data: signedUrl, error: signError } = await supabase.storage
          .from('postcards')
          .createSignedUrl(`${basePath}.${ext}`, 3600); // 1 hour expiry
        
        if (!signError && signedUrl) {
          signedUrls[ext] = signedUrl.signedUrl;
          console.log(`Generated signed URL for ${ext.toUpperCase()}`);
        } else {
          console.error(`Error generating signed URL for ${ext}:`, signError);
          allFilesExist = false;
        }
      } else {
        allFilesExist = false;
      }
    }
    
    if (!allFilesExist) {
      console.log('\n❌ Not all NFT files exist. Need to regenerate NFT descriptors.');
      
      // Update status to processing to trigger regeneration
      const { error: updateError } = await supabase
        .from('postcards')
        .update({
          processing_status: 'processing',
          nft_descriptors: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', postcardId);
      
      if (updateError) {
        console.error('Error updating postcard status:', updateError);
      } else {
        console.log('✓ Updated postcard status to processing for regeneration');
      }
      
      return;
    }
    
    // All files exist, update with correct URLs
    const correctDescriptors = {
      files: {
        fset: signedUrls.fset,
        iset: signedUrls.iset,
        fset3: signedUrls.fset3
      },
      generated: true,
      timestamp: new Date().toISOString(),
      descriptorUrl: basePath // Base path without extension
    };
    
    console.log('\n=== UPDATING NFT DESCRIPTORS ===');
    console.log('New descriptors:', JSON.stringify(correctDescriptors, null, 2));
    
    const { error: updateError } = await supabase
      .from('postcards')
      .update({
        nft_descriptors: correctDescriptors,
        updated_at: new Date().toISOString()
      })
      .eq('id', postcardId);
    
    if (updateError) {
      console.error('Error updating NFT descriptors:', updateError);
    } else {
      console.log('✅ Successfully updated NFT descriptors with real file URLs!');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixNFTDescriptors();