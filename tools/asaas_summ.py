# Compact summary of analyze.mjs data.json (+ asaas_probe probe.json if present).
# Usage: python3 -I asaas_summ.py <site_dir>
import json, sys, os, re, builtins
_p=builtins.print
def print(*a, **k):
    _p(*[re.sub(r'(\\u200[b-f]|\\u2060|\\ufeff|[\u200b-\u200f\u2060\ufeff])+','',str(x)) for x in a], **k)
d = sys.argv[1]
j = json.load(open(os.path.join(d, 'data.json')))
t = j.get('type', {})
print('URL', j.get('url'), '| title:', j.get('title'), '| len vp:', j.get('pageLengthInViewports'), '| err:', j.get('error'))
print('FONTS', t.get('loadedFonts', [])[:10])
print('FAMS', t.get('families'), '\nSIZES', t.get('sizes'), '\nWEIGHTS', t.get('weights'))
print('LS', t.get('letterSpacings'), '| UPPER', t.get('uppercaseShare'))
for x in t.get('largest', [])[:8]:
    print('  BIG', x['tag'], x['size'], x['weight'], 'lh', x['lh'], 'ls', x['ls'], x['tt'], x['family'], x['color'], '|', x['text'][:70])
c = j.get('color', {})
print('BG', c.get('bodyBg'), c.get('htmlBg'), '\nTEXTC', c.get('text'), '\nBGS', c.get('backgrounds'), '\nGRAD', [g[0][:110] for g in c.get('gradients', [])])
m = j.get('motion', {})
print('BEZ', m.get('cubicBeziers'), '\nDUR', m.get('durations'), '\nKF', m.get('keyframes'))
cv = j.get('cssVarSample', {})
print('VARS', {k: v for k, v in list(cv.items())[:45]})
print('LIBS', {k: v for k, v in j.get('libs', {}).items() if v})
print('MEDIA', j.get('media'), '\nFX', j.get('effects'))
print('RADII', j.get('radii'), '\nBORDERS', j.get('borders'), '\nGRIDS', j.get('grids'), '\nCONT', j.get('containers'), '\nMARG', j.get('sideMargins'))
print('SECTIONS', [(s['h'], s['padTop'], s['bg']) for s in j.get('sections', [])[:20]])
print('NAV', j.get('nav'))
for x in j.get('ctas', [])[:8]: print('  CTA', x)
print('HEAD', j.get('headings'))
print('PARAS', j.get('paras'))
print('FOOT', j.get('footer'))
print('JS', j.get('jsMotion'))
p = os.path.join(d, 'probe', 'probe.json')
if os.path.exists(p):
    q = json.load(open(p))
    for h in q.get('h1', []): print('  PROBE-H1', h)
    for h in q.get('hero', [])[:6]: print('  PROBE-HERO', h['tag'], h['size'], h['w'], h['lh'], h['ls'], h['fam'], h['color'], '|', h['t'][:60])
    for h in q.get('headings', [])[:25]: print('  PROBE-HD', h['tag'], h['size'], h['w'], h['lh'], h['ls'], h['tt'], h['fam'], 'x', h['x'], 'w', h['width'], '|', h['t'][:60])
