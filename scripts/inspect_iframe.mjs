import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await page.setContent(`
    <iframe
      width="640"
      height="360"
      src="https://www.youtube.com/embed/7H4SOzsX8m4?autoplay=1&mute=1&controls=1&enablejsapi=1&origin=http://localhost:5173"
      referrerpolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    ></iframe>
  `);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'C:/Users/deadl/.gemini/antigravity/brain/644183de-b612-4613-945c-efd17e06a75e/test_yt_origin.png' });
  await browser.close();
  console.log('Saved test_yt_origin.png');
}
test();
