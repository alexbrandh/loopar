// Simple HTTP GET to verify the postcards endpoint (configurable base URL)
const http = require('http');

const base = process.env.BASE_URL || process.argv[2] || 'http://localhost:3002';
const id = '550e8400-e29b-41d4-a716-446655440001';
const url = `${base}/api/postcards/${id}`;
console.log('Requesting:', url);

http.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
      const nd = json?.data?.nft_descriptors || json?.nft_descriptors;
      const hasFiles = !!(nd && (nd.files || nd.iset || nd.fset || nd.fset3));
      console.log('\nHas NFT descriptors:', hasFiles);
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
      console.error('Raw:', data);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('HTTP request error:', err.message);
  process.exit(1);
});
