const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanLegacyDescriptors(postcardId) {
  console.log(`🧹 Limpiando descriptores legacy para postal: ${postcardId}`);
  
  // Obtener la postal actual
  const { data: postcard, error: fetchError } = await supabase
    .from('postcards')
    .select('*')
    .eq('id', postcardId)
    .single();
    
  if (fetchError) {
    console.error('❌ Error obteniendo postal:', fetchError);
    return { success: false, error: fetchError };
  }
  
  console.log('📋 Descriptores actuales:', JSON.stringify(postcard.nft_descriptors, null, 2));
  
  // Si tiene el formato legacy, limpiarlo
  if (postcard.nft_descriptors && postcard.nft_descriptors.descriptorUrl) {
    console.log('🔧 Eliminando campo descriptorUrl legacy...');
    
    // Crear nuevo objeto sin descriptorUrl
    const cleanDescriptors = {
      files: postcard.nft_descriptors.files
    };
    
    // Actualizar base de datos
    const { error: updateError } = await supabase
      .from('postcards')
      .update({
        nft_descriptors: cleanDescriptors,
        updated_at: new Date().toISOString()
      })
      .eq('id', postcardId);
      
    if (updateError) {
      console.error('❌ Error actualizando postal:', updateError);
      return { success: false, error: updateError };
    }
    
    console.log('✅ Campo descriptorUrl eliminado exitosamente');
    console.log('📋 Nuevos descriptores:', JSON.stringify(cleanDescriptors, null, 2));
  } else {
    console.log('✅ No se encontró campo descriptorUrl legacy');
  }
  
  return { success: true };
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const postcardId = process.argv[2];
  if (!postcardId) {
    console.error('❌ Uso: node clean-legacy-descriptors.js <postcardId>');
    process.exit(1);
  }
  
  cleanLegacyDescriptors(postcardId)
    .then(result => {
      if (result.success) {
        console.log('🎉 Limpieza completada exitosamente');
        process.exit(0);
      } else {
        console.error('❌ Error en la limpieza:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error inesperado:', error);
      process.exit(1);
    });
}

module.exports = { cleanLegacyDescriptors };