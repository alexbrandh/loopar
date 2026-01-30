const { generateRealNFTDescriptors } = require('./src/lib/real-nft-generator.ts');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testRealNFTGeneration() {
  try {
    console.log('🚀 Testing real NFT generation...');
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Test data
    const postcardId = 'ec2d4e1b-bbd0-4f32-8578-e85b3583dc7e';
    const userId = 'user_31J9GscxynzmpAVeWeOqNddwXwS';
    const imageUrl = 'https://qllfquoqrxvfgdudnrrr.supabase.co/storage/v1/object/sign/postcard-images/user_31J9GscxynzmpAVeWeOqNddwXwS/ec2d4e1b-bbd0-4f32-8578-e85b3583dc7e/image.JPG?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lYzBlMjg4Ni01ZDYyLTRkODQtOWYwMS1lNmU5NzMyYmVlNDMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwb3N0Y2FyZC1pbWFnZXMvdXNlcl8zMUo5R3NjeHluem1wQVZlV2VPcU5kZHdYd1MvZWMyZDRlMWItYmJkMC00ZjMyLTg1NzgtZTg1YjM1ODNkYzdlL2ltYWdlLkpQRyIsImlhdCI6MTc1ODg0NzAyNiwiZXhwIjoxNzU4ODUwNjI2fQ.XqWPvQQCshasz1-ZcRpC-LqsajkY86bfLbJiQt0Ek8E';
    
    console.log('📋 Test parameters:');
    console.log('- Postcard ID:', postcardId);
    console.log('- User ID:', userId);
    console.log('- Image URL:', imageUrl.substring(0, 100) + '...');
    
    // Generate real NFT descriptors
    const result = await generateRealNFTDescriptors(
      imageUrl,
      supabase,
      postcardId,
      userId
    );
    
    console.log('✅ Real NFT descriptors generated successfully!');
    console.log('📄 Results:');
    console.log('- ISET URL:', result.isetUrl.substring(0, 100) + '...');
    console.log('- FSET URL:', result.fsetUrl.substring(0, 100) + '...');
    console.log('- FSET3 URL:', result.fset3Url.substring(0, 100) + '...');
    
    // Update postcard in database
    console.log('📝 Updating postcard with real NFT descriptors...');
    const descriptors = {
      descriptorUrl: `${userId}/${postcardId}/nft/descriptors`,
      generated: true,
      timestamp: new Date().toISOString(),
      files: {
        iset: result.isetUrl,
        fset: result.fsetUrl,
        fset3: result.fset3Url
      },
      metadata: {
        originalImageUrl: imageUrl,
        postcardId,
        userId,
        note: 'Real NFT descriptors generated from user image using @webarkit/nft-marker-creator-app'
      }
    };
    
    const { error: updateError } = await supabase
      .from('postcards')
      .update({
        nft_descriptors: descriptors,
        processing_status: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', postcardId);
    
    if (updateError) {
      console.error('❌ Error updating postcard:', updateError);
      return false;
    }
    
    console.log('✅ Postcard updated successfully with real NFT descriptors!');
    console.log('🎉 Test completed successfully!');
    
    return true;
    
  } catch (error) {
    console.error('💥 Error in test:', error);
    return false;
  }
}

// Run the test
testRealNFTGeneration()
  .then(success => {
    if (success) {
      console.log('🎊 All tests passed!');
      process.exit(0);
    } else {
      console.log('💥 Tests failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });