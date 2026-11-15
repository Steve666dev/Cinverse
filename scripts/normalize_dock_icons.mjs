import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/deadl/.gemini/antigravity/brain/644183de-b612-4613-945c-efd17e06a75e';
const USER_UPLOADS = path.join(ARTIFACT_DIR, '.user_uploaded');

async function normalizeIcons() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent('<html><body><canvas id="c"></canvas></body></html>');

  const configs = [
    {
      name: 'search.png',
      srcPath: path.join(USER_UPLOADS, 'media_1794204199573_b95ecca4.png'),
      targetSize: 380, // optical size inside 512x512
      makeWhite: true
    },
    {
      name: 'categories.png',
      srcPath: path.join(USER_UPLOADS, 'media_1794204199572_6e1f012b.png'),
      targetSize: 380,
      makeWhite: true
    },
    {
      name: 'languages.png',
      srcPath: path.join(USER_UPLOADS, 'media_1794204199573_a93267b2.png'),
      targetSize: 380,
      makeWhite: false // preserve Google translate authentic colors
    },
    {
      name: 'watchlist.png',
      srcPath: path.join(USER_UPLOADS, 'media_1794204199573_c7f823c1.png'),
      targetSize: 380,
      makeWhite: false // black circle with white heart + subtle glass border
    }
  ];

  for (const cfg of configs) {
    const rawB64 = fs.readFileSync(cfg.srcPath).toString('base64');
    const dataUrl = `data:image/png;base64,${rawB64}`;

    const normalizedDataUrl = await page.evaluate(async ({ url, targetSize, makeWhite, name }) => {
      const img = new Image();
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

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

      // 3. Create destination 512x512 canvas
      const dstCanvas = document.createElement('canvas');
      dstCanvas.width = 512;
      dstCanvas.height = 512;
      const dstCtx = dstCanvas.getContext('2d');

      // Determine scaling to fit targetSize uniformly
      const scale = targetSize / Math.max(cropW, cropH);
      const drawW = cropW * scale;
      const drawH = cropH * scale;
      const drawX = (512 - drawW) / 2;
      const drawY = (512 - drawH) / 2;

      // Draw cropped and scaled image into destination
      dstCtx.imageSmoothingEnabled = true;
      dstCtx.imageSmoothingQuality = 'high';
      dstCtx.drawImage(
        srcCanvas,
        minX, minY, cropW, cropH,
        drawX, drawY, drawW, drawH
      );

      // If makeWhite, turn all non-transparent pixels pure white (#ffffff)
      if (makeWhite) {
        const dstData = dstCtx.getImageData(0, 0, 512, 512);
        for (let i = 0; i < dstData.data.length; i += 4) {
          const a = dstData.data[i + 3];
          if (a > 0) {
            dstData.data[i] = 255;     // R
            dstData.data[i + 1] = 255; // G
            dstData.data[i + 2] = 255; // B
          }
        }
        dstCtx.putImageData(dstData, 0, 0);
      }

      // If watchlist, add a subtle glass ring border around the circle
      if (name === 'watchlist.png') {
        const radius = drawW / 2;
        const cx = drawX + radius;
        const cy = drawY + radius;
        dstCtx.beginPath();
        dstCtx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
        dstCtx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        dstCtx.lineWidth = 6;
        dstCtx.stroke();
      }

      return dstCanvas.toDataURL('image/png');
    }, { url: dataUrl, targetSize: cfg.targetSize, makeWhite: cfg.makeWhite, name: cfg.name });

    // Save to public/dock and public/icons
    const outBuffer = Buffer.from(normalizedDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    fs.writeFileSync(path.join('public', 'dock', cfg.name), outBuffer);
    fs.writeFileSync(path.join('public', 'icons', cfg.name), outBuffer);
    console.log(`[Normalized] ${cfg.name} successfully exported (512x512, optical size: ${cfg.targetSize}px)`);
  }

  await browser.close();
}

normalizeIcons().catch(err => {
  console.error(err);
  process.exit(1);
});

