// Test video URL from /api/postcards/[id]: HEAD and small ranged GET
(async () => {
  try {
    const base = process.env.BASE_URL || 'http://localhost:3000';
    const id = process.env.POSTCARD_ID || '550e8400-e29b-41d4-a716-446655440001';
    const apiUrl = `${base}/api/postcards/${id}`;
    console.log('Fetching postcard:', apiUrl);
    const res = await fetch(apiUrl);
    console.log('[API] status:', res.status);
    if (!res.ok) {
      console.error('API not OK');
      process.exit(1);
    }
    const data = await res.json();
    const videoUrl = data?.video_url || data?.data?.video_url;
    console.log('video_url:', videoUrl || '(none)');
    if (!videoUrl) {
      console.error('No video_url in response');
      process.exit(1);
    }

    // HEAD request
    try {
      const headRes = await fetch(videoUrl, { method: 'HEAD' });
      console.log('[HEAD] status:', headRes.status);
      console.log('[HEAD] content-type:', headRes.headers.get('content-type'));
      console.log('[HEAD] content-length:', headRes.headers.get('content-length'));
      console.log('[HEAD] accept-ranges:', headRes.headers.get('accept-ranges'));
    } catch (e) {
      console.log('[HEAD] error:', e?.message || e);
    }

    // Small range GET to validate bytes available
    try {
      const rangeRes = await fetch(videoUrl, { headers: { Range: 'bytes=0-1023' } });
      console.log('[RANGE] status:', rangeRes.status);
      console.log('[RANGE] content-range:', rangeRes.headers.get('content-range'));
      const buf = Buffer.from(await rangeRes.arrayBuffer());
      console.log('[RANGE] bytes downloaded:', buf.length);
    } catch (e) {
      console.log('[RANGE] error:', e?.message || e);
    }

    process.exit(0);
  } catch (e) {
    console.error('Test failed:', e?.message || e);
    process.exit(1);
  }
})();
