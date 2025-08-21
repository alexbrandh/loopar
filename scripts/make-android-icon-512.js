// Resize public/icon-192.png to public/android-chrome-512x512.png using sharp
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

(async () => {
  try {
    const src = path.join(__dirname, '..', 'public', 'icon-192.png');
    const out = path.join(__dirname, '..', 'public', 'android-chrome-512x512.png');
    if (!fs.existsSync(src)) {
      console.error('Source not found:', src);
      process.exit(1);
    }
    const img = sharp(src);
    const meta = await img.metadata();
    console.log('Source meta:', meta);
    await img
      .resize(512, 512, { fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toFile(out);
    const stat = fs.statSync(out);
    console.log('Wrote', out, 'size', stat.size);
  } catch (e) {
    console.error('Failed to create 512 icon:', e);
    process.exit(1);
  }
})();
