// Usage: node gallery-shoot.mjs relay halden kestrel ostra
// Captures gallery assets for each build served at http://127.0.0.1:4317/tests/builds/<name>/
// → gallery/shots/<name>/{hero.jpg, full.jpg, mobile.jpg}
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const names = process.argv.slice(2);
const OUT = path.resolve('../gallery/shots');
let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ channel: 'chrome' }); }

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2200);
}
async function scrollAll(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 400) { await page.mouse.wheel(0, 400); await page.waitForTimeout(160); }
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(900);
}

for (const n of names) {
  const url = `http://127.0.0.1:4317/tests/builds/${n}/index.html`;
  const dir = path.join(OUT, n); fs.mkdirSync(dir, { recursive: true });
  // desktop hero @2x for crispness
  const c1 = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const p1 = await c1.newPage(); await p1.goto(url, { waitUntil: 'load' }); await settle(p1);
  await p1.screenshot({ path: path.join(dir, 'hero.jpg'), type: 'jpeg', quality: 82 });
  await c1.close();
  // full page @1x (reveal everything first)
  const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const p2 = await c2.newPage(); await p2.goto(url, { waitUntil: 'load' }); await settle(p2); await scrollAll(p2);
  await p2.screenshot({ path: path.join(dir, 'full.jpg'), type: 'jpeg', quality: 78, fullPage: true });
  const meta = await p2.evaluate(() => ({ title: document.title, vh: +(document.documentElement.scrollHeight / innerHeight).toFixed(1) }));
  await c2.close();
  // mobile hero @2x
  const c3 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p3 = await c3.newPage(); await p3.goto(url, { waitUntil: 'load' }); await settle(p3);
  await p3.screenshot({ path: path.join(dir, 'mobile.jpg'), type: 'jpeg', quality: 80 });
  await c3.close();
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta));
  console.log('shot', n, meta);
}
await browser.close();
