import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:8731/index.html#play', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const cases = [['thirsty', 12, 14, 'E'], ['cold', 3, 4, 'E'], ['dark', 3, 14, 'N'], ['bright', 2, 22, 'S'], ['soon', 7, 14, 'W']];
for (const [name, d, t, w] of cases) {
  await page.evaluate(([d, t, w]) => {
    const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    set('days', d); set('temp', t);
    const r = document.querySelector(`input[name=win][value=${w}]`); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true }));
  }, [d, t, w]);
  await page.waitForTimeout(1200);
  const el = await page.$('.play__grid');
  await el.screenshot({ path: `/tmp/sprout_shots/dial-${name}.png` });
  console.log(name, await page.$eval('#dial-msg', e => e.textContent));
}
await browser.close();
