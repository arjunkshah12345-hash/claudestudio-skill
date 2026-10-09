import { chromium } from 'playwright';
const [,, w, h, prefix, ...ys] = process.argv;
let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ channel: 'chrome' }); }
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://localhost:8731/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(2200);
const H = await page.evaluate(() => document.documentElement.scrollHeight);
const stops = ys.length ? ys.map(Number) : Array.from({ length: Math.ceil(H / +h) }, (_, i) => i * +h);
for (const y of stops) {
  await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `/tmp/sprout_shots/${prefix}-${String(y).padStart(5, '0')}.png` });
}
console.log('height', H, 'errors', JSON.stringify(errs));
await browser.close();
