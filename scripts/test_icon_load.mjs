import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = 'C:/Users/deadl/.gemini/antigravity/brain/644183de-b612-4613-945c-efd17e06a75e/.user_uploaded';
const catPath = path.join(UPLOAD_DIR, 'media_1794204199572_6e1f012b.png');
console.log('Exists:', fs.existsSync(catPath), 'size:', fs.statSync(catPath).size);

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', m => console.log('LOG:', m.text()));
  page.on('pageerror', e => console.log('ERR:', e.message));

  const rawB64 = fs.readFileSync(catPath).toString('base64');
  await page.setContent(`
    <script>
      const img = new Image();
      img.onload = () => console.log('IMG LOADED OK width=' + img.width + ' height=' + img.height);
      img.onerror = (e) => console.log('IMG ERROR');
      img.src = 'data:image/png;base64,${rawB64}';
    </script>
  `);
  await page.waitForTimeout(1000);
  await browser.close();
}
test();

