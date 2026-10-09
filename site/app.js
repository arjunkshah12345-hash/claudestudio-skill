import { autoInit, reduced } from './motion.js';

/* ---------------------------------------------------------------- copy install */
const toast = document.querySelector('[data-toast]');
let toastT;
const say = (msg) => { toast.textContent = msg; toast.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('is-on'), 1600); };
document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(b.dataset.copy); say('Copied. Paste it in your project.'); }
  catch { say(b.dataset.copy); }
  const t = b.textContent; b.textContent = 'Copied'; setTimeout(() => (b.textContent = t), 1400);
}));

/* ---------------------------------------------------------------- nav hairline on scroll */
const nav = document.querySelector('[data-nav]');
const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* ---------------------------------------------------------------- the redline: the page measures its own headline */
const host = document.querySelector('[data-redline-host]');
const h1 = host?.querySelector('[data-redline]');
const layer = host?.querySelector('[data-redlines]');
const fmt = (n, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const em = (v) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(3).replace(/^0/, '') + 'em';

function drawRedlines() {
  if (!h1 || !layer) return;
  const H = host.getBoundingClientRect();
  const cs = getComputedStyle(h1);
  const fs = parseFloat(cs.fontSize);
  const ls = (parseFloat(cs.letterSpacing) || 0) / fs;
  const family = cs.fontFamily.split(',')[0].replace(/"/g, '');
  const range = document.createRange(); range.selectNodeContents(h1);
  const lines = [];
  for (const r of range.getClientRects()) {
    if (r.width < 4) continue;
    const top = Math.round(r.top - H.top);
    const l = lines.find((x) => Math.abs(x.top - top) < fs * 0.3);
    if (l) { l.left = Math.min(l.left, r.left - H.left); l.right = Math.max(l.right, r.right - H.left); }
    else lines.push({ top, left: r.left - H.left, right: r.right - H.left });
  }
  const bases = [...h1.querySelectorAll('.bl')].map((b) => b.getBoundingClientRect().top - H.top);
  if (!lines.length || !bases.length) return;
  const left = Math.min(...lines.map((l) => l.left));
  const right = Math.max(...lines.map((l) => l.right));
  const lhPx = bases.length > 1 ? bases[1] - bases[0] : parseFloat(cs.lineHeight);
  const roomRight = innerWidth - H.left - right > 120;
  const parts = [];
  let d = 0; const step = 110;
  const add = (cls, style, text = '') => { parts.push(`<span class="rl ${cls}" style="${style};--d:${d}ms">${text}</span>`); d += step; };

  // width
  add('rl-h', `left:${left}px;top:${lines[0].top - 22}px;width:${right - left}px`);
  add('rl-tag', `left:${left + (right - left) / 2}px;top:${lines[0].top - 30}px;transform:translateX(-50%)`, `W ${fmt(right - left)}px`);
  // baselines
  bases.forEach((y) => add('rl-guide', `left:${left - 24}px;top:${y}px;width:${right - left + (roomRight ? 72 : 24)}px`));
  add('rl-tag', `left:${left - 24}px;top:${bases[0] + 6}px`, 'baseline');
  // leading
  if (bases.length > 1 && roomRight) {
    add('rl-v', `left:${right + 40}px;top:${bases[0]}px;height:${lhPx}px`);
    add('rl-tag', `left:${right + 52}px;top:${bases[0] + lhPx / 2 - 8}px`, `LH ${(lhPx / fs).toFixed(2)} · ${fmt(lhPx)}px`);
  }
  // spec
  add('rl-tag', `left:${left}px;top:${bases[bases.length - 1] + Math.max(18, fs * 0.2)}px`,
    `${family} · ${cs.fontWeight} · ${fmt(fs)}px · ${em(ls)}`);
  layer.innerHTML = parts.join('');
}

if (h1) {
  const go = () => { drawRedlines(); requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('is-on'))); };
  (document.fonts?.ready ?? Promise.resolve()).then(() => setTimeout(go, reduced ? 0 : 700));
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawRedlines, 120); });
}

/* ---------------------------------------------------------------- footer ruler: live viewport width */
const vw = document.querySelector('[data-vw]');
const setVw = () => { if (vw) vw.textContent = `viewport ${innerWidth}px`; };
addEventListener('resize', setVw); setVw();

/* ---------------------------------------------------------------- launch film (shown once the file exists) */
const film = document.querySelector('[data-film]');
if (film) {
  fetch(film.querySelector('source').src, { method: 'HEAD' }).then((r) => {
    if (!r.ok) return;
    film.hidden = false;
    const v = film.querySelector('[data-film-video]'); const t = film.querySelector('[data-film-toggle]');
    t.addEventListener('click', () => {
      const label = t.querySelector('[data-film-label]');
      if (v.paused) { v.muted = false; v.play(); label.textContent = 'Pause'; t.classList.add('is-playing'); t.setAttribute('aria-label', 'Pause launch film'); }
      else { v.pause(); label.textContent = 'Play film'; t.classList.remove('is-playing'); t.setAttribute('aria-label', 'Play launch film'); }
    });
  }).catch(() => {});
}

autoInit();
