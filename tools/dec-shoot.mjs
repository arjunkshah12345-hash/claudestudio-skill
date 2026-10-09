// d-editorial-craft helper: supplemental screenshots for sites whose intro gates/stalls the main analyzer.
// usage: node dec-shoot.mjs <url> <outDir> [--wait ms] [--click x,y|text] [--shots N] [--step px] [--mobile]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const [, , url, out, ...rest] = process.argv;
const arg = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
const wait = +arg('--wait', 8000), shots = +arg('--shots', 10), step = +arg('--step', 900), click = arg('--click', null);
const mobile = rest.includes('--mobile');
fs.mkdirSync(out, { recursive: true });
setTimeout(() => { console.log('timeout'); process.exit(2); }, 170000);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile,
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' });
const page = await ctx.newPage();
const pre = mobile ? 'xm' : 'x';
await page.goto(url, { waitUntil: 'load', timeout: 60000 }).catch(e => console.log('goto', e.message));
const t0 = Date.now();
for (const t of [600, 1500, 2500, 4000, 6000]) { await page.waitForTimeout(Math.max(0, t - (Date.now() - t0))); await page.screenshot({ path: path.join(out, `${pre}-intro-${t}ms.jpg`), type: 'jpeg', quality: 55 }).catch(() => {}); }
await page.waitForTimeout(Math.max(0, wait - (Date.now() - t0)));
if (click) {
  if (/^\d+,\d+$/.test(click)) { const [x, y] = click.split(',').map(Number); await page.mouse.click(x, y); }
  else await page.getByText(click, { exact: false }).first().click({ timeout: 4000 }).catch(e => console.log('click', e.message));
  await page.waitForTimeout(4000);
}
for (const t of ['Accept', 'Accept all', 'Allow all', 'I agree', 'Agree', 'OK', 'Got it', 'Accept All Cookies']) {
  const b = page.getByRole('button', { name: t, exact: true }); if (await b.count().catch(() => 0)) { await b.first().click({ timeout: 1500 }).catch(() => {}); break; }
}
await page.mouse.move(700, 450);
await page.screenshot({ path: path.join(out, `${pre}-00-hero.jpg`), type: 'jpeg', quality: 62 });
for (let i = 1; i <= shots; i++) {
  for (let k = 0; k < step / 150; k++) { if (mobile) await page.evaluate(() => window.scrollBy(0, 150)); else await page.mouse.wheel(0, 150); await page.waitForTimeout(90); }
  await page.waitForTimeout(1300);
  await page.screenshot({ path: path.join(out, `${pre}-${String(i).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 62 });
}
console.log('done', out);
await browser.close(); process.exit(0);
