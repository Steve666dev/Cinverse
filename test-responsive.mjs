import { chromium } from 'playwright-core';
import path from 'path';

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  
  const sizes = [
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' }
  ];
  
  for (const size of sizes) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    
    try {
      await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000); // wait for initial animations
      
      const screenshotPath = path.resolve(`responsive_${size.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Saved screenshot for ${size.name}`);
    } catch (err) {
      console.log('Failed:', err.message);
    }
    await context.close();
  }
  
  await browser.close();
})();
