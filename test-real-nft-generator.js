/**
 * Test script for real NFT generation using @webarkit/nft-marker-creator-app
 */

const { createClient } = require('@supabase/supabase-js');
const { generateRealNFTDescriptors } = require('./src/lib/real-nft-generator');

// Supabase configuration
const supabaseUrl = 'https://qllfquoqrxvfgdudnrrr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbGZxdW9xcnh2ZmdkdWRucnJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTIyNjg5NywiZXhwIjoyMDcwODAyODk3fQ.gPqdTeE35i23COXrwFce3V5ctYku2ABSWt4gaL6jRr4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const postcardId = '8e1c09ff-f545-4d32-a6f1-16ad52804451';

async function testRealNFTGeneration() {
  try {
    console.log('🚀 Iniciando prueba de generación de NFT reales...');
    
    // Get postcard data
    const { data: postcard, error } = await supabase
      .from('postcards')
      .select('*')
      .eq('id', postcardId)
      .single();
    
    if (error) {
      console.error('❌ Error obteniendo postal:', error);
      return;
    }
    
    console.log('📮 Postal encontrada:', {
      id: postcard.id,
      status: postcard.status,
      image_path: postcard.image_path,
      descriptors_base_path: postcard.descriptors_base_path
    });
    
    // Generate real NFT descriptors
    console.log('🔧 Generando descriptores NFT reales...');
    const result = await generateRealNFTDescriptors(
      postcard.image_path,
      postcard.id,
      supabase
    );
    
    console.log('✅ Descriptores NFT generados exitosamente:', result);
    
    // Update postcard with new descriptors
    const { error: updateError } = await supabase
      .from('postcards')
      .update({
        descriptors_base_path: result.descriptorsBasePath,
        status: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', postcardId);
    
    if (updateError) {
      console.error('❌ Error actualizando postal:', updateError);
      return;
    }
    
    console.log('🎉 Postal actualizada exitosamente con descriptores reales!');
    
  } catch (error) {
    console.error('💥 Error en la prueba:', error);
  }
}

// Run the test
testRealNFTGeneration();