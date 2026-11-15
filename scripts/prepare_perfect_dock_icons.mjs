import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = 'C:/Users/deadl/.gemini/antigravity/brain/644183de-b612-4613-945c-efd17e06a75e/.user_uploaded';

const ICONS = [
  {
    name: 'search',
    source: path.join(UPLOAD_DIR, 'media_1794204199573_b95ecca4.png'),
    type: 'invert',
  },
  {
    name: 'categories',
    source: path.join(UPLOAD_DIR, 'media_1794204199572_6e1f012b.png'),
    type: 'invert',
  },
  {
    name: 'languages',
    source: path.join(UPLOAD_DIR, 'media_1794204199573_a93267b2.png'),
    type: 'direct',
  },
  {
    name: 'watchlist',
    source: path.join(UPLOAD_DIR, 'media_1794204199573_c7f823c1.png'),
    type: 'watchlist',
  },
];

async function main() {
  const browser = await chromium.launch();

  for (const icon of ICONS) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 512, height: 512 });
    const rawB64 = fs.readFileSync(icon.source).toString('base64');

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; background: transparent; width: 512px; height: 512px;">
        <canvas id="c" width="512" height="512"></canvas>
        <script>
          const canvas = document.getElementById('c');
          const ctx = canvas.getContext('2d');
          const img = new Image();

          img.onload = () => {
            const TARGET_SIZE = 360;
            const OFFSET = (512 - TARGET_SIZE) / 2;

            if ('${icon.type}' === 'invert') {
              // Convert black icon pixels to crisp white with alpha preserved
              const temp = document.createElement('canvas');
              temp.width = 512;
              temp.height = 512;
              const tctx = temp.getContext('2d');
              tctx.drawImage(img, OFFSET, OFFSET, TARGET_SIZE, TARGET_SIZE);
              const imgData = tctx.getImageData(0, 0, 512, 512);
              const d = imgData.data;
              for (let i = 0; i < d.length; i += 4) {
                const a = d[i + 3];
                if (a > 20) {
                  d[i] = 255;
                  d[i + 1] = 255;
                  d[i + 2] = 255;
                }
              }
              ctx.putImageData(imgData, 0, 0);

            } else if ('${icon.type}' === 'watchlist') {
              // Draw the circular badge with a crisp white border ring and centered white heart
              // 1. Draw outer white ring
              ctx.beginPath();
              ctx.arc(256, 256, 175, 0, Math.PI * 2);
              ctx.lineWidth = 14;
              ctx.strokeStyle = '#ffffff';
              ctx.stroke();

              // 2. Draw black/charcoal inner circle disc
              ctx.beginPath();
              ctx.arc(256, 256, 168, 0, Math.PI * 2);
              ctx.fillStyle = '#0f1115';
              ctx.fill();

              // 3. Extract the white heart from the uploaded image and draw it centered
              const temp = document.createElement('canvas');
              temp.width = img.width;
              temp.height = img.height;
              const tctx = temp.getContext('2d');
              tctx.drawImage(img, 0, 0);
              const imgData = tctx.getImageData(0, 0, img.width, img.height);
              const d = imgData.data;

              const heartCanvas = document.createElement('canvas');
              heartCanvas.width = img.width;
              heartCanvas.height = img.height;
              const hctx = heartCanvas.getContext('2d');
              const hData = hctx.createImageData(img.width, img.height);
              for (let i = 0; i < d.length; i += 4) {
                const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
                // Heart is the white area inside the black circle
                if (a > 60 && r > 150 && g > 150 && b > 150) {
                  hData.data[i] = 255;
                  hData.data[i+1] = 255;
                  hData.data[i+2] = 255;
                  hData.data[i+3] = a;
                }
              }
              hctx.putImageData(hData, 0, 0);

              const HEART_SIZE = 220;
              const H_OFFSET = (512 - HEART_SIZE) / 2;
              ctx.drawImage(heartCanvas, H_OFFSET, H_OFFSET, HEART_SIZE, HEART_SIZE);

            } else {
              // Languages: draw authentic full-color Google translate logo
              ctx.drawImage(img, OFFSET, OFFSET, TARGET_SIZE, TARGET_SIZE);
            }

            document.body.setAttribute('data-done', 'true');
          };

          img.src = 'data:image/png;base64,${rawB64}';
        </script>
      </body>
      </html>
    `);

    await page.waitForSelector('body[data-done="true"]', { timeout: 10000 });
    const buf = await page.locator('#c').screenshot({ omitBackground: true });

    const dockPath = path.join('public/dock', `${icon.name}.png`);
    const iconPath = path.join('public/icons', `${icon.name}.png`);
    fs.writeFileSync(dockPath, buf);
    fs.writeFileSync(iconPath, buf);
    console.log(`[Icon Prep] Generated ${dockPath} (${buf.length} bytes)`);
    await page.close();
  }

  await browser.close();
  console.log('[Icon Prep] All 4 dock icons generated successfully!');
}

main().catch(console.error);
