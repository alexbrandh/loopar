const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qllfquoqrxvfgdudnrrr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbGZxdW9xcnh2ZmdkdWRucnJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTIyNjg5NywiZXhwIjoyMDcwODAyODk3fQ.gPqdTeE35i23COXrwFce3V5ctYku2ABSWt4gaL6jRr4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPostcards() {
  try {
    console.log('Consultando postcards...');
    
    const { data, error } = await supabase
      .from('postcards')
      .select('id, title, processing_status, is_public, nft_descriptors')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('\nPostcards encontradas:');
    console.log('======================');
    
    data.forEach((postcard, index) => {
      console.log(`\n${index + 1}. ID: ${postcard.id}`);
      console.log(`   Título: ${postcard.title}`);
      console.log(`   Status: ${postcard.processing_status}`);
      console.log(`   Público: ${postcard.is_public}`);
      console.log(`   NFT Descriptors: ${postcard.nft_descriptors ? 'SÍ' : 'NO'}`);
      if (postcard.nft_descriptors) {
        console.log(`   Contenido NFT: ${JSON.stringify(postcard.nft_descriptors, null, 2)}`);
      }
    });

    // Buscar específicamente postcards públicas y listas
    console.log('\n\nPostcards públicas y listas:');
    console.log('=============================');
    
    const { data: readyCards, error: readyError } = await supabase
      .from('postcards')
      .select('id, title, processing_status, is_public, nft_descriptors')
      .eq('is_public', true)
      .eq('processing_status', 'ready');

    if (readyError) {
      console.error('Error buscando postcards listas:', readyError);
      return;
    }

    if (readyCards.length === 0) {
      console.log('No hay postcards públicas y listas.');
    } else {
      readyCards.forEach((card, index) => {
        console.log(`\n${index + 1}. ID: ${card.id}`);
        console.log(`   Título: ${card.title}`);
        console.log(`   NFT Descriptors: ${card.nft_descriptors ? 'SÍ' : 'NO'}`);
      });
    }

  } catch (err) {
    console.error('Error general:', err);
  }
}

checkPostcards();