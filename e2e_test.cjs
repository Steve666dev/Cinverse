const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('Launching Playwright Chromium...');
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000); // Wait for React to render

  // 1. Test GSAP Logo Hover
  console.log('Testing GSAP Logo Hover...');
  const logo = await page.locator('text=CINEVERSE').first();
  await logo.hover();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(__dirname, 'logo_hover.png') });
  console.log('Saved logo_hover.png');

  // 2. Test Dock Tooltips
  console.log('Testing Dock Magnification and Tooltips...');
  const dockHome = await page.locator('text=Home').locator('..').first(); 
  if (await dockHome.isVisible()) {
    await dockHome.hover();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(__dirname, 'dock_hover.png') });
    console.log('Saved dock_hover.png');
  }

  console.log('Testing complete. Closing browser.');
  await browser.close();
})();
