import { chromium } from 'playwright-core';
import path from 'path';

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  
  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    console.log('Page loaded.');
    
    // Hover over logo to trigger animation
    await page.hover('.logo');
    await page.waitForTimeout(600); // let the staggered shapes appear
    
    // Save screenshot
    const screenshotPath = path.resolve('logo_shapes.png');
    await page.locator('.logo').screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to logo_shapes.png`);
  } catch (err) {
    console.log('Failed:', err.message);
  } finally {
    await browser.close();
  }
})();
