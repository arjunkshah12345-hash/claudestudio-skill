#!/usr/bin/env python3
# Usage: python3 -I tools/f_summarize.py <site-dir> [<site-dir> ...]
# Prints a compact digest of analyze.mjs data.json for note-taking.
import json, sys, os

def short(v, n=900):
    s = json.dumps(v, ensure_ascii=False)
    return s if len(s) <= n else s[:n] + '…'

for d in sys.argv[1:]:
    p = os.path.join(d, 'data.json')
    if not os.path.exists(p):
        print('MISSING', p); continue
    j = json.load(open(p))
    print('=' * 100)
    print(j.get('url'), '| title:', j.get('title'), '| len vp:', j.get('pageLengthInViewports'))
    t = j.get('type', {})
    print('fonts:', short(t.get('loadedFonts'), 400))
    print('families:', short(t.get('families'), 300))
    print('sizes:', short(t.get('sizes'), 400))
    print('weights:', short(t.get('weights'), 200), '| ls:', short(t.get('letterSpacings'), 400), '| upper%:', t.get('uppercaseShare'))
    for L in (t.get('largest') or [])[:7]:
        print('  big:', L.get('tag'), repr(L.get('text', '')[:60]), L.get('family'), L.get('size'), L.get('weight'), 'lh', L.get('lh'), 'ls', L.get('ls'), L.get('tt'), L.get('style'), L.get('color'))
    c = j.get('color', {})
    print('bodyBg:', c.get('bodyBg'), '| text:', short(c.get('text'), 300))
    print('bgs:', short(c.get('backgrounds'), 300), '| grad:', short(c.get('gradients'), 150))
    m = j.get('motion', {})
    print('beziers:', short(m.get('cubicBeziers'), 400))
    print('durations:', short(m.get('durations'), 250), '| keyframes:', short(m.get('keyframes'), 250))
    print('libs:', [k for k, v in (j.get('libs') or {}).items() if v])
    print('media:', j.get('media'), '| radii:', short(j.get('radii'), 150))
    e = j.get('effects', {})
    print('effects: blend', e.get('mixBlend'), 'backdrop', e.get('backdropFilter'), 'clip', e.get('clipPath'), 'sticky', e.get('sticky'), 'cursor', e.get('customCursor'), 'shadows', short(e.get('boxShadows'), 150))
    print('borders:', short(j.get('borders'), 250))
    print('grids:', short(j.get('grids'), 500))
    print('containers:', short(j.get('containers'), 150), '| sideMargins:', short(j.get('sideMargins'), 150))
    n = j.get('nav', {})
    print('nav:', n.get('tag'), n.get('position'), 'h', n.get('height'), 'links', n.get('links'), 'bg', n.get('bg'), 'blend', n.get('mixBlend'), short(n.get('linkTexts'), 300))
    for ct in (j.get('ctas') or [])[:6]:
        print('  cta:', repr(ct.get('text', '')[:40]), 'bg', ct.get('bg'), 'col', ct.get('color'), 'r', ct.get('radius'), 'pad', ct.get('pad'), ct.get('size'), ct.get('weight'), ct.get('tt'), 'border', ct.get('border'), 'h', ct.get('h'))
    print('headings:', short(j.get('headings'), 600))
    print('paras:', short(j.get('paras'), 700))
    print('jsMotion:', short(j.get('jsMotion'), 600))
