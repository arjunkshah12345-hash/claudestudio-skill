import { chromium } from 'playwright';
const [,, w, h, js] = process.argv;
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.goto('http://localhost:8731/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
console.log(JSON.stringify(await page.evaluate(js), null, 0));
await browser.close();
