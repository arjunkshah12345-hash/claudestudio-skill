import { autoInit, reduced } from './motion.js';

document.documentElement.classList.add('js');

/* ---------------------------------------------------------------- the batch clock (the motif) */
const DAY = 864e5;
const CYCLE = 91;                        // a new batch every 13 weeks
const ANCHOR = Date.UTC(2026, 8, 21);    // F26, week 1, Monday
const SEASONS = ['F', 'W', 'X', 'S'];
const DEMO_OFFSET = 80;                  // Thursday of week 12

const code = (k) => SEASONS[((k % 4) + 4) % 4] + (26 + Math.floor((k + 3) / 4));
const now = Date.now();
const k = Math.floor((now - ANCHOR) / (CYCLE * DAY));
const start = ANCHOR + k * CYCLE * DAY;
const day = Math.min(DEMO_OFFSET, Math.floor((now - start) / DAY) + 1);
const week = Math.min(12, Math.ceil(day / 7));
let demo = start + DEMO_OFFSET * DAY;
if (now > demo + DAY) demo += CYCLE * DAY;
const daysLeft = Math.max(0, Math.ceil((demo - now) / DAY));
const demoLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(demo);

const set = (sel, v) => document.querySelectorAll(sel).forEach((el) => { el.textContent = v; });
set('[data-batch-code]', code(k));
set('[data-next-code]', code(k + 1));
set('[data-week]', week);
set('[data-day]', day);
set('[data-days-left]', daysLeft);
set('[data-demo-date]', demoLabel);

document.querySelectorAll('[data-mark]').forEach((m) => {
  m.innerHTML = Array.from({ length: 12 }, (_, i) => `<i class="${i + 1 < week ? 'past' : i + 1 === week ? 'now' : ''}"></i>`).join('');
});
document.querySelectorAll('[data-weeks] li').forEach((li, i) => {
  const w = i + 1;
  if (w < week) li.classList.add('past');
  if (w === week) { li.classList.add('now'); li.style.setProperty('--p', `${(((day - 1) % 7) + 1) / 7 * 100}%`); li.setAttribute('aria-current', 'step'); }
});
document.querySelectorAll('[data-weeks-used]').forEach((el) => {
  const [a, b] = el.dataset.weeksUsed.split('-').map(Number);
  el.innerHTML = Array.from({ length: 12 }, (_, i) => `<i class="${i + 1 >= a && i + 1 <= b ? 'on' : ''}"></i>`).join('');
  el.setAttribute('aria-hidden', 'true');
});

/* "This week" column on the Gantt */
const gantt = document.querySelector('[data-gantt]');
const nowCol = gantt?.querySelector('[data-now]');
const placeNow = () => {
  const track = gantt.querySelector('.g-scale .g-track');
  if (!track || !nowCol) return;
  const g = gantt.getBoundingClientRect(), t = track.getBoundingClientRect();
  const w = t.width / 12;
  nowCol.style.left = `${t.left - g.left + (week - 1) * w}px`;
  nowCol.style.width = `${w}px`;
};
if (gantt) {
  placeNow(); addEventListener('resize', placeNow);
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { gantt.classList.add('is-in'); io.disconnect(); } }, { rootMargin: '0px 0px -25% 0px' });
  io.observe(gantt);
  gantt.querySelectorAll('.g-track b').forEach((b, i) => { b.style.transitionDelay = `${i * 90}ms`; });
}

/* ---------------------------------------------------------------- hero: the index floods the field */
const hero = document.querySelector('[data-hero]');
const list = document.querySelector('[data-ix]');
const preview = document.querySelector('[data-preview]');
const posters = preview ? [...preview.querySelectorAll('.poster')] : [];

const flood = (a) => {
  if (a) { hero.style.setProperty('--paper', a.dataset.field); hero.style.setProperty('--ink-rgb', a.dataset.ink); }
  else { hero.style.removeProperty('--paper'); hero.style.removeProperty('--ink-rgb'); }
  posters.forEach((p) => p.classList.toggle('is-on', !!a && p.dataset.p === a.dataset.poster));
  preview?.classList.toggle('is-on', !!a && matchMedia('(hover: hover)').matches);
};

if (hero && list) {
  list.querySelectorAll('.ix').forEach((a) => {
    a.addEventListener('mouseenter', () => flood(a));
    a.addEventListener('focus', () => flood(a));
  });
  list.addEventListener('mouseleave', () => flood(null));
  list.addEventListener('focusout', (e) => { if (!list.contains(e.relatedTarget)) flood(null); });

  // poster follows the cursor with a light lerp
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
  const loop = () => {
    x += (tx - x) * (reduced ? 1 : 0.16); y += (ty - y) * (reduced ? 1 : 0.16);
    preview.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(loop) : 0;
  };
  list.addEventListener('mousemove', (e) => {
    const w = preview.offsetWidth, h = preview.offsetHeight;
    tx = Math.min(innerWidth - w - 24, e.clientX + 32);
    ty = Math.max(24, Math.min(innerHeight - h - 24, e.clientY - h / 2));
    if (!preview.classList.contains('is-on')) { x = tx; y = ty; }
    if (!raf) raf = requestAnimationFrame(loop);
  });
}

/* ---------------------------------------------------------------- live states inside the rebuilt UIs */
const pad = (n) => String(n).padStart(2, '0');
document.querySelectorAll('[data-countdown]').forEach((el) => {
  let s = +el.dataset.countdown;
  const draw = () => { el.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
  draw();
  if (!reduced) setInterval(() => { s = s > 0 ? s - 1 : 8049; draw(); }, 1000);
});

const run = document.querySelector('[data-run]');
const runBar = document.querySelector('[data-run-bar]');
if (run && !reduced) {
  let n = 212;
  setInterval(() => {
    n = n >= 240 ? 196 : n + 1;
    run.textContent = n;
    runBar.style.width = `${(n / 240) * 100}%`;
  }, 900);
}

/* ---------------------------------------------------------------- nav takes the ink of the field beneath it */
const nav = document.querySelector('.nav');
let navTick = false;
const tintNav = () => {
  navTick = false;
  nav.style.visibility = 'hidden';
  const under = document.elementFromPoint(innerWidth / 2, 32)?.closest('.field');
  nav.style.visibility = '';
  if (!under) return;
  const cs = getComputedStyle(under);
  nav.style.color = `rgb(${cs.getPropertyValue('--ink-rgb').trim()})`;
  nav.style.backgroundColor = cs.getPropertyValue('--paper').trim();
};
addEventListener('scroll', () => { if (!navTick) { navTick = true; requestAnimationFrame(tintNav); } }, { passive: true });
list?.addEventListener('mouseover', () => requestAnimationFrame(tintNav));
list?.addEventListener('mouseleave', () => requestAnimationFrame(tintNav));
tintNav();

autoInit();
