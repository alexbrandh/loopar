const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testNFTDescriptors() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { data, error } = await supabase
    .from('postcards')
    .select('nft_descriptors')
    .eq('id', '9767a794-7466-4af1-b89b-a75e1ea37288')
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  const descriptors = data.nft_descriptors;
  if (descriptors && descriptors.files) {
    console.log('Probando acceso a descriptores NFT:');
    
    // Probar cada archivo
    for (const [type, url] of Object.entries(descriptors.files)) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        console.log(`${type}: ${response.status} - ${response.ok ? 'OK' : 'ERROR'}`);
        if (!response.ok) {
          console.log(`  Error details: ${response.statusText}`);
        }
      } catch (err) {
        console.log(`${type}: ERROR - ${err.message}`);
      }
    }
    
    // Mostrar URL base que usaría AR.js
    if (descriptors.descriptorUrl) {
      const baseUrl = descriptors.descriptorUrl.replace(/\.(fset|iset|fset3).*$/, '');
      console.log('URL base para AR.js:', baseUrl);
      
      // Probar si AR.js puede acceder a los archivos individuales
      const extensions = ['iset', 'fset', 'fset3'];
      for (const ext of extensions) {
        try {
          const testUrl = baseUrl + '.' + ext;
          const response = await fetch(testUrl, { method: 'HEAD' });
          console.log(`AR.js ${ext}: ${response.status} - ${response.ok ? 'OK' : 'ERROR'}`);
        } catch (err) {
          console.log(`AR.js ${ext}: ERROR - ${err.message}`);
        }
      }
    }
  } else {
    console.log('No se encontraron descriptores NFT válidos');
  }
}

testNFTDescriptors();