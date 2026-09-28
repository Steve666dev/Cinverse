import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    
    // Wait for the intro loader to fade out
    await page.waitForTimeout(3000);
    
    // Take screenshot of the top nav
    await page.screenshot({ path: 'C:\\Users\\deadl\\.gemini\\antigravity-ide\\brain\\6ae96ec2-ab5c-471f-a391-5be8e3c384b0\\glass_effect_header.png' });
    console.log('Saved screenshot to glass_effect_header.png');
    
  } catch (err) {
    console.log('Failed to capture:', err.message);
  }
  
  await browser.close();
})();
