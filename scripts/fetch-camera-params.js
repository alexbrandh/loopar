// Download a valid camera_para.dat into public/ar/
const fs = require('fs');
const path = require('path');

async function main() {
  const urls = [
    // Reliable GH Pages hosting used by AR.js examples
    'https://jeromeetienne.github.io/AR.js/data/data/camera_para.dat',
    // Raw GitHub sources (both repos)
    'https://raw.githubusercontent.com/jeromeetienne/AR.js/master/data/data/camera_para.dat',
    'https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/data/camera_para.dat',
    // jsDelivr GitHub fallbacks
    'https://cdn.jsdelivr.net/gh/jeromeetienne/AR.js@master/data/data/camera_para.dat',
    'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@master/data/data/camera_para.dat',
    // Unpkg (least reliable)
    'https://unpkg.com/@ar-js-org/ar.js@latest/three.js/data/camera_para.dat',
  ];
  const outPath = path.join(__dirname, '..', 'public', 'ar', 'camera_para.dat');
  for (const url of urls) {
    try {
      console.log('Fetching', url);
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      // Accept small but valid files (> 100 bytes). Many AR.js camera_para.dat files are ~176 bytes.
      if (buf.length <= 100) throw new Error('Downloaded file too small: ' + buf.length);
      await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
      await fs.promises.writeFile(outPath, buf);
      console.log('Saved to', outPath, 'size =', buf.length, 'bytes');
      return;
    } catch (e) {
      console.warn('Failed from', url, '-', e.message);
    }
  }
  throw new Error('All sources failed');
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
