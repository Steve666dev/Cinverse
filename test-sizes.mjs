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
    
    // Inject custom DOM to test sizes
    await page.evaluate(() => {
      const sizes = ['1.2rem', '1.25rem', '1.3rem', '1.35rem', '1.4rem'];
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '100px';
      container.style.left = '50px';
      container.style.background = '#000';
      container.style.padding = '20px';
      container.style.zIndex = '9999';
      
      sizes.forEach(size => {
        const row = document.createElement('div');
        row.style.fontFamily = 'Bebas Neue, sans-serif';
        row.style.fontSize = '1.8rem';
        row.style.color = '#fff';
        row.style.marginBottom = '20px';
        
        row.innerHTML = `
          <span>Size ${size}: </span>
          <span>C I </span>
          <span style="font-size: ${size}; font-family: system-ui;">▲</span>
          <span> E </span>
          <span style="font-size: ${size}; font-family: system-ui;">◆</span>
          <span> E </span>
          <span style="font-size: ${size}; font-family: system-ui;">●</span>
          <span> S E</span>
        `;
        container.appendChild(row);
      });
      
      document.body.appendChild(container);
    });
    
    // Save screenshot
    const screenshotPath = path.resolve('size_test.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to size_test.png`);
  } catch (err) {
    console.log('Failed:', err.message);
  } finally {
    await browser.close();
  }
})();
