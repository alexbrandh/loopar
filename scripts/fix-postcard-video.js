require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPostcardVideo(postcardId) {
  console.log('🔧 Corrigiendo video de postal:', postcardId);
  console.log('='.repeat(60));
  
  try {
    // 1. Obtener información actual de la postal
    const { data: postcard, error: postcardError } = await supabase
      .from('postcards')
      .select('*')
      .eq('id', postcardId)
      .single();
    
    if (postcardError || !postcard) {
      console.error('❌ Error obteniendo postal:', postcardError?.message);
      return false;
    }
    
    console.log('📋 Estado actual:');
    console.log('   - ID:', postcard.id);
    console.log('   - Usuario:', postcard.user_id);
    console.log('   - Estado:', postcard.processing_status);
    console.log('   - Video URL:', postcard.video_url || 'VACÍO');
    
    // 2. Construir la ruta esperada del video
    const expectedVideoPath = `${postcard.user_id}/${postcard.id}/video.mp4`;
    console.log('\n🎯 Ruta esperada del video:', expectedVideoPath);
    
    // 3. Verificar si el archivo existe en Storage
    const { data: files, error: listError } = await supabase.storage
      .from('postcard-videos')
      .list(`${postcard.user_id}/${postcard.id}`, {
        limit: 10,
        offset: 0
      });
    
    if (listError) {
      console.error('❌ Error listando archivos:', listError.message);
      return false;
    }
    
    console.log('\n📁 Archivos encontrados en Storage:');
    if (files && files.length > 0) {
      files.forEach(file => {
        console.log(`   - ${file.name} (${file.metadata?.size || 'tamaño desconocido'} bytes)`);
      });
    } else {
      console.log('   - No se encontraron archivos');
    }
    
    // 4. Buscar archivo de video
    const videoFile = files?.find(file => 
      file.name.toLowerCase().includes('video') || 
      file.name.toLowerCase().endsWith('.mp4') ||
      file.name.toLowerCase().endsWith('.mov') ||
      file.name.toLowerCase().endsWith('.avi')
    );
    
    if (!videoFile) {
      console.log('\n⚠️  No se encontró archivo de video en Storage');
      
      // Intentar buscar en otras ubicaciones posibles
      const alternativePaths = [
        `${postcard.user_id}/${postcard.id}`,
        `${postcard.user_id}`,
        postcard.id
      ];
      
      for (const path of alternativePaths) {
        console.log(`🔍 Buscando en: ${path}`);
        const { data: altFiles } = await supabase.storage
          .from('postcard-videos')
          .list(path, { limit: 20 });
        
        if (altFiles && altFiles.length > 0) {
          console.log(`   Archivos encontrados en ${path}:`);
          altFiles.forEach(file => {
            console.log(`   - ${file.name}`);
          });
        }
      }
      
      return false;
    }
    
    // 5. Construir la URL correcta del video
    const correctVideoPath = `${postcard.user_id}/${postcard.id}/${videoFile.name}`;
    console.log('\n✅ Archivo de video encontrado:', videoFile.name);
    console.log('🔗 Ruta correcta:', correctVideoPath);
    
    // 6. Crear URL firmada para verificar acceso
    const { data: signedUrl, error: signError } = await supabase.storage
      .from('postcard-videos')
      .createSignedUrl(correctVideoPath, 3600); // 1 hora
    
    if (signError) {
      console.error('❌ Error creando URL firmada:', signError.message);
      return false;
    }
    
    console.log('🔐 URL firmada creada exitosamente');
    
    // 7. Actualizar la base de datos con la ruta correcta
    const { error: updateError } = await supabase
      .from('postcards')
      .update({ 
        video_url: correctVideoPath,
        updated_at: new Date().toISOString()
      })
      .eq('id', postcardId);
    
    if (updateError) {
      console.error('❌ Error actualizando postal:', updateError.message);
      return false;
    }
    
    console.log('\n✅ Postal actualizada exitosamente');
    console.log('📝 Nueva video_url:', correctVideoPath);
    
    // 8. Verificar la actualización
    const { data: updatedPostcard } = await supabase
      .from('postcards')
      .select('video_url, updated_at')
      .eq('id', postcardId)
      .single();
    
    console.log('\n🔍 Verificación:');
    console.log('   - Video URL:', updatedPostcard?.video_url);
    console.log('   - Actualizado:', updatedPostcard?.updated_at);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
    return false;
  }
}

// Ejecutar script
if (require.main === module) {
  const postcardId = process.argv[2];
  
  if (!postcardId) {
    console.error('❌ Uso: node fix-postcard-video.js <postcard-id>');
    process.exit(1);
  }
  
  fixPostcardVideo(postcardId)
    .then(success => {
      if (success) {
        console.log('\n🎉 Script completado exitosamente');
        process.exit(0);
      } else {
        console.log('\n❌ Script falló');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { fixPostcardVideo };