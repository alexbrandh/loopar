// Script para generar archivos NFT reales usando NFT-Marker-Creator
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Función para descargar imagen
function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const file = fs.createWriteStream(outputPath);
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(outputPath);
      });
      
      file.on('error', (err) => {
        fs.unlink(outputPath, () => {}); // Eliminar archivo parcial
        reject(err);
      });
    }).on('error', reject);
  });
}

// Función para subir archivo a Supabase Storage
async function uploadToSupabase(filePath, storagePath, bucket = 'postcards') {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType: 'application/octet-stream',
        upsert: true
      });
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Archivo subido: ${storagePath}`);
    return data;
  } catch (error) {
    console.error(`❌ Error subiendo ${storagePath}:`, error.message);
    throw error;
  }
}

async function generateRealNFT() {
  const postcardId = '8e1c09ff-f545-4d32-a6f1-16ad52804451';
  const tempDir = path.join(__dirname, 'temp_nft_generation');
  
  try {
    console.log('🔍 Generando archivos NFT reales...');
    
    // Crear directorio temporal
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Obtener datos de la postal
    console.log('📋 Obteniendo datos de la postal...');
    const { data: postcard, error: postcardError } = await supabase
      .from('postcards')
      .select('*')
      .eq('id', postcardId)
      .single();
    
    if (postcardError) {
      throw new Error(`Error obteniendo postal: ${postcardError.message}`);
    }
    
    console.log('✅ Postal encontrada');
    console.log(`   - User ID: ${postcard.user_id}`);
    console.log(`   - Image Path: ${postcard.image_url}`);
    
    // Generar URL firmada para la imagen
    console.log('🔗 Generando URL firmada para la imagen...');
    const { data: imageSignedUrl, error: imageUrlError } = await supabase.storage
      .from('postcard-images')
      .createSignedUrl(postcard.image_url, 3600);
    
    if (imageUrlError || !imageSignedUrl?.signedUrl) {
      throw new Error(`Error generando URL firmada: ${imageUrlError?.message || 'URL no generada'}`);
    }
    
    console.log(`   - Signed URL: ${imageSignedUrl.signedUrl}`);
    
    // Descargar imagen original
    console.log('📥 Descargando imagen original...');
    const imagePath = path.join(tempDir, 'original_image.jpg');
    await downloadImage(imageSignedUrl.signedUrl, imagePath);
    console.log('✅ Imagen descargada');
    
    // Generar descriptores NFT usando NFT-Marker-Creator CLI
    console.log('🔧 Generando descriptores NFT reales...');
    
    const outputDir = path.join(tempDir, 'nft_output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Usar el CLI de NFT-Marker-Creator
    const nftCommand = `npx @webarkit/nft-marker-creator-app "${imagePath}" "${outputDir}" descriptors`;
    console.log(`Ejecutando: ${nftCommand}`);
    
    try {
      const { stdout, stderr } = await execAsync(nftCommand, { cwd: process.cwd() });
      if (stderr) {
        console.log('Stderr:', stderr);
      }
      if (stdout) {
        console.log('Stdout:', stdout);
      }
    } catch (error) {
      console.error('Error ejecutando NFT-Marker-Creator:', error.message);
      throw error;
    }
    
    console.log('✅ Descriptores NFT generados');
    
    // Verificar que se generaron los archivos
    const isetPath = path.join(outputDir, 'descriptors.iset');
    const fsetPath = path.join(outputDir, 'descriptors.fset');
    const fset3Path = path.join(outputDir, 'descriptors.fset3');
    
    if (!fs.existsSync(isetPath) || !fs.existsSync(fsetPath) || !fs.existsSync(fset3Path)) {
      throw new Error('No se generaron todos los archivos NFT necesarios');
    }
    
    console.log('📊 Archivos generados:');
    console.log(`   - ISET: ${fs.statSync(isetPath).size} bytes`);
    console.log(`   - FSET: ${fs.statSync(fsetPath).size} bytes`);
    console.log(`   - FSET3: ${fs.statSync(fset3Path).size} bytes`);
    
    // Subir archivos a Supabase Storage
    console.log('📤 Subiendo archivos a Supabase Storage...');
    const storagePath = `${postcard.user_id}/${postcardId}/nft`;
    
    await uploadToSupabase(isetPath, `${storagePath}/descriptors.iset`);
    await uploadToSupabase(fsetPath, `${storagePath}/descriptors.fset`);
    await uploadToSupabase(fset3Path, `${storagePath}/descriptors.fset3`);
    
    // Generar nuevas URLs firmadas
    console.log('🔗 Generando nuevas URLs firmadas...');
    
    const { data: isetUrl } = await supabase.storage
      .from('postcards')
      .createSignedUrl(`${storagePath}/descriptors.iset`, 3600);
    
    const { data: fsetUrl } = await supabase.storage
      .from('postcards')
      .createSignedUrl(`${storagePath}/descriptors.fset`, 3600);
    
    const { data: fset3Url } = await supabase.storage
      .from('postcards')
      .createSignedUrl(`${storagePath}/descriptors.fset3`, 3600);
    
    const newDescriptors = {
      files: {
        iset: isetUrl?.signedUrl,
        fset: fsetUrl?.signedUrl,
        fset3: fset3Url?.signedUrl
      }
    };
    
    // Actualizar base de datos
    console.log('💾 Actualizando base de datos...');
    const { error: updateError } = await supabase
      .from('postcards')
      .update({
        nft_descriptors: newDescriptors,
        processing_status: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', postcardId);
    
    if (updateError) {
      throw new Error(`Error actualizando postal: ${updateError.message}`);
    }
    
    console.log('✅ Base de datos actualizada');
    
    // Limpiar archivos temporales
    console.log('🧹 Limpiando archivos temporales...');
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    console.log('\n🎉 ¡Archivos NFT reales generados exitosamente!');
    console.log('📋 URLs actualizadas:');
    console.log(`   - ISET: ${newDescriptors.files.iset}`);
    console.log(`   - FSET: ${newDescriptors.files.fset}`);
    console.log(`   - FSET3: ${newDescriptors.files.fset3}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    
    // Limpiar en caso de error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    process.exit(1);
  }
}

generateRealNFT();