const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://qllfquoqrxvfgdudnrrr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbGZxdW9xcnh2ZmdkdWRucnJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTIyNjg5NywiZXhwIjoyMDcwODAyODk3fQ.gPqdTeE35i23COXrwFce3V5ctYku2ABSWt4gaL6jRr4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const postcardId = '8e1c09ff-f545-4d32-a6f1-16ad52804451';

async function checkPostcardData() {
  try {
    console.log('🔍 Verificando datos de la postal...');
    
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
    
    if (!postcard) {
      console.error('❌ Postal no encontrada');
      return;
    }
    
    console.log('📮 Datos completos de la postal:');
    console.log(JSON.stringify(postcard, null, 2));
    
    console.log('\n📊 Campos disponibles:');
    Object.keys(postcard).forEach(key => {
      console.log(`- ${key}: ${typeof postcard[key]} = ${postcard[key]}`);
    });
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkPostcardData();