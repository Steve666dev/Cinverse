import { chromium } from 'playwright';
import fs from 'fs';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const b64 = fs.readFileSync('C:/Users/deadl/.gemini/antigravity/brain/644183de-b612-4613-945c-efd17e06a75e/.user_uploaded/media_1794204199573_c7f823c1.png').toString('base64');
  await page.setContent('<img id="img" src="data:image/png;base64,' + b64 + '">');
  const res = await page.evaluate(() => {
    const img = document.getElementById('img');
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const center = Array.from(ctx.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data);
    const edge = Array.from(ctx.getImageData(10, 10, 1, 1).data);
    const circleEdge = Array.from(ctx.getImageData(Math.floor(c.width / 2), 20, 1, 1).data);
    return { width: c.width, height: c.height, center, edge, circleEdge };
  });
  console.log('Result:', res);
  await browser.close();
}
test();

