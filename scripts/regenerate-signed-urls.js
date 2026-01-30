// Regenerar URLs firmadas para una postal específica
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const POSTCARD_ID = '8e1c09ff-f545-4d32-a6f1-16ad52804451';

async function regenerateSignedUrls() {
  try {
    console.log('🔄 Regenerando URLs firmadas para postal:', POSTCARD_ID);
    
    // Obtener la postal
    const { data: postcard, error: fetchError } = await supabase
      .from('postcards')
      .select('id, user_id, image_url, video_url, nft_descriptors, processing_status')
      .eq('id', POSTCARD_ID)
      .single();
    
    if (fetchError) {
      console.error('❌ Error obteniendo postal:', fetchError);
      return;
    }
    
    console.log('📋 Postal encontrada:', {
      id: postcard.id,
      status: postcard.processing_status,
      user_id: postcard.user_id
    });
    
    // Generar nuevas URLs firmadas
    const updates = {};
    
    // Generar URL firmada para video (bucket postcard-videos)
    if (postcard.video_url) {
      try {
        const { data: videoUrl, error: videoError } = await supabase.storage
          .from('postcard-videos')
          .createSignedUrl(postcard.video_url, 3600); // 1 hora
        
        if (!videoError && videoUrl) {
          updates.video_url = videoUrl.signedUrl;
          console.log('✅ URL de video generada');
        } else {
          console.log('⚠️ Error generando URL de video:', videoError);
        }
      } catch (err) {
        console.log('⚠️ No se pudo generar URL de video:', err.message);
      }
    }
    
    // Generar URLs firmadas para descriptores NFT (bucket postcards)
    const descriptorFiles = ['iset', 'fset', 'fset3'];
    const newNftDescriptors = { files: {} };
    
    for (const ext of descriptorFiles) {
      try {
        const filePath = `${postcard.user_id}/${postcard.id}/nft/descriptors.${ext}`;
        const { data: url, error } = await supabase.storage
          .from('postcards')
          .createSignedUrl(filePath, 3600); // 1 hora
        
        if (!error && url) {
          newNftDescriptors.files[ext] = url.signedUrl;
          console.log(`✅ URL de ${ext} generada`);
        } else {
          console.log(`⚠️ Error generando URL de ${ext}:`, error);
        }
      } catch (err) {
        console.log(`⚠️ No se pudo generar URL de ${ext}:`, err.message);
      }
    }
    
    if (Object.keys(newNftDescriptors.files).length > 0) {
      updates.nft_descriptors = newNftDescriptors;
    }
    
    // Actualizar la postal si hay URLs para actualizar
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('postcards')
        .update(updates)
        .eq('id', POSTCARD_ID);
      
      if (updateError) {
        console.error('❌ Error actualizando postal:', updateError);
      } else {
        console.log('✅ URLs firmadas regeneradas exitosamente');
        console.log('📊 URLs actualizadas:', Object.keys(updates));
        
        // Mostrar las nuevas URLs
        if (updates.nft_descriptors) {
          console.log('🔗 Nuevas URLs NFT:');
          Object.entries(updates.nft_descriptors.files).forEach(([ext, url]) => {
            console.log(`  ${ext}: ${url.substring(0, 80)}...`);
          });
        }
      }
    } else {
      console.log('⚠️ No se generaron URLs para actualizar');
    }
    
  } catch (error) {
    console.error('💥 Error en el proceso:', error);
    console.log('💥 Proceso falló');
  }
}

regenerateSignedUrls();