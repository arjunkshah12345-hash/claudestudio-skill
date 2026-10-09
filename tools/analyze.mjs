// Usage: node analyze.mjs <url> <outDir> [--shots N]
// Loads a live site in headless Chrome, scrolls through it with real wheel events
// (so Lenis/Locomotive/GSAP ScrollTrigger fire), captures viewport screenshots
// and extracts measurable design data (type, color, easing, layout, libs, copy).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const [, , url, outRoot, ...rest] = process.argv;
if (!url || !outRoot) { console.error('usage: node analyze.mjs <url> <outDir> [--shots N]'); process.exit(1); }
const shotsArg = rest.indexOf('--shots');
const MAX_SHOTS = shotsArg >= 0 ? parseInt(rest[shotsArg + 1], 10) : 7;
const slug = url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '').slice(0, 60);
const out = path.join(outRoot, slug);
fs.mkdirSync(path.join(out, 'shots'), { recursive: true });

setTimeout(() => { console.log(JSON.stringify({ ok: false, out, error: 'global timeout 150s' })); process.exit(2); }, 150000);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
});
const page = await ctx.newPage();
const result = { url, slug, analyzedAt: new Date().toISOString() };
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  // intro choreography frames (preloader / hero reveal)
  for (const [i, t] of [[1, 350], [2, 900], [3, 1800], [4, 3200]]) {
    await page.waitForTimeout(t - ([0, 0, 350, 900, 1800][i] || 0));
    await page.screenshot({ path: path.join(out, 'shots', `intro-${i}-${t}ms.jpg`), type: 'jpeg', quality: 45 }).catch(() => {});
  }
  await page.waitForTimeout(2300);
  // try to dismiss cookie banners
  for (const t of ['Accept', 'Accept all', 'Allow all', 'I agree', 'Agree', 'OK', 'Got it', 'Accept All Cookies', 'Accept cookies']) {
    const b = page.getByRole('button', { name: t, exact: true });
    if (await b.count().catch(() => 0)) { await b.first().click({ timeout: 1500 }).catch(() => {}); break; }
  }
  await page.mouse.move(720, 450);
  await page.screenshot({ path: path.join(out, 'shots', '00-hero.jpg'), type: 'jpeg', quality: 62 });

  const totalH = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0));
  result.scrollHeight = totalH;
  result.pageLengthInViewports = +(totalH / 900).toFixed(1);
  // scroll through the whole page with wheel events, snapshot at spaced intervals
  const steps = Math.min(60, Math.max(4, Math.ceil(totalH / 450)));
  const shotEvery = Math.max(1, Math.floor(steps / MAX_SHOTS));
  let shot = 1;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.wheel(0, 450);
    await page.waitForTimeout(350);
    if (i % shotEvery === 0 && shot < MAX_SHOTS) {
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(out, 'shots', `${String(shot).padStart(2, '0')}-scroll.jpg`), type: 'jpeg', quality: 62 });
      shot++;
    }
  }
  await page.waitForTimeout(800);

  Object.assign(result, await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
    const all = [...document.querySelectorAll('body *')].slice(0, 6000);
    const count = (arr) => { const m = {}; for (const v of arr) if (v) m[v] = (m[v] || 0) + 1; return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    const ownText = (el) => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    const txt = all.filter(el => ownText(el).length > 1 && vis(el));
    const typo = (el) => { const s = getComputedStyle(el); return { tag: el.tagName.toLowerCase(), text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 90), family: s.fontFamily.split(',')[0].replace(/["']/g, ''), size: s.fontSize, weight: s.fontWeight, lh: s.lineHeight, ls: s.letterSpacing, tt: s.textTransform, style: s.fontStyle, color: s.color }; };

    const bySize = [...txt].sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize));
    const seen = new Set(); const largest = [];
    for (const el of bySize) { const t = typo(el); const k = t.text.slice(0, 30); if (seen.has(k)) continue; seen.add(k); largest.push(t); if (largest.length >= 12) break; }

    const families = count(txt.map(el => getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim()));
    const sizes = count(txt.map(el => Math.round(parseFloat(getComputedStyle(el).fontSize)) + 'px'));
    const weights = count(txt.map(el => getComputedStyle(el).fontWeight));
    const letterSpacings = count(txt.map(el => { const s = getComputedStyle(el); return s.letterSpacing === 'normal' ? 'normal' : (parseFloat(s.letterSpacing) / parseFloat(s.fontSize)).toFixed(3) + 'em@' + Math.round(parseFloat(s.fontSize)); })).slice(0, 15);
    const uppercaseShare = +(txt.filter(el => getComputedStyle(el).textTransform === 'uppercase').length / Math.max(1, txt.length)).toFixed(2);
    const loadedFonts = [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family.replace(/["']/g, '')} ${f.weight} ${f.style}`))].slice(0, 30);

    const colors = count(txt.map(el => getComputedStyle(el).color)).slice(0, 10);
    const bgs = count(all.filter(vis).map(el => getComputedStyle(el).backgroundColor).filter(c => c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent')).slice(0, 12);
    const bodyBg = getComputedStyle(document.body).backgroundColor; const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
    const gradients = count(all.map(el => { const b = getComputedStyle(el).backgroundImage; return b.includes('gradient') ? b.slice(0, 140) : null; })).slice(0, 6);

    // easing + durations from stylesheets and computed styles
    const beziers = {}; const durations = {}; const keyframes = [];
    for (const ss of [...document.styleSheets]) { let rules; try { rules = ss.cssRules; } catch { continue; } const walk = (rs) => { for (const r of rs) { if (r.cssRules && !(r instanceof CSSKeyframesRule)) walk(r.cssRules); if (r instanceof CSSKeyframesRule) keyframes.push(r.name); const t = r.cssText || ''; for (const m of t.matchAll(/cubic-bezier\([^)]+\)/g)) beziers[m[0].replace(/\s/g, '')] = (beziers[m[0].replace(/\s/g, '')] || 0) + 1; for (const m of t.matchAll(/(?:transition|animation)(?:-duration)?:[^;]*?(\d*\.?\d+m?s)/g)) durations[m[1]] = (durations[m[1]] || 0) + 1; } }; walk(rules); }
    const cssVars = {}; for (const ss of [...document.styleSheets]) { let rules; try { rules = ss.cssRules; } catch { continue; } for (const r of rules) { if (r.selectorText === ':root' || r.selectorText === 'html' || r.selectorText === ':root, :host') { for (const p of r.style) if (p.startsWith('--')) cssVars[p] = r.style.getPropertyValue(p).trim().slice(0, 80); } } }
    const cssVarSample = Object.fromEntries(Object.entries(cssVars).slice(0, 70));

    const w = window; const html = document.documentElement.outerHTML.slice(0, 400000);
    const libs = {
      gsap: !!w.gsap || /gsap/i.test(html), scrollTrigger: !!w.ScrollTrigger || /ScrollTrigger/.test(html), lenis: !!w.lenis || !!w.Lenis || document.documentElement.classList.contains('lenis') || /lenis/i.test(document.documentElement.className),
      locomotive: /has-scroll-smooth|data-scroll-container|locomotive/i.test(html), three: !!w.THREE || /three(\.module)?(\.min)?\.js|THREE\./.test(html), webglCanvas: [...document.querySelectorAll('canvas')].filter(c => { try { return !!(c.getContext('webgl2') || c.getContext('webgl')) && false; } catch { return false; } }).length, canvases: document.querySelectorAll('canvas').length,
      barba: /data-barba/.test(html), swup: /swup/i.test(html), framer: /data-framer|framerusercontent|framer\.com\/m\//i.test(html), webflow: /data-wf-page|website-files\.com/i.test(html), next: !!document.getElementById('__NEXT_DATA__') || /_next\/static/.test(html), nuxt: /__NUXT__|_nuxt\//.test(html), astro: /astro-island|_astro\//.test(html), sveltekit: /__sveltekit|_app\/immutable/.test(html), shopify: /cdn\.shopify|Shopify\./.test(html), splitText: /SplitText|split-text|splitting|data-split|class="(?:[^"]*\s)?(?:word|char|line)s?\b/i.test(html), rive: /rive/i.test(html) && /\.riv\b|@rive-app/.test(html), lottie: /lottie-player|dotlottie|bodymovin|lottie(\.min)?\.js|lottie-web/i.test(html), spline: /spline/i.test(html) && /splinecode|spline-viewer/.test(html), r3f: /react-three|@react-three/.test(html), ogl: /\bogl\b/.test(html), theatre: /theatre/i.test(html), motionOne: /framer-motion|motion\.dev/.test(html),
    };
    const media = { img: document.images.length, video: document.querySelectorAll('video').length, svg: document.querySelectorAll('svg').length, picture: document.querySelectorAll('picture').length, iframes: document.querySelectorAll('iframe').length };

    const effects = {
      mixBlend: count(all.map(el => getComputedStyle(el).mixBlendMode).filter(v => v !== 'normal')),
      backdropFilter: all.filter(el => (getComputedStyle(el).backdropFilter || 'none') !== 'none').length,
      clipPath: all.filter(el => getComputedStyle(el).clipPath !== 'none').length,
      sticky: all.filter(el => getComputedStyle(el).position === 'sticky').length,
      fixed: all.filter(el => getComputedStyle(el).position === 'fixed' && vis(el)).map(el => (el.className && el.className.baseVal === undefined ? String(el.className) : el.tagName).slice(0, 60)).slice(0, 10),
      customCursor: getComputedStyle(document.body).cursor === 'none' || !!document.querySelector('[class*="cursor" i]'),
      boxShadows: count(all.filter(vis).map(el => getComputedStyle(el).boxShadow).filter(v => v !== 'none')).slice(0, 5),
      filters: count(all.map(el => getComputedStyle(el).filter).filter(v => v !== 'none')).slice(0, 5),
      transforms3d: all.filter(el => /matrix3d|perspective/.test(getComputedStyle(el).transform + getComputedStyle(el).perspective)).length,
      noiseOrGrain: /noise|grain/i.test(html),
      textStroke: all.filter(el => parseFloat(getComputedStyle(el).webkitTextStrokeWidth) > 0).length,
      backgroundClipText: all.filter(el => getComputedStyle(el).backgroundClip === 'text' || getComputedStyle(el).webkitBackgroundClip === 'text').length,
    };

    const radii = count(all.filter(el => vis(el) && (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'BUTTON' || el.tagName === 'A' || getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)')).map(el => getComputedStyle(el).borderRadius).filter(r => r !== '0px')).slice(0, 8);
    const borders = count(all.filter(vis).map(el => { const s = getComputedStyle(el); const w = s.borderTopWidth !== '0px' ? s.borderTop : (s.borderBottomWidth !== '0px' ? 'bottom:' + s.borderBottom : null); return w; })).slice(0, 6);
    const grids = count(all.filter(el => getComputedStyle(el).display === 'grid').map(el => getComputedStyle(el).gridTemplateColumns.split(' ').length + 'cols gap ' + getComputedStyle(el).columnGap)).slice(0, 8);
    const containers = count(all.filter(el => { const s = getComputedStyle(el); return s.maxWidth !== 'none' && el.getBoundingClientRect().width > 700; }).map(el => getComputedStyle(el).maxWidth)).slice(0, 6);
    const main = document.querySelector('main') || document.body;
    const sideMargins = count([...main.querySelectorAll('h1,h2,h3,p')].filter(vis).map(el => Math.round(el.getBoundingClientRect().left) + 'px')).slice(0, 6);
    const sections = [...document.querySelectorAll('section, main > div, [class*="section" i]')].filter(vis).slice(0, 40).map(s => ({ cls: String(s.className && s.className.baseVal === undefined ? s.className : '').slice(0, 50), h: Math.round(s.getBoundingClientRect().height), padTop: getComputedStyle(s).paddingTop, bg: getComputedStyle(s).backgroundColor }));
    const header = document.querySelector('header, nav');
    const nav = header ? { tag: header.tagName, position: getComputedStyle(header).position, height: Math.round(header.getBoundingClientRect().height), links: header.querySelectorAll('a').length, linkTexts: [...header.querySelectorAll('a,button')].map(a => a.innerText.trim()).filter(Boolean).slice(0, 14), bg: getComputedStyle(header).backgroundColor, mixBlend: getComputedStyle(header).mixBlendMode } : null;
    const ctas = [...document.querySelectorAll('a, button')].filter(el => { const s = getComputedStyle(el); return vis(el) && (s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.borderTopWidth !== '0px') && el.innerText.trim().length > 1 && el.innerText.trim().length < 40; }).slice(0, 10).map(el => { const s = getComputedStyle(el); return { text: el.innerText.trim().replace(/\s+/g, ' '), bg: s.backgroundColor, color: s.color, radius: s.borderRadius, pad: s.padding, size: s.fontSize, weight: s.fontWeight, tt: s.textTransform, border: s.borderTopWidth !== '0px' ? s.borderTop : 'none', h: Math.round(el.getBoundingClientRect().height) }; });
    const headings = [...document.querySelectorAll('h1,h2,h3')].map(h => h.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 25);
    const paras = [...document.querySelectorAll('p')].map(p => p.innerText.trim().replace(/\s+/g, ' ')).filter(t => t.length > 30).slice(0, 10).map(t => t.slice(0, 220));
    const footer = document.querySelector('footer'); const footerInfo = footer ? { h: Math.round(footer.getBoundingClientRect().height), text: footer.innerText.replace(/\s+/g, ' ').slice(0, 300) } : null;
    return {
      title: document.title, metaDescription: document.querySelector('meta[name="description"]')?.content || null, lang: document.documentElement.lang,
      type: { loadedFonts, families: families.slice(0, 8), sizes: sizes.slice(0, 16), weights, letterSpacings, uppercaseShare, largest },
      color: { bodyBg, htmlBg, text: colors, backgrounds: bgs, gradients },
      motion: { cubicBeziers: Object.entries(beziers).sort((a, b) => b[1] - a[1]).slice(0, 12), durations: Object.entries(durations).sort((a, b) => b[1] - a[1]).slice(0, 10), keyframes: [...new Set(keyframes)].slice(0, 20) },
      cssVarSample, libs, media, effects, radii, borders, grids, containers, sideMargins, sections, nav, ctas, headings, paras, footer: footerInfo,
    };
  }));
  // motion config mined from JS bundles (GSAP eases/durations/staggers, Lenis, Framer Motion springs)
  result.jsMotion = await page.evaluate(async () => {
    const srcs = [...document.scripts].map(s => s.src).filter(Boolean).slice(0, 25);
    const inline = [...document.scripts].filter(s => !s.src).map(s => s.textContent).join('\n').slice(0, 500000);
    let code = inline; let fetched = 0;
    for (const src of srcs) { try { const r = await fetch(src); if (r.ok) { code += '\n' + (await r.text()).slice(0, 3000000); fetched++; } } catch {} }
    const tally = (re, max = 15) => { const m = {}; for (const x of code.matchAll(re)) { const k = x[1]; m[k] = (m[k] || 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, max); };
    return {
      scriptsFetched: fetched,
      gsapEases: tally(/ease:\s*["'`]((?:power[0-4]|expo|circ|quart|quint|cubic|sine|back|elastic|bounce|custom|none|linear)[a-zA-Z.]*(?:\([^)]*\))?)["'`]/g),
      customEaseDefs: tally(/CustomEase\.create\(\s*["'`]([^"'`]+)["'`]\s*,\s*["'`][^"'`]{0,80}/g),
      durations: tally(/duration:\s*(\d*\.?\d+)\b/g),
      staggers: tally(/stagger:\s*(\{[^}]{0,60}\}|\d*\.?\d+)/g, 10),
      lenis: tally(/(lerp:\s*\d*\.?\d+|wheelMultiplier:\s*\d*\.?\d+|smoothWheel:\s*!?\w+)/g, 8),
      springs: tally(/(stiffness:\s*\d+[^}]{0,40}damping:\s*\d+|type:\s*["']spring["'][^}]{0,60})/g, 8),
      scrollTriggerStarts: tally(/start:\s*["'`]([a-z0-9%+\-= ]{3,30})["'`]/g, 10),
      splitTypes: tally(/(?:type|types):\s*["'`]((?:chars|words|lines)(?:\s*,\s*(?:chars|words|lines))*)["'`]/g, 6),
      bezierArrays: tally(/ease:\s*(\[\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*\])/g, 10),
    };
  }).catch(e => ({ error: String(e).slice(0, 200) }));
  // mobile hero
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0)); await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(4500);
  await page.screenshot({ path: path.join(out, 'shots', '90-mobile-hero.jpg'), type: 'jpeg', quality: 60 });
} catch (e) { result.error = String(e).slice(0, 400); }
fs.writeFileSync(path.join(out, 'data.json'), JSON.stringify(result, null, 1));
console.log(JSON.stringify({ ok: !result.error, out, error: result.error || undefined }));
await Promise.race([browser.close(), new Promise(r => setTimeout(r, 3000))]);
process.exit(0);
