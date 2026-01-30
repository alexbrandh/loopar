const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function getPostcardInfo() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const postcardId = '8e1c09ff-f545-4d32-a6f1-16ad52804451';
  
  console.log('🔍 Getting postcard info for:', postcardId);
  
  const { data: postcard, error } = await supabase
    .from('postcards')
    .select('id, user_id, image_url, video_url, nft_descriptors, processing_status, error_message')
    .eq('id', postcardId)
    .single();
    
  if (error) {
    console.error('❌ Error getting postcard:', error);
    return;
  }
  
  if (!postcard) {
    console.log('❌ Postcard not found');
    return;
  }
  
  console.log('✅ Postcard found:');
  console.log('  ID:', postcard.id);
  console.log('  User ID:', postcard.user_id);
  console.log('  Image URL:', postcard.image_url);
  console.log('  Video URL:', postcard.video_url);
  console.log('  Processing Status:', postcard.processing_status);
  console.log('  Error Message:', postcard.error_message);
  console.log('  NFT Descriptors:', JSON.stringify(postcard.nft_descriptors, null, 2));
}

getPostcardInfo().catch(console.error);