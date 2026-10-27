#!/usr/bin/env node
// Decay study: one representative item per fridge-view category, at
// 0/25/50/75/95/100% of its own shelf life, drawn large. Not a pass/fail
// scenario -- a design-review instrument. Calls the app's own
// decayColor()/foodShapeMarkup()/FRIDGE_CAT directly (same browser
// context as index.html) so what's on screen is exactly what the fridge
// view would draw, just blown up past the size sag/mold/shrink are
// actually legible at.
//
// Run: node tools/decay-study.js
// Output: tools/screenshots/decay-study.png

const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
const PORT = 8952;
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

  await page.evaluate(() => {
    // One item per category -- chosen for a shelf life long enough that
    // the six steps land on distinct day counts, not all piled at d=0.
    const reps = [
      { cat: 'leafy',   key: 'spinach' },
      { cat: 'soft',    key: 'tomato' },
      { cat: 'veg',     key: 'carrot' },
      { cat: 'dairy',   key: 'milk' },
      { cat: 'protein', key: 'bacon' },
      { cat: 'cooked',  key: 'cookedrice' }
    ];
    const STEPS = [0, 0.25, 0.5, 0.75, 0.95, 1.0];
    const SIZE = 150;

    function cell(catName, foodKey, fraction, seed) {
      const f = FOODS[foodKey];
      const cw = FRIDGE_CAT[catName];
      let d, frac, size, isGone;
      if (fraction >= 1) {
        // The drawer path: fraction forced to 1, d just needs to be
        // negative so state(d) resolves to the 'gone' bucket, same as a
        // real past-date item would.
        d = -1;
        frac = 1;
        isGone = true;
        size = Math.max(40, Math.round(SIZE * (1 - 0.18 * cw.shrink)));
      } else {
        d = Math.round((1 - fraction) * f.shelf);
        frac = fraction;
        isGone = false;
        size = Math.max(40, Math.round(SIZE * (1 - frac * 0.22 * cw.shrink)));
      }
      const color = decayColor(d, frac, cw.darken, isGone);
      const shapeStyle = `width:${size}px;height:${size}px`;
      const svg = foodShapeMarkup(cw.shape, color, frac, cw.sag, cw.mold, cw.wrinkle, size, seed);
      const pct = Math.round(fraction * 100);
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:${SIZE + 24}px">
        <div style="height:${SIZE}px;width:100%;display:flex;align-items:flex-end;justify-content:center">
          <div style="${shapeStyle}">${svg}</div>
        </div>
        <div style="font-family:'DM Mono',ui-monospace,monospace;font-size:12px;letter-spacing:.04em;color:#5C6664;text-align:center;white-space:nowrap">
          ${f.en} · ${pct}%</div>
      </div>`;
    }

    const rows = reps.map((r, ri) => {
      const cells = STEPS.map(s => cell(r.cat, r.key, s, ri * 101 + 7)).join('');
      return `<div style="display:flex;gap:20px;align-items:flex-end;padding:20px 0;border-bottom:1px solid #B5BFBB">${cells}</div>`;
    }).join('');

    const container = document.createElement('div');
    container.id = 'decayStudy';
    container.style.cssText =
      'position:fixed;top:0;left:0;background:#E6EAE8;padding:28px;z-index:9999;width:max-content';
    container.innerHTML =
      `<div style="font-family:'DM Mono',ui-monospace,monospace;font-size:14px;letter-spacing:.08em;` +
      `text-transform:uppercase;color:#141817;margin-bottom:18px">` +
      `Decay study — one item per category, 0/25/50/75/95/100% of shelf life</div>${rows}`;
    document.body.appendChild(container);
  });

  const el = await page.$('#decayStudy');
  await el.screenshot({ path: path.join(OUT, 'decay-study.png') });

  if (errors.length) console.log('console errors:', errors);
  console.log('Decay study written to', path.join(OUT, 'decay-study.png'));

  await browser.close();
  server.close();
})();
