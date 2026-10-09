#!/usr/bin/env python3
# Compact digest of analyzer data.json files (used by b-tech-gold-standard research).
# Usage: python3 -I tools/btg-digest.py <site-dir> [<site-dir> ...]
import json, sys

def short(x, n):
    s = json.dumps(x, ensure_ascii=False)
    return s if len(s) <= n else s[:n] + '...'

for p in sys.argv[1:]:
    try:
        d = json.load(open(p.rstrip('/') + '/data.json'))
    except Exception as e:
        print('!!', p, e); continue
    t = d.get('type', {}); c = d.get('color', {})
    print('=' * 8, d.get('url'), '| vp:', d.get('pageLengthInViewports'), '| title:', d.get('title'))
    if d.get('error'): print('ERROR', d['error'])
    print('fonts:', short(t.get('families'), 300))
    print('sizes:', short(t.get('sizes'), 400))
    print('weights:', short(t.get('weights'), 200))
    print('ls:', short(t.get('letterSpacings'), 500))
    print('upper:', t.get('uppercaseShare'))
    for h in (t.get('largest') or [])[:6]:
        print('  BIG', h.get('tag'), h.get('size'), h.get('weight'), 'lh', h.get('lh'), 'ls', h.get('ls'), h.get('family'), h.get('color'), '|', h.get('text', '')[:70])
    print('bg:', c.get('bodyBg'), '| text:', short(c.get('text'), 400))
    print('backgrounds:', short(c.get('backgrounds'), 500))
    print('gradients:', short(c.get('gradients'), 500))
    m = d.get('motion', {})
    print('beziers:', short(m.get('cubicBeziers'), 400), '| dur:', short(m.get('durations'), 250))
    print('keyframes:', short(m.get('keyframes'), 250))
    libs = d.get('libs', {})
    print('libs:', [k for k, v in libs.items() if v], '| media:', d.get('media'))
    print('effects:', short(d.get('effects'), 700))
    print('radii:', short(d.get('radii'), 200), '| borders:', short(d.get('borders'), 300))
    print('grids:', short(d.get('grids'), 200), '| containers:', short(d.get('containers'), 150), '| margins:', short(d.get('sideMargins'), 150))
    print('sections padTop:', short([(s.get('padTop'), s.get('h'), s.get('bg')) for s in (d.get('sections') or [])[:14]], 600))
    print('nav:', short(d.get('nav'), 350))
    print('ctas:', short(d.get('ctas'), 1100))
    print('headings:', short(d.get('headings'), 900))
    print('paras:', short(d.get('paras'), 900))
    print('jsMotion:', short(d.get('jsMotion'), 900))
    print()
