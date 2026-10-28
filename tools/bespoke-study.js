#!/usr/bin/env node
// Bespoke silhouette study for the nine foods redrawn after the produce
// pass (chicken on a tray, tofu in water, gable-top milk, spinach bunch,
// carrot with tops, cut onion, eggs in an open carton, cheese wedge,
// garlic bulb): one row per item, each at 0/50/100% of its own shelf life
// at study size, plus a fourth column at the real fridge's eye-level
// shelf size for a today item (rfUrgencyPx at 0 days) drawn the way the
// real fridge draws it -- its wobble filter and line weights -- so the
// identity has to hold at actual in-app scale, not just blown up.
//
// Same methodology as mushroom-study.js: real fridge-item objects with a
// computed `bought` date, real leftAt()/decayFraction() deriving the
// fraction, rendered through foodShapeMarkupLine -- no separate drawing
// path, so what passes here is what the real shelf draws.
//
// Run: node tools/bespoke-study.js
// Output: tools/screenshots/bespoke-study.png

const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
const PORT = 8974;
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
    // The real fridge's eye-level size for a today item.
    const FRONT_ROW = rfUrgencyPx({key: 'tofu', bought: day - FOODS.tofu.shelf}, day);
    const KEYS = ['chicken', 'tofu', 'milk', 'spinach', 'carrot', 'onion', 'egg', 'cheese', 'garlic'];
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
      // The real fridge sizes by urgency only; the study columns keep the
      // produce study's decay shrink so they compare like for like.
      const size = isFrontRowCheck ? baseSize : Math.max(16, Math.round(baseSize * (1 - frac * 0.22 * cat.shrink)));
      const svg = foodShapeMarkupLine(shape, color, frac, cat.sag, cat.mold, cat.wrinkle, size, it.id);
      return { svg, size, frac, d, rf: isFrontRowCheck, label: isFrontRowCheck ? 'eye-level shelf size, fresh, as drawn in the real fridge' : `${Math.round(targetFraction * 100)}% target · ${Math.round(frac * 100)}% actual` };
    }

    function cellMarkup(cell, colSize){
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:${colSize + 40}px">
        <div style="height:${colSize}px;width:100%;display:flex;align-items:flex-end;justify-content:center">
          <div ${cell.rf ? 'class="rf-foodshape"' : ''} style="width:${cell.size}px;height:${cell.size}px">${cell.svg}</div>
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
          ${cellMarkup(cFront, FRONT_ROW + 20)}
        </div>
      </div>`;
    }).join('');

    const container = document.createElement('div');
    container.id = 'bespokeStudy';
    container.style.cssText = 'position:fixed;top:0;left:0;background:#DCE1DF;padding:28px;z-index:9999;width:max-content';
    container.innerHTML =
      `<div style="font-family:'tonos-mono-vf',ui-monospace,monospace;font-weight:500;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#141817;margin-bottom:16px">
        Nine bespoke silhouettes -- 0/50/100% at study size, then fresh at the real fridge's eye-level shelf size</div>` +
      rows;
    document.body.appendChild(container);
    return { ok: true };
  });

  const el = await page.$('#bespokeStudy');
  await el.screenshot({ path: path.join(OUT, 'bespoke-study.png') });

  if (errors.length) console.log('console errors:', errors);
  console.log('Bespoke study written to', path.join(OUT, 'bespoke-study.png'), result);

  await browser.close();
  server.close();
})();
