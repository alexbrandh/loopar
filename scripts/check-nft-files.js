// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Función para hacer HEAD request y verificar si el archivo existe
function checkFileExists(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.request(url, { method: 'HEAD' }, (res) => {
      resolve({
        exists: res.statusCode === 200,
        statusCode: res.statusCode,
        contentLength: res.headers['content-length'] || 0
      });
    });
    
    req.on('error', (error) => {
      resolve({
        exists: false,
        error: error.message
      });
    });
    
    req.end();
  });
}

async function checkNFTFiles() {
  try {
    console.log('🔍 Verificando archivos NFT para postal 8e1c09ff-f545-4d32-a6f1-16ad52804451...');
    
    // Obtener datos de la postal
    const { data: postcard, error: postcardError } = await supabase
      .from('postcards')
      .select('*')
      .eq('id', '8e1c09ff-f545-4d32-a6f1-16ad52804451')
      .single();
    
    if (postcardError) {
      throw new Error(`Error obteniendo postal: ${postcardError.message}`);
    }
    
    console.log('📋 Estado de la postal:');
    console.log(`   - Status: ${postcard.processing_status}`);
    console.log(`   - User ID: ${postcard.user_id}`);
    console.log(`   - NFT Descriptors:`, postcard.nft_descriptors);
    
    if (!postcard.nft_descriptors || !postcard.nft_descriptors.files) {
      console.log('❌ No hay descriptores NFT configurados');
      return;
    }
    
    const files = postcard.nft_descriptors.files;
    
    console.log('\n🔗 URLs de archivos NFT:');
    console.log(`   - ISET: ${files.iset}`);
    console.log(`   - FSET: ${files.fset}`);
    console.log(`   - FSET3: ${files.fset3}`);
    
    console.log('\n📡 Verificando existencia de archivos...');
    
    // Verificar cada archivo
    const isetCheck = await checkFileExists(files.iset);
    const fsetCheck = await checkFileExists(files.fset);
    const fset3Check = await checkFileExists(files.fset3);
    
    console.log('\n📊 Resultados:');
    console.log(`   - ISET: ${isetCheck.exists ? '✅' : '❌'} (${isetCheck.statusCode}) ${isetCheck.contentLength ? isetCheck.contentLength + ' bytes' : ''}`);
    console.log(`   - FSET: ${fsetCheck.exists ? '✅' : '❌'} (${fsetCheck.statusCode}) ${fsetCheck.contentLength ? fsetCheck.contentLength + ' bytes' : ''}`);
    console.log(`   - FSET3: ${fset3Check.exists ? '✅' : '❌'} (${fset3Check.statusCode}) ${fset3Check.contentLength ? fset3Check.contentLength + ' bytes' : ''}`);
    
    if (isetCheck.error) console.log(`   - ISET Error: ${isetCheck.error}`);
    if (fsetCheck.error) console.log(`   - FSET Error: ${fsetCheck.error}`);
    if (fset3Check.error) console.log(`   - FSET3 Error: ${fset3Check.error}`);
    
    const allExist = isetCheck.exists && fsetCheck.exists && fset3Check.exists;
    
    console.log(`\n${allExist ? '✅' : '❌'} Estado general: ${allExist ? 'Todos los archivos NFT existen' : 'Faltan archivos NFT'}`);
    
    if (!allExist) {
      console.log('\n🔧 Los archivos NFT no existen físicamente. Necesitan ser generados.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkNFTFiles();