const { processPostcardForAR } = require('./src/lib/nft-generator.ts');
require('dotenv').config({ path: '.env.local' });

async function generateNFTForPostcard() {
  const postcardId = '8e1c09ff-f545-4d32-a6f1-16ad52804451';
  const userId = 'user_31J9GscxynzmpAVeWeOqNddwXwS';
  
  console.log('🚀 Starting NFT generation for postcard:', postcardId);
  console.log('👤 User ID:', userId);
  
  try {
    const success = await processPostcardForAR(postcardId, userId);
    
    if (success) {
      console.log('✅ NFT generation completed successfully!');
    } else {
      console.log('❌ NFT generation failed');
    }
    
  } catch (error) {
    console.error('💥 Error during NFT generation:', error);
  }
}

generateNFTForPostcard();