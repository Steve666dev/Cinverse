import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/deadl/.gemini/antigravity/brain/644183de-b612-4613-945c-efd17e06a75e';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // 1. Wait for dock to be visible
  await page.waitForSelector('.apple-glass-dock', { timeout: 10000 });
  console.log('Found apple-glass-dock');

  // Capture Dock resting state
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dock_4_items_resting.png') });
  console.log('Saved dock_4_items_resting.png');

  // Inspect the dock items
  const dockLabels = await page.$$eval('.apple-glass-dock [role="tooltip"], .apple-glass-dock .dock-item', els => 
    els.map(el => el.textContent?.trim()).filter(Boolean)
  );
  console.log('Dock item elements found:', dockLabels);

  const dockImgs = await page.$$eval('.apple-glass-dock img', imgs => 
    imgs.map(img => ({ src: img.getAttribute('src'), alt: img.getAttribute('alt') }))
  );
  console.log('Dock images found:', dockImgs);

  // 2. Click Categories icon in the dock
  const categoriesItem = page.locator('.apple-glass-dock .dock-item:has(img[alt="Categories"])');
  await categoriesItem.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dock_click_categories.png') });
  console.log('Saved dock_click_categories.png');

  // Close popup
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // 3. Click Languages icon in the dock
  const languagesItem = page.locator('.apple-glass-dock .dock-item:has(img[alt="Languages"])');
  await languagesItem.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dock_click_languages.png') });
  console.log('Saved dock_click_languages.png');

  // Close popup
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // 4. Click Search icon in the dock
  const searchItem = page.locator('.apple-glass-dock .dock-item:has(img[alt="Search"])');
  await searchItem.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dock_click_search.png') });
  console.log('Saved dock_click_search.png');

  // Close popup
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // 5. Test Trailer Playing
  // Find TRAILER button or click CD
  console.log('Testing trailer playback...');
  const trailerBtn = page.locator('.a24-btn-trailer');
  await trailerBtn.waitFor({ state: 'visible', timeout: 8000 });
  await trailerBtn.click();
  await page.waitForTimeout(1000);

  // Verify modal is open and has iframe
  const modalVisible = await page.isVisible('.a24-trailer-modal-backdrop');
  console.log('Trailer modal open:', modalVisible);
  const iframeSrc = await page.getAttribute('.a24-trailer-video-frame iframe', 'src');
  console.log('Trailer iframe src:', iframeSrc);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'trailer_modal_playing.png') });
  console.log('Saved trailer_modal_playing.png');

  await browser.close();
  console.log('All tests completed successfully!');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

