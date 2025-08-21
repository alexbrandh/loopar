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

async function checkStorageFiles() {
  console.log('=== CHECKING STORAGE FILES ===');
  
  const postcardId = '47343e7a-7b1b-48ed-ad42-54739498d903';
  const userId = 'user_31J9GscxynzmpAVeWeOqNddwXwS';
  
  try {
    // Get postcard data first
    const { data: postcard, error: fetchError } = await supabase
      .from('postcards')
      .select('*')
      .eq('id', postcardId)
      .single();
    
    if (fetchError || !postcard) {
      console.error('❌ Postcard not found:', fetchError?.message);
      return;
    }
    
    console.log('Postcard data:', {
      id: postcard.id,
      user_id: postcard.user_id,
      image_url: postcard.image_url,
      video_url: postcard.video_url,
      processing_status: postcard.processing_status
    });
    
    // List all files in the postcards bucket
    console.log('\n=== LISTING ALL FILES IN POSTCARDS BUCKET ===');
    const { data: allFiles, error: listAllError } = await supabase.storage
      .from('postcards')
      .list('', {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (listAllError) {
      console.error('❌ Error listing all files:', listAllError);
    } else {
      console.log('All files in bucket:', allFiles?.map(f => f.name) || []);
    }
    
    // List files in the specific postcard directory
    console.log('\n=== LISTING FILES FOR THIS POSTCARD ===');
    const postcardPath = `postcards/${userId}/${postcardId}`;
    
    const { data: postcardFiles, error: listError } = await supabase.storage
      .from('postcards')
      .list(postcardPath, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (listError) {
      console.error('❌ Error listing postcard files:', listError);
    } else {
      console.log(`Files in ${postcardPath}:`, postcardFiles?.map(f => f.name) || []);
    }
    
    // Try to list files in the user directory
    console.log('\n=== LISTING FILES FOR USER ===');
    const userPath = `postcards/${userId}`;
    
    const { data: userFiles, error: userListError } = await supabase.storage
      .from('postcards')
      .list(userPath, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (userListError) {
      console.error('❌ Error listing user files:', userListError);
    } else {
      console.log(`Files in ${userPath}:`, userFiles?.map(f => f.name) || []);
    }
    
    // Check if we can access the image using different paths
    console.log('\n=== TESTING DIFFERENT IMAGE PATHS ===');
    const possiblePaths = [
      `postcards/${userId}/${postcardId}/image.jpg`,
      `postcards/${userId}/${postcardId}/image.png`,
      `${userId}/${postcardId}/image.jpg`,
      `${userId}/${postcardId}/image.png`,
      `${postcardId}/image.jpg`,
      `${postcardId}/image.png`
    ];
    
    for (const testPath of possiblePaths) {
      try {
        const { data, error } = await supabase.storage
          .from('postcards')
          .createSignedUrl(testPath, 60);
        
        if (!error && data) {
          console.log(`✅ Found image at: ${testPath}`);
          console.log(`   Signed URL: ${data.signedUrl}`);
        } else {
          console.log(`❌ Not found: ${testPath}`);
        }
      } catch (err) {
        console.log(`❌ Error testing ${testPath}:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking storage files:', error);
  }
}

checkStorageFiles();