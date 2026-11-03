#!/usr/bin/env node
// Fruit study: every fruit's own drawing (FRUIT_OUTLINES + FRUIT_CUES,
// and apple and banana, unchanged), each at 0/50/100% of its shelf life
// at study size, then fresh at the size the All items row gives it.
// Same methodology as bespoke-study.js: real fridge-item objects through
// leftAt()/decayFraction() and foodShapeMarkupLine -- no separate drawing
// path.
//
// Run: node tools/fruit-study.js
// Output: tools/screenshots/fruit-study.png

const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
const PORT = 8977;
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
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`http://localhost:${PORT}/index.html?v=${Date.now()}`);
  await page.waitForSelector('#headline');

  const result = await page.evaluate(() => {
    const day = today();
    const STUDY = 150;
    // Every fruit: FOODS entries on a fruit drawing (and apple, banana),
    // plus plums, which reach the app only through FoodKeeper #266.
    const KEYS = Object.keys(FOODS).filter(k => FRUIT_OUTLINES[FOODS[k].shape] || k === 'apple' || k === 'banana').concat(['_fk_266']);
    let uid = 30000;
    const nameOf = key => key === '_fk_266' ? 'Plums (FoodKeeper #266)' : FOODS[key].en;

    function cellAt(key, targetFraction, shelfSize){
      const shelf = foodOf(key).shelf;
      const age = shelfSize ? 0 : Math.round(targetFraction * shelf);
      const it = { id: uid++, key, bought: day - age };
      const d = leftAt(it, day);
      const frac = decayFraction(it, day);
      const cat = fridgeCatOf(it);
      // The row's own size for this item fresh: layoutShelves' 44-174px.
      const size = shelfSize ? Math.round(44 + (1 - pos(Math.max(0, d)) / 100) * 130)
        : Math.max(16, Math.round(STUDY * (1 - frac * 0.22 * cat.shrink)));
      const svg = foodShapeMarkupLine(fridgeShapeOf(it), foodBodyColor(it, frac), frac, cat.sag, cat.mold, cat.wrinkle, size, it.id);
      return { svg, size, label: shelfSize ? `shelf, fresh · ${size}px` : `${Math.round(targetFraction * 100)}% · ${Math.round(frac * 100)}% actual` };
    }
    const cellMarkup = (cell, colSize) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:${colSize + 16}px">
        <div style="height:${colSize}px;width:100%;display:flex;align-items:flex-end;justify-content:center">
          <div style="width:${cell.size}px;height:${cell.size}px">${cell.svg}</div></div>
        <div style="font-family:'tonos-mono-vf',ui-monospace,monospace;font-size:10px;letter-spacing:.03em;color:#5C6664;text-align:center">${cell.label}</div></div>`;
    const card = key => `<div style="border:1px solid #B5BFBB;background:#E6EAE8;padding:12px 14px">
        <div style="font-family:'tonos-mono-vf',ui-monospace,monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8B9491;margin-bottom:8px">${nameOf(key)} · ${fridgeShapeOf({key})} · ${foodOf(key).shelf}d</div>
        <div style="display:flex;gap:10px;align-items:flex-end">
          ${cellMarkup(cellAt(key, 0), STUDY)}${cellMarkup(cellAt(key, 0.5), STUDY)}${cellMarkup(cellAt(key, 1), STUDY)}
          <div style="width:1px;align-self:stretch;background:#B5BFBB"></div>${cellMarkup(cellAt(key, 0, true), 174)}
        </div></div>`;

    const container = document.createElement('div');
    container.id = 'fruitStudy';
    container.style.cssText = 'position:absolute;top:0;left:0;background:#DCE1DF;padding:24px;z-index:9999;width:max-content';
    container.innerHTML = `<div style="font-family:'tonos-mono-vf',ui-monospace,monospace;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#141817;margin-bottom:14px">
        Every fruit -- 0/50/100% of its shelf life at study size, then fresh at its own size on the All items shelf</div>
      <div style="display:grid;grid-template-columns:repeat(2, max-content);gap:14px">${KEYS.map(card).join('')}</div>`;
    document.body.appendChild(container);
    return { fruits: KEYS.length };
  });

  const el = await page.$('#fruitStudy');
  await el.screenshot({ path: path.join(OUT, 'fruit-study.png') });

  if (errors.length) console.log('console errors:', errors);
  console.log('Fruit study written to', path.join(OUT, 'fruit-study.png'), result);

  await browser.close();
  server.close();
})();
