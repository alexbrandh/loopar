// Generate proper 512x512 icon from the existing 192x192 icon using sharp
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function run() {
  try {
    const pubDir = path.join(__dirname, '..', 'public');
    const src192 = path.join(pubDir, 'icon-192.png');
    const iconsDir = path.join(pubDir, 'icons');
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }
    const out512 = path.join(iconsDir, 'icon-512.png');

    if (!fs.existsSync(src192)) {
      console.error('Source icon not found:', src192);
      process.exit(1);
    }

    let generated = false;
    try {
      const img = sharp(src192);
      const meta = await img.metadata();
      console.log('Input icon meta:', meta);

      await img
        .resize(512, 512, { fit: 'cover' })
        .png({ compressionLevel: 9 })
        .toFile(out512);

      const outMeta = await sharp(out512).metadata();
      console.log('Output icon meta (sharp):', outMeta);
      generated = true;
    } catch (e) {
      console.warn('Sharp failed, falling back to node-canvas:', e.message || e);
      // Fallback: generate a simple PNG with node-canvas
      const { createCanvas, loadImage } = require('canvas');
      const canvas = createCanvas(512, 512);
      const ctx = canvas.getContext('2d');
      // background gradient
      const g = ctx.createLinearGradient(0, 0, 512, 512);
      g.addColorStop(0, '#667eea');
      g.addColorStop(1, '#764ba2');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 512);
      // optional: draw the 192 icon centered if possible
      try {
        const img192 = await loadImage(src192);
        const size = 320;
        ctx.drawImage(img192, (512 - size) / 2, (512 - size) / 2, size, size);
      } catch {}
      // add a subtle border
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, 504, 504);
      // save
      const buf = canvas.toBuffer('image/png');
      require('fs').writeFileSync(out512, buf);
      console.log('Output icon meta (canvas): 512x512 PNG generated');
      generated = true;
    }

    if (generated) {
      // Also copy to top-level for backward compatibility
      const topLevel = path.join(pubDir, 'icon-512.png');
      fs.copyFileSync(out512, topLevel);
      console.log('Copied to', topLevel);
      console.log('Generated', out512);
    }
  } catch (e) {
    console.error('Failed to generate icons:', e);
    process.exit(1);
  }
}

run();
