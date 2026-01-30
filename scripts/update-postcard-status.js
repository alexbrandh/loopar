const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qllfquoqrxvfgdudnrrr.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbGZxdW9xcnh2ZmdkdWRucnJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTIyNjg5NywiZXhwIjoyMDcwODAyODk3fQ.gPqdTeE35i23COXrwFce3V5ctYku2ABSWt4gaL6jRr4';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updatePostcardStatus(postcardId, status = 'processing') {
  console.log(`🔄 Updating postcard ${postcardId} status to: ${status}`);
  
  try {
    // Clear existing NFT descriptors and update status
    const { data, error } = await supabase
      .from('postcards')
      .update({ 
        processing_status: status,
        nft_descriptors: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', postcardId)
      .select();

    if (error) {
      console.error('❌ Error updating postcard:', error);
      return false;
    }

    if (!data || data.length === 0) {
      console.error('❌ Postcard not found');
      return false;
    }

    console.log('✅ Postcard status updated successfully');
    console.log('📋 Updated postcard:', {
      id: data[0].id,
      status: data[0].processing_status,
      nft_descriptors: data[0].nft_descriptors,
      updated_at: data[0].updated_at
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

// Main execution
if (require.main === module) {
  const postcardId = process.argv[2];
  const status = process.argv[3] || 'processing';
  
  if (!postcardId) {
    console.error('❌ Usage: node update-postcard-status.js <postcard-id> [status]');
    console.error('   Status options: processing, ready, error, needs_better_image');
    process.exit(1);
  }
  
  updatePostcardStatus(postcardId, status)
    .then(success => {
      if (success) {
        console.log('🎉 Status update completed successfully');
        process.exit(0);
      } else {
        console.log('❌ Status update failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { updatePostcardStatus };