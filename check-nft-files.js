const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkNFTFiles() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const postcardId = '8e1c09ff-f545-4d32-a6f1-16ad52804451';
  const userId = 'user_31J9GscxynzmpAVeWeOqNddwXwS';
  
  console.log('Checking NFT files for:', { postcardId, userId });
  
  // Check what files exist in the nft directory
  const nftPath = `${userId}/${postcardId}/nft`;
  console.log('\nListing files in path:', nftPath);
  
  const { data: files, error } = await supabase.storage
    .from('postcards')
    .list(nftPath, {
      limit: 100,
      offset: 0
    });
    
  if (error) {
    console.error('Error listing files:', error);
    return;
  }
  
  console.log('Files found:', files);
  
  // Try to get signed URLs for the expected descriptor files
  const descriptorFiles = ['descriptors.iset', 'descriptors.fset', 'descriptors.fset3'];
  
  for (const filename of descriptorFiles) {
    const filePath = `${userId}/${postcardId}/nft/${filename}`;
    console.log(`\nTesting file: ${filePath}`);
    
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('postcards')
      .createSignedUrl(filePath, 60);
      
    if (urlError) {
      console.error(`❌ Error creating signed URL for ${filename}:`, urlError);
    } else {
      console.log(`✅ Signed URL created for ${filename}:`, signedUrl.signedUrl);
      
      // Test if the file actually exists by making a HEAD request
      try {
        const response = await fetch(signedUrl.signedUrl, { method: 'HEAD' });
        console.log(`   Status: ${response.status} ${response.statusText}`);
        if (response.ok) {
          const contentLength = response.headers.get('content-length');
          console.log(`   Size: ${contentLength} bytes`);
        }
      } catch (fetchError) {
        console.error(`   Fetch error:`, fetchError.message);
      }
    }
  }
}

checkNFTFiles().catch(console.error);