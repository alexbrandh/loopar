// Script para debuggear la API de postcards
// Usando fetch nativo de Node.js 18+

async function testAPI() {
  try {
    // Usar el ID de postal que sabemos que existe y está lista
    const postcardId = '550e8400-e29b-41d4-a716-446655440001';
    const response = await fetch(`http://localhost:3000/api/postcards/${postcardId}`);
    
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers));
    
    const data = await response.json();
    console.log('\nResponse data:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.nft_descriptors) {
      console.log('\nNFT Descriptors found:');
      console.log(JSON.stringify(data.nft_descriptors, null, 2));
    } else {
      console.log('\nNo NFT descriptors found in response');
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAPI();