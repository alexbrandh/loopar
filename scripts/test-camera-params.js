// Quick test for /api/ar/camera-params
(async () => {
  const url = process.env.URL || 'http://localhost:3000/api/ar/camera-params';
  console.log('Testing:', url);
  try {
    // HEAD via fetch (Node 18+ supports fetch)
    try {
      const headRes = await fetch(url, { method: 'HEAD' });
      console.log('[HEAD] status:', headRes.status);
      console.log('[HEAD] content-type:', headRes.headers.get('content-type'));
      console.log('[HEAD] cache-control:', headRes.headers.get('cache-control'));
    } catch (e) {
      console.log('[HEAD] error:', e?.message || e);
    }

    // GET and measure size
    const getRes = await fetch(url, { method: 'GET' });
    console.log('[GET] status:', getRes.status);
    console.log('[GET] content-type:', getRes.headers.get('content-type'));
    const buf = await getRes.arrayBuffer();
    console.log('[GET] bytes:', buf.byteLength);
    process.exit(0);
  } catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
  }
})();
