/**
 * Script de prueba para regenerar descriptores NFT
 * Ejecutar con: node test-nft-regenerate.js
 */

const postcardId = 'df722d96-e260-48c6-8d77-6cb9b0bad6ab';

console.log(`🔧 Regenerando descriptores NFT para postal: ${postcardId}`);
console.log('\n📝 Ejecuta este comando en tu terminal:\n');
console.log(`curl -X POST http://localhost:3000/api/nft/generate \\
  -H "Content-Type: application/json" \\
  -d '{"postcardId": "${postcardId}"}'`);
console.log('\n');
console.log('O visita esta URL en el navegador con tu sesión activa:');
console.log(`http://localhost:3000/api/nft/generate?postcardId=${postcardId}`);
console.log('\n');
console.log('Una vez regenerado, prueba la experiencia AR en:');
console.log(`http://localhost:3000/ar/${postcardId}`);
