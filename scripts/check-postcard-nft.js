const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPostcardNFT() {
  // Usage: node scripts/check-postcard-nft.js [postcard_id]
  // If no ID provided, defaults to the problematic postcard from logs
  const postcardId = process.argv[2] || '8e1c09ff-f545-4d32-a6f1-16ad52804451';
  console.log(`🔍 Checking postcard: ${postcardId}`);
  console.log('='.repeat(50));
  
  // Consultar la postal
  const { data: postcard, error } = await supabase
    .from('postcards')
    .select('*')
    .eq('id', postcardId)
    .single();
    
  if (error) {
    console.error('❌ Error al consultar postal:', error);
    return;
  }
  
  if (!postcard) {
    console.log('❌ Postal no encontrada');
    return;
  }
  
  console.log('📋 Estado de la postal:');
  console.log('- ID:', postcard.id);
  console.log('- Título:', postcard.title);
  console.log('- Estado:', postcard.processing_status);
  console.log('- Imagen URL:', postcard.image_url);
  console.log('- Video URL:', postcard.video_url);
  console.log('- Error:', postcard.error_message);
  
  console.log('\n🎯 Descriptores NFT:');
  if (postcard.nft_descriptors) {
    console.log('- Estructura:', JSON.stringify(postcard.nft_descriptors, null, 2));
    
    if (postcard.nft_descriptors.files) {
      console.log('\n📁 Archivos NFT:');
      console.log('- iset:', postcard.nft_descriptors.files.iset || 'VACÍO');
      console.log('- fset:', postcard.nft_descriptors.files.fset || 'VACÍO');
      console.log('- fset3:', postcard.nft_descriptors.files.fset3 || 'VACÍO');
      
      // Verificar si las URLs están vacías
      const isEmpty = !postcard.nft_descriptors.files.iset || 
                     !postcard.nft_descriptors.files.fset || 
                     !postcard.nft_descriptors.files.fset3;
      
      if (isEmpty) {
        console.log('\n⚠️  PROBLEMA: Los descriptores NFT están vacíos');
      } else {
        console.log('\n✅ Los descriptores NFT tienen URLs');
      }
    } else {
      console.log('\n❌ No hay archivos NFT definidos');
    }
  } else {
    console.log('\n❌ No hay descriptores NFT');
  }
  
  // Verificar archivos en Storage
  console.log('\n🗄️  Verificando archivos en Storage...');
  // Use the same path structure as the regeneration script
  const descriptorBasePath = `${postcard.user_id}/${postcard.id}/nft/descriptors`;
  
  const files = [`${descriptorBasePath}.iset`, `${descriptorBasePath}.fset`, `${descriptorBasePath}.fset3`];
  
  for (const file of files) {
    const { data, error } = await supabase.storage
      .from('postcards')
      .download(file);
      
    const fileName = file.split('/').pop(); // Get just the filename for display
    if (error) {
      console.log(`❌ ${fileName}: No existe o error -`, error.message);
    } else {
      const size = data.size;
      console.log(`📄 ${fileName}: Existe (${size} bytes)`);
      
      if (size === 0) {
        console.log(`⚠️  ${fileName}: Archivo vacío!`);
      }
    }
  }
}

checkPostcardNFT().catch(console.error);