// Compact printer for analyze.mjs data.json (d-editorial-craft helper). Usage: node dec-summarize.mjs <data.json>...
import fs from 'node:fs';
for (const f of process.argv.slice(2)) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const j = (v, n = 600) => JSON.stringify(v ?? null).slice(0, n);
  const t = d.type || {};
  console.log(`\n######## ${d.url}  (${d.pageLengthInViewports} vh)  title: ${d.title}`);
  console.log('fonts:', j(t.loadedFonts, 500));
  console.log('families:', j(t.families, 300), '| sizes:', j(t.sizes, 300));
  console.log('weights:', j(t.weights, 200), '| upper:', t.uppercaseShare);
  console.log('ls:', j(t.letterSpacings, 500));
  for (const l of (t.largest || []).slice(0, 9)) console.log(`  L ${l.size}/${l.lh} w${l.weight} ls${l.ls} ${l.tt} ${l.style} ${l.family} ${l.color} <${l.tag}> "${l.text.slice(0, 60)}"`);
  console.log('colors:', j(d.color, 700));
  console.log('beziers:', j(d.motion?.cubicBeziers, 500), '| dur:', j(d.motion?.durations, 300));
  console.log('keyframes:', j(d.motion?.keyframes, 400));
  console.log('libs:', Object.entries(d.libs || {}).filter(([, v]) => v).map(([k, v]) => k + (v === true ? '' : '=' + v)).join(','));
  console.log('media:', j(d.media), '| effects:', j(d.effects, 400));
  console.log('radii:', j(d.radii, 150), '| borders:', j(d.borders, 200));
  console.log('grids:', j(d.grids, 300), '| containers:', j(d.containers, 200), '| sideMargins:', j(d.sideMargins, 200));
  console.log('nav:', j(d.nav, 500));
  console.log('ctas:', j((d.ctas || []).slice(0, 4), 900));
  console.log('headings:', j((d.headings || []).slice(0, 18), 1200));
  console.log('paras:', j((d.paras || []).slice(0, 4), 900));
  console.log('footer:', j(d.footer, 400));
  console.log('jsMotion:', j(d.jsMotion, 1400));
  console.log('sections:', (d.sections || []).slice(0, 14).map(s => `${(s.cls || '').slice(0, 30)}:${s.h}:${s.bg}`).join(' | '));
}
