// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Función para descargar archivo
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
    }).on('error', reject);
  });
}

// Función para inspeccionar contenido del archivo
function inspectFileContent(buffer, filename) {
  console.log(`\n📄 Inspeccionando ${filename}:`);
  console.log(`   - Tamaño: ${buffer.length} bytes`);
  
  // Mostrar primeros 100 bytes como texto
  const textContent = buffer.toString('utf8', 0, Math.min(100, buffer.length));
  console.log(`   - Primeros 100 caracteres: "${textContent}"`);
  
  // Mostrar primeros 20 bytes como hex
  const hexContent = buffer.toString('hex', 0, Math.min(20, buffer.length));
  console.log(`   - Primeros 20 bytes (hex): ${hexContent}`);
  
  // Verificar si parece ser un archivo NFT real o simulado
  const isSimulated = textContent.includes('NFT_') || textContent.includes('FSET') || textContent.includes('ISET');
  console.log(`   - Tipo: ${isSimulated ? '🔴 SIMULADO' : '🟢 POSIBLEMENTE REAL'}`);
  
  return isSimulated;
}

async function downloadAndInspectNFT() {
  try {
    console.log('🔍 Descargando e inspeccionando archivos NFT...');
    console.log('🔗 Conectando a Supabase...');
    
    // Obtener datos de la postal
    const { data: postcard, error: postcardError } = await supabase
      .from('postcards')
      .select('*')
      .eq('id', '8e1c09ff-f545-4d32-a6f1-16ad52804451')
      .single();
    
    if (postcardError) {
      throw new Error(`Error obteniendo postal: ${postcardError.message}`);
    }
    
    if (!postcard.nft_descriptors || !postcard.nft_descriptors.files) {
      console.log('❌ No hay descriptores NFT configurados');
      return;
    }
    
    const files = postcard.nft_descriptors.files;
    
    // Crear directorio temporal
    const tempDir = path.join(__dirname, 'temp_nft_files');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    console.log('📥 Descargando archivos...');
    
    // Descargar e inspeccionar cada archivo
    const isetBuffer = await downloadFile(files.iset);
    const fsetBuffer = await downloadFile(files.fset);
    const fset3Buffer = await downloadFile(files.fset3);
    
    console.log('✅ Archivos descargados exitosamente');
    
    // Guardar archivos temporalmente
    fs.writeFileSync(path.join(tempDir, 'descriptors.iset'), isetBuffer);
    fs.writeFileSync(path.join(tempDir, 'descriptors.fset'), fsetBuffer);
    fs.writeFileSync(path.join(tempDir, 'descriptors.fset3'), fset3Buffer);
    
    // Inspeccionar contenido
    const isetSimulated = inspectFileContent(isetBuffer, 'descriptors.iset');
    const fsetSimulated = inspectFileContent(fsetBuffer, 'descriptors.fset');
    const fset3Simulated = inspectFileContent(fset3Buffer, 'descriptors.fset3');
    
    const allSimulated = isetSimulated && fsetSimulated && fset3Simulated;
    
    console.log(`\n📊 Resumen:`);
    console.log(`   - Todos los archivos son simulados: ${allSimulated ? '🔴 SÍ' : '🟢 NO'}`);
    console.log(`   - Archivos guardados en: ${tempDir}`);
    
    if (allSimulated) {
      console.log('\n⚠️  PROBLEMA IDENTIFICADO:');
      console.log('   Los archivos NFT son simulados y no contienen descriptores reales.');
      console.log('   Esto explica por qué AR.js falla con detectMarker -1.');
      console.log('   Se necesita generar archivos NFT reales usando NFT-Marker-Creator.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

downloadAndInspectNFT