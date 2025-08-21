const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'public', 'icon-512.png');
const outDir = path.join(__dirname, '..', 'public', 'icons');
const dest = path.join(outDir, 'icon-512.png');

(async () => {
  try {
    if (!fs.existsSync(src)) {
      console.error('Source missing:', src);
      process.exit(1);
    }
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.copyFileSync(src, dest);
    const stat = fs.statSync(dest);
    console.log('Copied to', dest, 'size', stat.size);
  } catch (e) {
    console.error('Copy failed:', e);
    process.exit(1);
  }
})();
