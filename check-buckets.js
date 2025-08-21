const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables from .env.local
let supabaseUrl, supabaseServiceKey;
try {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.split('=')[1].trim();
    }
  }
} catch (error) {
  console.error('Error reading .env.local:', error.message);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBuckets() {
  console.log('=== CHECKING AVAILABLE BUCKETS ===');
  
  try {
    // List all buckets
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Error listing buckets:', error);
      return;
    }
    
    console.log('Available buckets:');
    buckets.forEach(bucket => {
      console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
    
    // Check if we can create the postcards bucket
    console.log('\n=== TRYING TO CREATE POSTCARDS BUCKET ===');
    const { data: newBucket, error: createError } = await supabase.storage
      .createBucket('postcards', {
        public: false,
        allowedMimeTypes: ['application/octet-stream', 'image/*', 'video/*'],
        fileSizeLimit: 50 * 1024 * 1024 // 50MB
      });
    
    if (createError) {
      console.log('❌ Could not create postcards bucket:', createError.message);
      
      // Try to use an existing bucket for NFT files
      console.log('\n=== CHECKING EXISTING BUCKETS FOR NFT STORAGE ===');
      
      // Check postcard-images bucket
      console.log('Checking postcard-images bucket...');
      const { data: imageFiles, error: imageError } = await supabase.storage
        .from('postcard-images')
        .list('', { limit: 5 });
      
      if (!imageError) {
        console.log('✅ postcard-images bucket is accessible');
        
        // Try to upload a test file
        const testContent = Buffer.from('test');
        const { data: uploadTest, error: uploadError } = await supabase.storage
          .from('postcard-images')
          .upload('test-nft-file.txt', testContent, { upsert: true });
        
        if (!uploadError) {
          console.log('✅ Can upload to postcard-images bucket');
          
          // Clean up test file
          await supabase.storage
            .from('postcard-images')
            .remove(['test-nft-file.txt']);
        } else {
          console.log('❌ Cannot upload to postcard-images:', uploadError.message);
        }
      } else {
        console.log('❌ postcard-images bucket not accessible:', imageError.message);
      }
      
    } else {
      console.log('✅ Successfully created postcards bucket');
    }
    
  } catch (error) {
    console.error('❌ Error checking buckets:', error);
  }
}

checkBuckets();