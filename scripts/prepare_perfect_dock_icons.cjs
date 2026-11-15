const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = 'C:/Users/deadl/.gemini/antigravity/brain/644183de-b612-4613-945c-efd17e06a75e/.user_uploaded';

const ICONS = [
  {
    name: 'search',
    source: path.join(UPLOAD_DIR, 'media_1794204199573_b95ecca4.png'),
    type: 'search',
  },
  {
    name: 'categories',
    source: path.join(UPLOAD_DIR, 'media_1794204199572_6e1f012b.png'),
    type: 'categories',
  },
  {
    name: 'languages',
    source: path.join(UPLOAD_DIR, 'media_1794204199573_a93267b2.png'),
    type: 'languages',
  },
  {
    name: 'watchlist',
    source: path.join(UPLOAD_DIR, 'media_1794204199573_c7f823c1.png'),
    type: 'watchlist',
  },
];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 512, height: 512 });

  for (const icon of ICONS) {
    const rawB64 = fs.readFileSync(icon.source).toString('base64');

    const dataUrl = await page.evaluate(async ({ b64, type }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await new Promise(r => img.onload = r);

      // 1. Draw source image to temp canvas
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = img.width;
      srcCanvas.height = img.height;
      const srcCtx = srcCanvas.getContext('2d');
      srcCtx.drawImage(img, 0, 0);

      // 2. Measure bounding box of non-transparent pixels
      const imgData = srcCtx.getImageData(0, 0, img.width, img.height);
      let minX = img.width, maxX = 0, minY = img.height, maxY = 0;
      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          const a = imgData.data[(y * img.width + x) * 4 + 3];
          if (a > 15) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      const cropW = Math.max(1, maxX - minX + 1);
      const cropH = Math.max(1, maxY - minY + 1);

      // 3. Destination 512x512 canvas
      const dstCanvas = document.createElement('canvas');
      dstCanvas.width = 512;
      dstCanvas.height = 512;
      const dstCtx = dstCanvas.getContext('2d');
      dstCtx.imageSmoothingEnabled = true;
      dstCtx.imageSmoothingQuality = 'high';

      // Uniform TARGET_SIZE for optical parity
      const TARGET_SIZE = 450;

      if (type === 'search' || type === 'categories') {
        const scale = TARGET_SIZE / Math.max(cropW, cropH);
        const drawW = cropW * scale;
        const drawH = cropH * scale;
        const drawX = (512 - drawW) / 2;
        const drawY = (512 - drawH) / 2;

        dstCtx.drawImage(srcCanvas, minX, minY, cropW, cropH, drawX, drawY, drawW, drawH);

        // Turn all non-transparent pixels crisp pure white (#ffffff)
        const dData = dstCtx.getImageData(0, 0, 512, 512);
        for (let i = 0; i < dData.data.length; i += 4) {
          if (dData.data[i + 3] > 10) {
            dData.data[i] = 255;
            dData.data[i + 1] = 255;
            dData.data[i + 2] = 255;
          }
        }
        dstCtx.putImageData(dData, 0, 0);

      } else if (type === 'languages') {
        const scale = TARGET_SIZE / Math.max(cropW, cropH);
        const drawW = cropW * scale;
        const drawH = cropH * scale;
        const drawX = (512 - drawW) / 2;
        const drawY = (512 - drawH) / 2;

        // Preserve authentic Google Translate blue & grey colors
        dstCtx.drawImage(srcCanvas, minX, minY, cropW, cropH, drawX, drawY, drawW, drawH);

      } else if (type === 'watchlist') {
        // Outer white ring + centered white heart matching TARGET_SIZE
        const radius = TARGET_SIZE / 2;
        const cx = 256;
        const cy = 256;

        // Outer white ring (crisp stroke)
        dstCtx.beginPath();
        dstCtx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
        dstCtx.lineWidth = 16;
        dstCtx.strokeStyle = '#ffffff';
        dstCtx.stroke();

        // Inner dark disc
        dstCtx.beginPath();
        dstCtx.arc(cx, cy, radius - 16, 0, Math.PI * 2);
        dstCtx.fillStyle = '#0f1115';
        dstCtx.fill();

        // Extract heart from srcCanvas
        const heartCanvas = document.createElement('canvas');
        heartCanvas.width = img.width;
        heartCanvas.height = img.height;
        const hctx = heartCanvas.getContext('2d');
        const hData = hctx.createImageData(img.width, img.height);
        let hMinX = img.width, hMaxX = 0, hMinY = img.height, hMaxY = 0;

        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const idx = (y * img.width + x) * 4;
            const r = imgData.data[idx], g = imgData.data[idx+1], b = imgData.data[idx+2], a = imgData.data[idx+3];
            // Heart is the white area inside the black circle
            if (a > 60 && r > 150 && g > 150 && b > 150) {
              hData.data[idx] = 255;
              hData.data[idx+1] = 255;
              hData.data[idx+2] = 255;
              hData.data[idx+3] = a;
              if (x < hMinX) hMinX = x;
              if (x > hMaxX) hMaxX = x;
              if (y < hMinY) hMinY = y;
              if (y > hMaxY) hMaxY = y;
            }
          }
        }
        hctx.putImageData(hData, 0, 0);

        const hCropW = Math.max(1, hMaxX - hMinX + 1);
        const hCropH = Math.max(1, hMaxY - hMinY + 1);
        const HEART_TARGET = TARGET_SIZE * 0.48; // Heart size inside ring
        const hScale = HEART_TARGET / Math.max(hCropW, hCropH);
        const hDrawW = hCropW * hScale;
        const hDrawH = hCropH * hScale;
        const hDrawX = (512 - hDrawW) / 2;
        const hDrawY = (512 - hDrawH) / 2;

        dstCtx.drawImage(heartCanvas, hMinX, hMinY, hCropW, hCropH, hDrawX, hDrawY, hDrawW, hDrawH);
      }

      return dstCanvas.toDataURL('image/png');
    }, { b64: rawB64, type: icon.type });

    const buf = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    const dockPath = path.join('public', 'dock', `${icon.name}.png`);
    const iconPath = path.join('public', 'icons', `${icon.name}.png`);
    fs.writeFileSync(dockPath, buf);
    fs.writeFileSync(iconPath, buf);
    console.log(`[Icon Prep] Generated ${dockPath} (${buf.length} bytes)`);
  }

  await browser.close();
  console.log('[Icon Prep] All 4 dock icons generated successfully!');
}

main().catch(console.error);

