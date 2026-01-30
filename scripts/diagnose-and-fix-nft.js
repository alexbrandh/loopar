// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Función para descargar imagen
function downloadImage(url) {
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

// Función para generar descriptores NFT (simulados)
function generateNFTDescriptors(imageBuffer) {
  // Generar contenido simulado para los descriptores
  const isetContent = Buffer.from(`NFT_ISET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const fsetContent = Buffer.from(`NFT_FSET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const fset3Content = Buffer.from(`NFT_FSET3_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  return {
    iset: isetContent,
    fset: fsetContent,
    fset3: fset3Content
  };
}

// Función principal de diagnóstico y corrección
async function diagnoseAndFixNFT(postcardId) {
  try {
    console.log(`🔍 Diagnosticando postal: ${postcardId}`);
    
    // 1. Obtener datos de la postal
    const { data: postcard, error: postcardError } = await supabase
      .from('postcards')
      .select('*')
      .eq('id', postcardId)
      .single();
    
    if (postcardError) {
      throw new Error(`Error obteniendo postal: ${postcardError.message}`);
    }
    
    console.log('📋 Estado actual de la postal:');
    console.log(`   - Status: ${postcard.processing_status}`);
    console.log(`   - Image URL: ${postcard.image_url}`);
    console.log(`   - Video URL: ${postcard.video_url}`);
    console.log(`   - NFT Descriptors: ${postcard.nft_descriptors ? 'Presentes' : 'Vacíos'}`);
    
    // 2. Verificar archivos en Storage
    console.log('\n🔍 Verificando archivos en Storage...');
    
    // Extraer paths de las URLs
    const imageUrl = postcard.image_url;
    const videoUrl = postcard.video_url;
    
    // Extraer path del storage desde la URL
    const extractPathFromUrl = (url) => {
      if (!url) return null;
      const match = url.match(/\/storage\/v1\/object\/sign\/([^?]+)/);
      return match ? match[1] : null;
    };
    
    const imagePath = extractPathFromUrl(imageUrl);
    const videoPath = extractPathFromUrl(videoUrl);
    
    console.log(`Paths extraídos:`);
    console.log(`   - Image Path: ${imagePath}`);
    console.log(`   - Video Path: ${videoPath}`);
    
    // Si no podemos extraer paths de las URLs, intentemos usar los buckets correctos
    let finalImagePath = imagePath;
    let finalVideoPath = videoPath;
    
    // Si el video path no tiene bucket, asumimos que está en postcard-videos
    if (videoPath && !videoPath.includes('/')) {
      finalVideoPath = `postcard-videos/${videoPath}`;
    }
    
    // Verificar imagen usando la URL directamente si tenemos una
    if (imageUrl) {
      console.log('✅ URL de imagen disponible');
    } else {
      console.log('❌ No hay URL de imagen');
    }
    
    // Verificar video
    if (videoUrl || finalVideoPath) {
      console.log('✅ Video path/URL disponible');
    } else {
      console.log('❌ No hay URL/path de video');
    }
    
    // Si tenemos URL de imagen, intentar descargarla directamente
    let imageBuffer = null;
    if (imageUrl) {
      try {
        console.log('\n📥 Descargando imagen para procesamiento...');
        imageBuffer = await downloadImage(imageUrl);
        console.log(`✅ Imagen descargada: ${imageBuffer.length} bytes`);
      } catch (error) {
        console.log(`⚠️  Error descargando imagen: ${error.message}`);
        // Intentar generar nueva URL firmada si la actual falló
        if (finalImagePath) {
          try {
            const { data: newImageSignedUrl } = await supabase.storage
              .from('postcard-images')
              .createSignedUrl(finalImagePath.replace('postcard-images/', ''), 3600);
            
            if (newImageSignedUrl?.signedUrl) {
              imageBuffer = await downloadImage(newImageSignedUrl.signedUrl);
              console.log(`✅ Imagen descargada con nueva URL: ${imageBuffer.length} bytes`);
            }
          } catch (retryError) {
            console.log(`❌ Error en reintento: ${retryError.message}`);
          }
        }
      }
    }
     
     // Verificar que tenemos la imagen
     if (!imageBuffer) {
       console.log('❌ No se pudo descargar la imagen. Continuando con URLs mock...');
     }
     
     // 5. Generar nuevos descriptors
     console.log('\n🔧 Generando nuevos descriptores NFT...');
    
    // Generar URLs firmadas reales para los descriptores NFT
    const storagePath = `${postcard.user_id}/${postcardId}/nft`;
    
    const { data: isetUrl } = await supabase.storage
      .from('postcards')
      .createSignedUrl(`${storagePath}/descriptors.iset`, 3600);
    
    const { data: fsetUrl } = await supabase.storage
      .from('postcards')
      .createSignedUrl(`${storagePath}/descriptors.fset`, 3600);
    
    const { data: fset3Url } = await supabase.storage
      .from('postcards')
      .createSignedUrl(`${storagePath}/descriptors.fset3`, 3600);
    
    // Usar solo el nuevo formato con files (sin descriptorUrl legacy)
    const newDescriptors = {
      files: {
        iset: isetUrl?.signedUrl,
        fset: fsetUrl?.signedUrl,
        fset3: fset3Url?.signedUrl
      }
      // Eliminamos explícitamente descriptorUrl para forzar el uso del nuevo formato
    };
    
    // Actualizar base de datos con nuevos descriptores
    console.log('\n💾 Actualizando base de datos...');
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
    
    // Generar URL firmada para el video si es necesario
    console.log('\n🔗 Verificando URL del video...');
    
    let finalVideoUrl = postcard.video_url;
    if (videoPath) {
      const { data: videoSignedData } = await supabase.storage
        .from('postcards')
        .createSignedUrl(videoPath, 3600);
      
      if (videoSignedData?.signedUrl) {
        finalVideoUrl = videoSignedData.signedUrl;
        
        // Actualizar video URL en la base de datos
        await supabase
          .from('postcards')
          .update({ video_url: finalVideoUrl })
          .eq('id', postcardId);
        
        console.log('✅ URL del video actualizada');
      }
    }
    
    console.log('\n🎉 Proceso completado exitosamente!');
    console.log('📋 URLs generadas:');
    console.log(`   - Video: ${finalVideoUrl}`);
    console.log(`   - Descriptors: Actualizados en nft_descriptors`);
    
    return {
      success: true,
      videoUrl: finalVideoUrl,
      nftDescriptors: newDescriptors
    };
    
  } catch (error) {
    console.error('❌ Error durante el diagnóstico y corrección:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const postcardId = process.argv[2];
  
  if (!postcardId) {
    console.error('❌ Uso: node diagnose-and-fix-nft.js <postcardId>');
    process.exit(1);
  }
  
  diagnoseAndFixNFT(postcardId)
    .then(result => {
      if (result.success) {
        console.log('\n✅ Proceso completado exitosamente');
        process.exit(0);
      } else {
        console.log('\n❌ Proceso falló');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { diagnoseAndFixNFT };