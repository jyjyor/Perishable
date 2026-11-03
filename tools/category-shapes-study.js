#!/usr/bin/env node
// Category silhouette study: the one generic shape per decay category that
// a food without its own drawing gets (leafy, soft, veg, dairy, protein,
// cooked, and the plain packet for an item that matched nothing), each
// through the real foodShapeMarkupLine() at five decay fractions, at study
// size and at the line-art shelf's smallest size (44px), in the neutral
// fallback base and in one FOODS food's own base. The packaged shapes
// (dairy tub, cooked container, packet, carton) keep their colour and
// outline; their decay is the bulge, the seam mold and the fading label.
//
// Run: node tools/category-shapes-study.js
// Output: tools/screenshots/category-shapes-study.png

const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
const PORT = 8961;
const CHROME_PATH = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

fs.mkdirSync(OUT, { recursive: true });

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    server.listen(PORT, () => resolve(server));
  });
}

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1180, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#headline');

  await page.evaluate(() => {
    const rows = [
      ['leafy', 'Kale', FOODS.kale.base, FALLBACK_BASE.veg],
      ['soft', 'Strawberries', FOODS.strawberry.base, FALLBACK_BASE.soft],
      ['veg', 'Sweet potatoes', FOODS.sweetpotato.base, FALLBACK_BASE.veg],
      ['dairy', 'Sour cream', FOODS.sourcream.base, FALLBACK_BASE.dairy],
      ['protein', 'Salmon', FOODS.salmon.base, FALLBACK_BASE.protein],
      ['cooked', 'Hummus', FOODS.hummus.base, FALLBACK_BASE.cooked],
      ['generic', 'No match', DEFAULT_BASE_HEX, DEFAULT_BASE_HEX],
      ['carton', 'Milk', FOODS.milk.base, FALLBACK_BASE.dairy]
    ];
    const fracs = [0, 0.35, 0.6, 0.85, 1];
    const cell = (shape, base, frac, size, seed) => {
      const c = FRIDGE_CAT[shape] || FRIDGE_CAT.dairy;
      return `<div style="display:flex;align-items:flex-end;justify-content:center;width:${Math.max(size, 60)}px">` +
        foodShapeMarkupLine(shape, PACKAGED_SHAPES[shape] ? base : natureColor(base, frac), frac, c.sag, c.mold, c.wrinkle, size, seed) + '</div>';
    };
    const html = rows.map(([shape, food, base, neutral], r) => `
      <div style="display:flex;align-items:flex-end;gap:14px;padding:10px 0;border-bottom:1px solid var(--line)">
        <div class="mono" style="width:120px;color:var(--ink-2)">${shape}<br><span style="color:var(--ink-3)">${food} / fallback</span></div>
        ${fracs.map((f, i) => cell(shape, base, f, 120, 7 + r * 10 + i)).join('')}
        ${cell(shape, neutral, 0, 120, 3 + r)}
        ${cell(shape, base, 0, 44, 5 + r)}${cell(shape, base, 0.85, 44, 6 + r)}
      </div>`).join('');
    const head = `<div class="mono" style="display:flex;gap:14px;color:var(--ink-3);padding-bottom:6px">
      <div style="width:120px"></div>${fracs.map(f => `<div style="width:120px;text-align:center">${Math.round(f * 100)}%</div>`).join('')}
      <div style="width:120px;text-align:center">fallback base</div><div style="width:136px;text-align:center">44px: 0% / 85%</div></div>`;
    // Hide the app rather than replacing body: its own handlers still look
    // up their elements after this runs.
    for (const el of document.body.children) el.style.display = 'none';
    document.body.insertAdjacentHTML('beforeend', `<div id="study" style="padding:20px;background:var(--paper);width:max-content">
      <div style="margin-bottom:12px">Category silhouettes: one per decay category, five decay fractions</div>${head}${html}</div>`);
  });
  await (await page.$('#study')).screenshot({ path: path.join(OUT, 'category-shapes-study.png') });
  if (errors.length) console.log('console errors:', errors);
  await browser.close();
  server.close();
  console.log('wrote', path.join(OUT, 'category-shapes-study.png'));
})();
