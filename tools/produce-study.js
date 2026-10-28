#!/usr/bin/env node
// Potato/apple/banana/tomato silhouette study: one row per item, each at
// 0/50/100% of its own shelf life at study size, plus a fourth column at
// the real front-row shelf size (fresh) -- does the identity cue (eyes,
// stem+dimple, curve+stem tip, calyx) still read at actual in-app scale,
// not just blown up for inspection.
//
// Same methodology as mushroom-study.js: real fridge-item objects with a
// computed `bought` date, real leftAt()/decayFraction() deriving the
// fraction, rendered through foodShapeMarkupLine -- no separate drawing
// path, so what passes here is what the real shelf draws.
//
// Run: node tools/produce-study.js
// Output: tools/screenshots/produce-study.png

const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
const PORT = 8973;
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
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`http://localhost:${PORT}/index.html?v=${Date.now()}`);
  await page.waitForSelector('#headline');

  const result = await page.evaluate(() => {
    const day = today();
    const STUDY = 220;
    // layoutShelfRow()'s own front-row max: size = 44 + frontness*130,
    // frontness 1 at d=0 (today).
    const FRONT_ROW = 174;
    const KEYS = ['potato', 'apple', 'banana', 'tomato'];
    let uid = 20000;

    function cellAt(key, targetFraction, baseSize, isFrontRowCheck){
      const shelf = FOODS[key].shelf;
      const age = Math.round(targetFraction * shelf);
      const it = { id: uid++, key, bought: day - age };
      const d = leftAt(it, day);
      const frac = decayFraction(it, day);
      const cat = fridgeCatOf(it);
      const shape = fridgeShapeOf(it);
      const color = natureColor(foodBaseColor(it), frac);
      const size = Math.max(16, Math.round(baseSize * (1 - frac * 0.22 * cat.shrink)));
      const svg = foodShapeMarkupLine(shape, color, frac, cat.sag, cat.mold, cat.wrinkle, size, it.id);
      return { svg, size, frac, d, label: isFrontRowCheck ? 'front-row size, fresh' : `${Math.round(targetFraction * 100)}% target · ${Math.round(frac * 100)}% actual` };
    }

    function cellMarkup(cell, colSize){
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:${colSize + 40}px">
        <div style="height:${colSize}px;width:100%;display:flex;align-items:flex-end;justify-content:center">
          <div style="width:${cell.size}px;height:${cell.size}px">${cell.svg}</div>
        </div>
        <div style="font-family:'tonos-mono-vf',ui-monospace,monospace;font-size:11px;letter-spacing:.03em;color:#5C6664;text-align:center">${cell.label}</div>
      </div>`;
    }

    const rows = KEYS.map(key => {
      const c0 = cellAt(key, 0, STUDY, false);
      const c50 = cellAt(key, 0.5, STUDY, false);
      const c100 = cellAt(key, 1.0, STUDY, false);
      const cFront = cellAt(key, 0, FRONT_ROW, true);
      const label = `${FOODS[key].en} (${key})`;
      return `<div style="border:1px solid #B5BFBB;background:#E6EAE8;padding:20px 24px;margin-bottom:20px">
        <div style="font-family:'tonos-mono-vf',ui-monospace,monospace;font-weight:500;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#8B9491;margin-bottom:12px">${label}</div>
        <div style="display:flex;gap:24px;align-items:flex-end">
          ${cellMarkup(c0, STUDY)}${cellMarkup(c50, STUDY)}${cellMarkup(c100, STUDY)}
          <div style="width:1px;align-self:stretch;background:#B5BFBB;margin:0 4px"></div>
          ${cellMarkup(cFront, FRONT_ROW)}
        </div>
      </div>`;
    }).join('');

    const container = document.createElement('div');
    container.id = 'produceStudy';
    container.style.cssText = 'position:fixed;top:0;left:0;background:#DCE1DF;padding:28px;z-index:9999;width:max-content';
    container.innerHTML =
      `<div style="font-family:'tonos-mono-vf',ui-monospace,monospace;font-weight:500;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#141817;margin-bottom:16px">
        Potato / apple / banana / tomato -- 0/50/100% at study size, then fresh at real front-row shelf size</div>` +
      rows;
    document.body.appendChild(container);
    return { ok: true };
  });

  const el = await page.$('#produceStudy');
  await el.screenshot({ path: path.join(OUT, 'produce-study.png') });

  if (errors.length) console.log('console errors:', errors);
  console.log('Produce study written to', path.join(OUT, 'produce-study.png'), result);

  await browser.close();
  server.close();
})();
