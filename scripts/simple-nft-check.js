// Script simple para verificar archivos NFT
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Iniciando verificación simple de NFT...');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📋 Variables de entorno:');
console.log(`   - URL: ${supabaseUrl ? '✅ Configurada' : '❌ Faltante'}`);
console.log(`   - Service Key: ${supabaseServiceKey ? '✅ Configurada' : '❌ Faltante'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function simpleCheck() {
  try {
    console.log('\n🔗 Conectando a Supabase...');
    
    // Obtener datos de la postal
    console.log('📋 Obteniendo datos de la postal...');
    const { data: postcard, error: postcardError } = await supabase
      .from('postcards')
      .select('*')
      .eq('id', '8e1c09ff-f545-4d32-a6f1-16ad52804451')
      .single();
    
    if (postcardError) {
      console.error('❌ Error obteniendo postal:', postcardError.message);
      return;
    }
    
    console.log('✅ Postal encontrada');
    console.log(`   - Status: ${postcard.processing_status}`);
    console.log(`   - User ID: ${postcard.user_id}`);
    
    if (!postcard.nft_descriptors) {
      console.log('❌ No hay descriptores NFT');
      return;
    }
    
    console.log('✅ Descriptores NFT encontrados');
    console.log('   - Estructura:', JSON.stringify(postcard.nft_descriptors, null, 2));
    
    if (postcard.nft_descriptors.files) {
      console.log('\n🔗 URLs de archivos:');
      console.log(`   - ISET: ${postcard.nft_descriptors.files.iset ? '✅' : '❌'}`);
      console.log(`   - FSET: ${postcard.nft_descriptors.files.fset ? '✅' : '❌'}`);
      console.log(`   - FSET3: ${postcard.nft_descriptors.files.fset3 ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

simpleCheck().then(() => {
  console.log('\n✅ Verificación completada');
}).catch(error => {
  console.error('❌ Error fatal:', error);
});