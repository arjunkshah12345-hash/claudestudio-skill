// Helper for research/a-saas-studios (does not replace analyze.mjs).
// Usage: node asaas_probe.mjs <url> <outDir> [--shots N]
// Slow-scrolls (so scroll-triggered reveals actually fire), measures hero text sizes
// in the first viewport and every h1/h2 as it enters the viewport, and saves extra
// screenshots to <outDir>/<slug>/probe/.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const [, , url, outRoot, ...rest] = process.argv;
const si = rest.indexOf('--shots');
const MAX = si >= 0 ? parseInt(rest[si + 1], 10) : 10;
const slug = url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '').slice(0, 60);
const out = path.join(outRoot, slug, 'probe');
fs.mkdirSync(out, { recursive: true });
setTimeout(() => { console.log('timeout'); process.exit(2); }, 170000);

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' });
const page = await ctx.newPage();
const res = { url, hero: [], headings: {} };
const measureHeadings = () => page.evaluate(() => {
  const o = [];
  for (const h of document.querySelectorAll('h1,h2,h3,[class*="title" i],[class*="heading" i]')) {
    const r = h.getBoundingClientRect(); if (r.top < 0 || r.top > innerHeight || r.width === 0) continue;
    const s = getComputedStyle(h); const t = (h.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80); if (!t) continue;
    o.push({ tag: h.tagName.toLowerCase(), t, fam: s.fontFamily.split(',')[0].replace(/["']/g, ''), size: s.fontSize, w: s.fontWeight, lh: s.lineHeight, ls: s.letterSpacing, tt: s.textTransform, color: s.color, x: Math.round(r.left), width: Math.round(r.width) });
  }
  return o;
});
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(5000);
  for (const t of ['Accept', 'Accept all', 'Allow all', 'I agree', 'Agree', 'OK', 'Got it', 'Accept All Cookies', 'Accept cookies']) {
    const b = page.getByRole('button', { name: t, exact: true });
    if (await b.count().catch(() => 0)) { await b.first().click({ timeout: 1500 }).catch(() => {}); break; }
  }
  res.hero = await page.evaluate(() => {
    const els = [...document.querySelectorAll('body *')].filter(el => {
      const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
      const r = el.getBoundingClientRect(); return own.length > 1 && r.top < innerHeight && r.bottom > 0 && r.width > 0;
    });
    const seen = new Set(); const o = [];
    for (const el of els.sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize))) {
      const blk = el.closest('h1,h2,p,a,button,span,div') || el; const t = (blk.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 90);
      if (seen.has(t)) continue; seen.add(t);
      const s = getComputedStyle(el); const r = el.getBoundingClientRect();
      o.push({ tag: el.tagName.toLowerCase(), t, fam: s.fontFamily.split(',')[0].replace(/["']/g, ''), size: s.fontSize, w: s.fontWeight, lh: s.lineHeight, ls: s.letterSpacing, tt: s.textTransform, color: s.color, x: Math.round(r.left), y: Math.round(r.top), opacity: s.opacity });
      if (o.length >= 10) break;
    }
    return o;
  });
  res.h1 = await page.evaluate(() => [...document.querySelectorAll('h1')].map(h => {
    // measure the largest descendant font-size (split-text chars are single-letter spans)
    let big = h; for (const d of h.querySelectorAll('*')) if (parseFloat(getComputedStyle(d).fontSize) > parseFloat(getComputedStyle(big).fontSize)) big = d;
    const s = getComputedStyle(big); const r = h.getBoundingClientRect();
    return { t: (h.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 90), fam: s.fontFamily.split(',')[0].replace(/["']/g, ''), size: s.fontSize, w: s.fontWeight, lh: s.lineHeight, ls: s.letterSpacing, tt: s.textTransform, color: s.color, x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
  }));
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  res.scrollHeight = H;
  const every = Math.max(900, Math.floor(H / MAX));
  let y = 0, next = every, n = 1;
  while (y < H - 900 && n <= MAX) {
    await page.mouse.wheel(0, 300); y += 300; await page.waitForTimeout(450);
    for (const h of await measureHeadings()) if (!res.headings[h.t]) res.headings[h.t] = h;
    if (y >= next) { await page.waitForTimeout(1300); await page.screenshot({ path: path.join(out, `p${String(n).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 55 }); n++; next += every; }
  }
  res.headings = Object.values(res.headings).slice(0, 40);
} catch (e) { res.error = String(e).slice(0, 300); }
fs.writeFileSync(path.join(out, 'probe.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ ok: !res.error, out }));
await Promise.race([browser.close(), new Promise(r => setTimeout(r, 3000))]);
process.exit(0);
