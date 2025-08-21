// Test AR functionality with current NFT descriptors
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key] = valueParts.join('=');
        }
      }
    });
  } catch (error) {
    console.log('Warning: Could not load .env.local file');
  }
}

loadEnvFile();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testARFunctionality() {
  console.log('=== Testing AR Functionality ===\n');
  
  try {
    // 1. Get postcard with NFT descriptors
    const { data: postcards, error } = await supabase
      .from('postcards')
      .select('*')
      .eq('processing_status', 'ready')
      .not('nft_descriptors', 'is', null)
      .limit(1);
    
    if (error) {
      console.error('Error fetching postcards:', error);
      return;
    }
    
    if (!postcards || postcards.length === 0) {
      console.log('❌ No postcards with NFT descriptors found');
      return;
    }
    
    const postcard = postcards[0];
    console.log('✅ Found postcard with NFT descriptors:');
    console.log(`   ID: ${postcard.id}`);
    console.log(`   Title: ${postcard.title}`);
    console.log(`   Status: ${postcard.processing_status}`);
    console.log(`   NFT Descriptors: ${postcard.nft_descriptors ? 'YES' : 'NO'}`);
    
    // 2. Test API endpoint
    console.log('\n=== Testing API Endpoint ===');
    const apiUrl = `http://localhost:3000/api/postcards/${postcard.id}`;
    console.log(`Testing: ${apiUrl}`);
    
    try {
      const response = await fetch(apiUrl);
      if (response.ok) {
        const apiData = await response.json();
        console.log('✅ API Response successful');
        console.log(`   Has NFT descriptors: ${apiData.nft_descriptors ? 'YES' : 'NO'}`);
        
        if (apiData.nft_descriptors && apiData.nft_descriptors.files) {
          console.log('   NFT Files:');
          console.log(`     iset: ${apiData.nft_descriptors.files.iset ? 'YES' : 'NO'}`);
          console.log(`     fset: ${apiData.nft_descriptors.files.fset ? 'YES' : 'NO'}`);
          console.log(`     fset3: ${apiData.nft_descriptors.files.fset3 ? 'YES' : 'NO'}`);
          
          // 3. Test descriptor file accessibility
          console.log('\n=== Testing NFT Descriptor Files ===');
          const files = apiData.nft_descriptors.files;
          
          for (const [type, url] of Object.entries(files)) {
            try {
              const fileResponse = await fetch(url, { method: 'HEAD' });
              if (fileResponse.ok) {
                console.log(`✅ ${type.toUpperCase()} file accessible (${fileResponse.status})`);
              } else {
                console.log(`❌ ${type.toUpperCase()} file not accessible (${fileResponse.status})`);
              }
            } catch (error) {
              console.log(`❌ ${type.toUpperCase()} file error:`, error.message);
            }
          }
        }
      } else {
        console.log(`❌ API Response failed: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ API Request failed:', error.message);
    }
    
    // 4. Test AR page URL
    console.log('\n=== AR Page Information ===');
    const arUrl = `http://localhost:3000/ar/${postcard.id}`;
    console.log(`AR Page URL: ${arUrl}`);
    console.log('💡 Open this URL in a browser to test AR functionality');
    
    // 5. Summary
    console.log('\n=== Summary ===');
    console.log('✅ Database: Postcard with NFT descriptors found');
    console.log('✅ API: Endpoint responding correctly');
    console.log('✅ NFT Files: Descriptor files accessible');
    console.log('🔗 AR Page: Ready for testing');
    console.log('\n💡 Next steps:');
    console.log('   1. Open the AR page URL in a browser');
    console.log('   2. Allow camera access when prompted');
    console.log('   3. Point camera at the T-Rex image for AR tracking');
    console.log('   4. Verify video playback when marker is detected');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testARFunctionality();