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
    
    // Click the search button to open the overlay
    console.log('Clicking search button...');
    await page.click('.nav-search-btn');
    
    // Wait for the GSAP animation (duration 0.8s) + a little buffer
    await page.waitForTimeout(1500);
    
    // Save screenshot
    const screenshotPath = path.resolve('search_popup_fixed.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot to search_popup_fixed.png`);
  } catch (err) {
    console.log('Failed:', err.message);
  } finally {
    await browser.close();
  }
})();
