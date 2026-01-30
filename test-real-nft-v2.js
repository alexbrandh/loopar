const { generateAndUpdateNFTDescriptorsV2 } = require('./src/lib/real-nft-generator-v2.ts');
const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

async function testRealNFTGenerationV2() {
  try {
    console.log('🧪 Testing Real NFT Generation V2...');
    
    // Crear cliente Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Obtener una postal existente para probar
    const { data: postcards, error: fetchError } = await supabase
      .from('postcards')
      .select('*')
      .eq('processing_status', 'ready')
      .limit(1);
    
    if (fetchError || !postcards || postcards.length === 0) {
      console.error('❌ No postcards found for testing:', fetchError);
      return;
    }
    
    const postcard = postcards[0];
    console.log('📮 Testing with postcard:', postcard.id);
    
    // Obtener URL firmada de la imagen
    const { data: signedData, error: signError } = await supabase.storage
      .from('postcard-images')
      .createSignedUrl(`${postcard.user_id}/${postcard.id}/image.JPG`, 3600);
    
    if (signError || !signedData?.signedUrl) {
      console.error('❌ Error getting signed URL:', signError);
      return;
    }
    
    console.log('🖼️ Image URL:', signedData.signedUrl);
    
    // Generar descriptores NFT reales V2
    const result = await generateAndUpdateNFTDescriptorsV2(
      postcard.id,
      postcard.user_id,
      signedData.signedUrl
    );
    
    console.log('✅ Real NFT Generation V2 Test Completed!');
    console.log('📊 Results:', {
      isetUrl: result.isetUrl,
      fsetUrl: result.fsetUrl,
      fset3Url: result.fset3Url
    });
    
    // Verificar que la postal se actualizó
    const { data: updatedPostcard, error: checkError } = await supabase
      .from('postcards')
      .select('*')
      .eq('id', postcard.id)
      .single();
    
    if (checkError) {
      console.error('❌ Error checking updated postcard:', checkError);
      return;
    }
    
    console.log('📮 Updated postcard status:', updatedPostcard.processing_status);
    console.log('🎯 NFT descriptors available:', !!updatedPostcard.nft_descriptors);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Ejecutar test
testRealNFTGenerationV2();