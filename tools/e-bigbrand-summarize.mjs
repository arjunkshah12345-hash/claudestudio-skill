// Usage: node tools/e-bigbrand-summarize.mjs <sitesDir> [slug...]
// Prints a compact digest of analyze.mjs data.json files (read-only helper).
import fs from 'node:fs';
import path from 'node:path';
const [, , dir, ...only] = process.argv;
const slugs = only.length ? only : fs.readdirSync(dir).filter((s) => fs.existsSync(path.join(dir, s, 'data.json')));
const top = (a, n = 8) => (a || []).slice(0, n).map((x) => (Array.isArray(x) ? `${x[0]}×${x[1]}` : JSON.stringify(x))).join(', ');
for (const s of slugs) {
  const p = path.join(dir, s, 'data.json');
  if (!fs.existsSync(p)) { console.log(`#### ${s}: NO DATA`); continue; }
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  const t = d.type || {}, c = d.color || {}, m = d.motion || {}, j = d.jsMotion || {};
  console.log(`\n#### ${s}  (${d.url})  len=${d.pageLengthInViewports}vp  title=${d.title}`);
  if (d.error) console.log('ERROR', d.error);
  console.log('fonts:', (t.loadedFonts || []).slice(0, 12).join(' | '));
  console.log('families:', top(t.families, 6));
  console.log('sizes:', top(t.sizes, 14));
  console.log('weights:', top(t.weights, 6), ' upper:', t.uppercaseShare);
  console.log('ls:', top(t.letterSpacings, 10));
  console.log('largest:', (t.largest || []).slice(0, 5).map((l) => `"${(l.text || '').slice(0, 40)}" ${l.family} ${l.size}/${l.lh} w${l.weight} ls${l.ls} ${l.tt} ${l.color}`).join('\n   '));
  console.log('text colors:', top(c.text, 8));
  console.log('bgs:', top(c.backgrounds, 10));
  console.log('beziers:', top(m.cubicBeziers, 8));
  console.log('durations:', top(m.durations, 10));
  console.log('keyframes:', (m.keyframes || []).slice(0, 12).join(','));
  console.log('jsMotion:', JSON.stringify({ e: j.gsapEases, ce: j.customEaseDefs, d: j.durations, st: j.staggers, l: j.lenis, sp: j.springs, ba: j.bezierArrays }).slice(0, 700));
  const libs = Object.entries(d.libs || {}).filter(([, v]) => v).map(([k, v]) => `${k}${v === true ? '' : ':' + v}`);
  console.log('libs:', libs.join(','), ' media:', JSON.stringify(d.media));
  console.log('effects:', JSON.stringify({ ...d.effects, fixed: undefined }).slice(0, 500));
  console.log('radii:', top(d.radii, 8), ' borders:', top(d.borders, 5));
  console.log('grids:', top(d.grids, 6), ' containers:', top(d.containers, 5), ' sideMargins:', top(d.sideMargins, 6));
  const vars = Object.entries(d.cssVarSample || {}).filter(([k]) => !/stack-level|onetrust|ot-/.test(k)).slice(0, 40).map(([k, v]) => `${k}:${String(v).slice(0, 50)}`);
  console.log('cssVars:', vars.join(' ; '));
  console.log('nav:', JSON.stringify(d.nav).slice(0, 400));
  console.log('ctas:', (d.ctas || []).slice(0, 7).map((b) => `[${b.text?.slice(0, 24)}|bg ${b.bg}|c ${b.color}|r ${b.radius}|p ${b.pad}|${b.size}/${b.weight}|${b.tt}|${b.border}|h${b.h}]`).join(' '));
  console.log('sections:', (d.sections || []).slice(0, 14).map((x) => `${x.h}px pt${x.padTop} ${x.bg}`).join(' / '));
  console.log('headings:', JSON.stringify((d.headings || []).slice(0, 18)).slice(0, 1400));
  console.log('paras:', JSON.stringify((d.paras || []).slice(0, 5)).slice(0, 900));
  const rest = Object.keys(d).filter((k) => !['url', 'slug', 'analyzedAt', 'scrollHeight', 'pageLengthInViewports', 'title', 'metaDescription', 'lang', 'type', 'color', 'motion', 'cssVarSample', 'libs', 'media', 'effects', 'radii', 'borders', 'grids', 'containers', 'sideMargins', 'sections', 'nav', 'ctas', 'headings', 'paras', 'footer', 'jsMotion'].includes(k));
  if (rest.length) console.log('other keys:', rest.map((k) => `${k}=${JSON.stringify(d[k]).slice(0, 300)}`).join('\n  '));
}
