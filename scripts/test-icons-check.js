const fs = require('fs');
const path = require('path');

(async () => {
  const base = process.env.BASE_URL || 'http://localhost:3001';
  const urls = [
    '/icon-512.png',
    '/icons/icon-512.png',
    '/icons/test512.png',
    '/icons/nonexistent/icon-512.png'
  ].map(u => new URL(u, base).toString());

  console.log('Base URL:', base);

  for (const u of urls) {
    console.log(`\n== ${u} ==`);
    try {
      const head = await fetch(u, { method: 'HEAD' });
      const ct = head.headers.get('content-type');
      const cc = head.headers.get('cache-control');
      const cl = head.headers.get('content-length');
      console.log(`[HEAD] ${head.status} CT=${ct} CC=${cc} CL=${cl}`);
    } catch (e) {
      console.log(`[HEAD] ERROR ${e.message}`);
    }

    try {
      const res = await fetch(u);
      const ab = await res.arrayBuffer();
      console.log(`[GET ] ${res.status} bytes=${ab.byteLength}`);
    } catch (e) {
      console.log(`[GET ] ERROR ${e.message}`);
    }
  }
})();
