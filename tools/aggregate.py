"""Aggregate every research/*/sites/*/data.json into cross-site design statistics.
Usage: python3 -I tools/aggregate.py "<root>/research" > research/AGGREGATE.md
"""
import json, os, re, sys
from collections import Counter
from statistics import median

root = sys.argv[1]
rows = []
for cluster in sorted(os.listdir(root)):
    sd = os.path.join(root, cluster, 'sites')
    if cluster.startswith('_') or not os.path.isdir(sd):
        continue
    for slug in sorted(os.listdir(sd)):
        p = os.path.join(sd, slug, 'data.json')
        if os.path.exists(p):
            try:
                d = json.load(open(p))
            except Exception:
                continue
            if d.get('type'):
                d['_cluster'] = cluster
                rows.append(d)

px = lambda s: float(re.sub(r'[^\d.]', '', s) or 0) if isinstance(s, str) else 0
GENERIC = {'system-ui', '-apple-system', 'sans-serif', 'serif', 'Times', 'Arial', 'Helvetica', 'monospace'}

def pct(vals, q):
    v = sorted(vals); return v[min(len(v) - 1, int(q * len(v)))] if v else None

fam, eases, gsap, springs, libs, radii, display, body, ls_display, uc, bg_lum, fonts_by_cluster = Counter(), Counter(), Counter(), Counter(), Counter(), Counter(), [], [], [], [], [], {}
lh_ratio, pagelen, h1_words, n_fams = [], [], [], []
out = []
for d in rows:
    t = d['type']
    fams = [f for f, _ in t['families'] if f and f not in GENERIC][:3]
    n_fams.append(len([f for f, c in t['families'] if c >= 3 and f not in GENERIC]))
    for f in fams: fam[f] += 1
    fonts_by_cluster.setdefault(d['_cluster'], Counter()).update(fams[:2])
    big = [x for x in t['largest'] if x['text'] and len(x['text']) > 3]
    if big:
        b = big[0]; s = px(b['size']); display.append(s)
        if b['ls'] != 'normal' and s: ls_display.append(round(px(b['ls']) * (-1 if '-' in b['ls'] else 1) / s, 3))
        else: ls_display.append(0.0)
        if b['lh'] != 'normal' and s: lh_ratio.append(round(px(b['lh']) / s, 2))
        h1 = next((x for x in t['largest'] if x['tag'] == 'h1'), None)
        if h1: h1_words.append(len(h1['text'].split()))
    # body size: most common size among 14-20px
    for s, c in t['sizes']:
        if 14 <= px(s) <= 21: body.append(px(s)); break
    uc.append(t['uppercaseShare'])
    for e, c in d['motion']['cubicBeziers']: eases[e] += 1
    jm = d.get('jsMotion') or {}
    for e, c in jm.get('gsapEases', []): gsap[e] += 1
    for e, c in jm.get('bezierArrays', []): eases['js' + e] += 1
    for e, c in jm.get('springs', [])[:3]: springs[e[:60]] += 1
    for k, v in d['libs'].items():
        if v and k not in ('webglCanvas',): libs[k] += 1
    for r, c in d.get('radii', [])[:3]: radii[r] += 1
    m = re.findall(r'[\d.]+', d['color']['bodyBg'])
    if m and len(m) >= 3 and not (len(m) == 4 and float(m[3]) == 0):
        r, g, b = map(float, m[:3]); bg_lum.append(round(0.2126 * r + 0.7152 * g + 0.0722 * b))
    pagelen.append(d.get('pageLengthInViewports') or 0)

out.append(f'# Cross-site aggregate — {len(rows)} live sites measured\n')
out.append('| cluster | sites |\n|---|---|')
for c, n in Counter(d['_cluster'] for d in rows).items(): out.append(f'| {c} | {n} |')
def dist(name, vals, unit=''):
    vals = [v for v in vals if v is not None]
    if vals: out.append(f'- **{name}** (n={len(vals)}): p10 {pct(vals,.1)}{unit} · p25 {pct(vals,.25)}{unit} · median {median(vals)}{unit} · p75 {pct(vals,.75)}{unit} · p90 {pct(vals,.9)}{unit}')
out.append('\n## Typography (1440px viewport)')
dist('Largest text element size', display, 'px'); dist('Letter-spacing of largest text (em)', ls_display); dist('Line-height ratio of largest text', lh_ratio)
dist('Body size (first common 14–21px)', body, 'px'); dist('Words in h1', h1_words); dist('Share of text nodes uppercase', uc); dist('Distinct font families (>=3 uses)', n_fams)
out.append(f'- Negative tracking on display text: {sum(1 for x in ls_display if x < -0.005)}/{len(ls_display)} sites')
out.append('\n**Most used font families:** ' + ', '.join(f'{f} ({c})' for f, c in fam.most_common(45)))
out.append('\n**By cluster:**')
for c, ctr in fonts_by_cluster.items(): out.append(f'- {c}: ' + ', '.join(f'{f} ({n})' for f, n in ctr.most_common(14)))
out.append('\n## Color')
dist('Body background luminance (0=black,255=white)', bg_lum)
out.append(f'- Dark backgrounds (<60): {sum(1 for x in bg_lum if x < 60)} · light (>200): {sum(1 for x in bg_lum if x > 200)} · off-white 230–252: {sum(1 for x in bg_lum if 230 <= x <= 252)} · pure white 255: {sum(1 for x in bg_lum if x == 255)}')
out.append('\n## Motion')
out.append('**CSS/JS cubic-beziers (sites using):** ' + ', '.join(f'`{e}` ({c})' for e, c in eases.most_common(30)))
out.append('\n**GSAP eases (sites using):** ' + ', '.join(f'`{e}` ({c})' for e, c in gsap.most_common(25)))
out.append('\n**Spring configs:** ' + ', '.join(f'`{e}` ({c})' for e, c in springs.most_common(12)))
out.append('\n## Stack / libs (heuristic)\n' + ', '.join(f'{k} ({v})' for k, v in libs.most_common()))
out.append('\n## Radii (top per site)\n' + ', '.join(f'{k} ({v})' for k, v in radii.most_common(20)))
dist('\nPage length (viewports @900px)', pagelen)
out.append('\n## Per-site quick table\n| cluster | site | display font | largest px / tracking | body bg | libs |\n|---|---|---|---|---|---|')
for d in rows:
    t = d['type']; big = t['largest'][0] if t['largest'] else {}
    f = next((f for f, _ in t['families'] if f not in GENERIC), '')
    L = ','.join(k for k, v in d['libs'].items() if v and k in ('gsap', 'lenis', 'three', 'next', 'framer', 'webflow', 'nuxt', 'astro', 'shopify', 'splitText', 'r3f', 'ogl'))
    out.append(f"| {d['_cluster'][:2]} | {d['url']} | {f} | {big.get('size','')} / {big.get('ls','')} | {d['color']['bodyBg']} | {L} |")
print('\n'.join(out))
