import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = 'C:/Users/deadl/.gemini/antigravity/brain/644183de-b612-4613-945c-efd17e06a75e/.user_uploaded';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 512, height: 512 });

  const rawB64 = fs.readFileSync(path.join(UPLOAD_DIR, 'media_1794204199573_c7f823c1.png')).toString('base64');

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
          // Draw image to temp canvas
          const w = img.width;
          const h = img.height;
          const temp = document.createElement('canvas');
          temp.width = w;
          temp.height = h;
          const tctx = temp.getContext('2d');
          tctx.drawImage(img, 0, 0);
          const data = tctx.getImageData(0, 0, w, h).data;

          // Find the heart: pixels inside the circle radius (~45px from center (50,50)) where alpha < 128
          const out = ctx.createImageData(512, 512);
          const TARGET = 360;
          const scale = TARGET / w;
          const offset = (512 - TARGET) / 2;

          // 1. Draw crisp white outline ring for the circle badge
          ctx.beginPath();
          ctx.arc(256, 256, (TARGET / 2) - 8, 0, Math.PI * 2);
          ctx.lineWidth = 14;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // 2. Draw subtle dark glass inner fill
          ctx.beginPath();
          ctx.arc(256, 256, (TARGET / 2) - 15, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fill();

          // 3. Draw the solid white heart in the center
          // Extract heart mask:
          const heartTemp = document.createElement('canvas');
          heartTemp.width = w;
          heartTemp.height = h;
          const hctx = heartTemp.getContext('2d');
          const hData = hctx.createImageData(w, h);
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = (y * w + x) * 4;
              const distFromCenter = Math.hypot(x - 50, y - 50);
              const a = data[idx + 3];
              // Inside the circle (< 42px) where original icon has transparent cutout heart
              if (distFromCenter < 40 && a < 150) {
                hData.data[idx] = 255;
                hData.data[idx + 1] = 255;
                hData.data[idx + 2] = 255;
                hData.data[idx + 3] = 255;
              }
            }
          }
          hctx.putImageData(hData, 0, 0);

          // Draw the white heart scaled cleanly in center
          ctx.drawImage(heartTemp, offset, offset, TARGET, TARGET);

          document.body.setAttribute('data-done', 'true');
        };

        img.src = 'data:image/png;base64,${rawB64}';
      </script>
    </body>
    </html>
  `);

  await page.waitForSelector('body[data-done="true"]', { timeout: 10000 });
  const buf = await page.locator('#c').screenshot({ omitBackground: true });

  fs.writeFileSync('public/dock/watchlist.png', buf);
  fs.writeFileSync('public/icons/watchlist.png', buf);
  console.log('Generated perfect watchlist.png!');
  await browser.close();
}
main();

