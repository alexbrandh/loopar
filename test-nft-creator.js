/**
 * Test script to verify @webarkit/nft-marker-creator-app functionality
 */

const fs = require('fs');
const path = require('path');

async function testNFTCreator() {
  try {
    console.log('Testing NFT Marker Creator...');
    
    // Try to import the library
    const nftMC = await import('@webarkit/nft-marker-creator-app');
    console.log('✅ Successfully imported NFT Marker Creator');
    console.log('Available exports:', Object.keys(nftMC));
    
    // Check if we can initialize it
    if (nftMC.default) {
      console.log('Attempting to initialize NFT Marker Creator...');
      const mc = await nftMC.default();
      console.log('✅ NFT Marker Creator initialized successfully');
      console.log('Available methods:', Object.keys(mc));
    }
    
  } catch (error) {
    console.error('❌ Error testing NFT Marker Creator:', error);
  }
}

testNFTCreator();