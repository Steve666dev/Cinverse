import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function generate() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 512, height: 512 });

  // Read the original uploaded image as base64
  const originalWatchlistB64 = fs.readFileSync('C:/Users/deadl/.gemini/antigravity/brain/644183de-b612-4613-945c-efd17e06a75e/.user_uploaded/media_1794204199572_5be1f95e.png').toString('base64');

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 0; background: transparent; display: flex; align-items: center; justify-content: center; width: 512px; height: 512px; }
        canvas { width: 512px; height: 512px; }
      </style>
    </head>
    <body>
      <canvas id="c" width="512" height="512"></canvas>
      <script>
        const canvas = document.getElementById('c');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          // Draw subtle stylish glass circle outline
          ctx.beginPath();
          ctx.arc(256, 256, 186, 0, Math.PI * 2);
          ctx.fillStyle = '#0f1115';
          ctx.fill();
          ctx.lineWidth = 14;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // Draw the image
          ctx.drawImage(img, 66, 66, 380, 380);
        };
        img.src = 'data:image/png;base64,${originalWatchlistB64}';
      </script>
    </body>
    </html>
  `);

  await page.waitForTimeout(500);
  const buffer = await page.locator('#c').screenshot({ omitBackground: true });
  fs.writeFileSync('public/dock/watchlist.png', buffer);
  fs.writeFileSync('public/icons/watchlist.png', buffer);
  console.log('Successfully regenerated enhanced public/dock/watchlist.png with clean white border ring!');

  await browser.close();
}
generate();
