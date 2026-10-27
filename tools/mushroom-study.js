#!/usr/bin/env node
// Mushroom body-fill study: compares two directions for what colors the
// food body now that the urgency bucket has moved to the label (name +
// days-left) instead -- A (natural: cream through brown to near-black)
// and B (neutral ink-and-wash: one wash, darkening with decay), each at
// study size and at the real front-row/back-row shelf sizes
// layoutShelfRow() actually produces. Builds real fridge-item objects
// (id, key, bought) and lets the app's own leftAt()/decayFraction() derive
// the fraction from a purchase date, same as before -- only the final
// assembly (foodShapeMarkupLine) and which color function feeds it differ.
//
// Run: node tools/mushroom-study.js
// Output: tools/screenshots/mushroom-study.png

const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
const PORT = 8957;
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
    const day = today();
    const targets = [0, 0.25, 0.5, 0.75, 0.95, 1.0];
    // Real layoutShelfRow() sizing: size = 34 + frontness*70, frontness 1
    // at the front (d=0) down to 0 at the back (d>=21). Study size is just
    // "large enough to inspect," same as the earlier study.
    const SIZES = { study: 220, front: 104, back: 34 };
    const FILLS = { A: natureColor, B: neutralWashColor };

    // Real item + real fraction, same as before. color now comes from the
    // chosen body-fill direction (A/B), never decayColor() -- that's only
    // the label's job now, matching the list/legend's own bucket lookup.
    function cellFor(targetFraction, uid, fillKey, baseSize) {
      let it, frac, d, isGone;
      if (targetFraction >= 1) {
        it = { id: uid, key: 'mushroom', bought: day - (FOODS.mushroom.shelf + 4) };
        d = leftAt(it, day);
        frac = 1;
        isGone = true;
      } else {
        const age = Math.round(targetFraction * FOODS.mushroom.shelf);
        it = { id: uid, key: 'mushroom', bought: day - age };
        d = leftAt(it, day);
        frac = decayFraction(it, day);
        isGone = false;
      }
      const cat = fridgeCatOf(it);
      const shape = fridgeShapeOf(it);
      const bodyColor = FILLS[fillKey](frac);
      const labelColor = COLOR[state(d)]; // the one place urgency still shows
      const size = isGone
        ? Math.round(baseSize * (1 - 0.18 * cat.shrink))
        : Math.max(16, Math.round(baseSize * (1 - frac * 0.22 * cat.shrink)));
      const svg = foodShapeMarkupLine(shape, bodyColor, frac, cat.sag, cat.mold, cat.wrinkle, size, it.id);
      const dayLabel = isGone ? Math.abs(d) + 'd gone' : (d === 0 ? 'today' : d + 'd');
      return { svg, size, frac, dayLabel, labelColor };
    }

    function buildRow(fillKey, sizeKey, idOffset) {
      const baseSize = SIZES[sizeKey];
      const cells = targets.map((t, i) => {
        const { svg, size, frac, dayLabel, labelColor } = cellFor(t, idOffset + i, fillKey, baseSize);
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:${Math.max(120, baseSize + 40)}px">
          <div style="height:${baseSize}px;width:100%;display:flex;align-items:flex-end;justify-content:center">
            <div style="width:${size}px;height:${size}px">${svg}</div>
          </div>
          <div style="font-family:'DM Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.04em;color:${labelColor};text-align:center">
            Mushrooms<br>${dayLabel}</div>
          <div style="font-family:'DM Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.03em;color:#8B9491;text-align:center">
            ${Math.round(t * 100)}%&nbsp;target&nbsp;·&nbsp;${Math.round(frac * 100)}%&nbsp;actual</div>
        </div>`;
      }).join('');
      return `<div style="display:flex;gap:4px;align-items:flex-end;border-bottom:1px solid #B5BFBB;padding-bottom:6px">${cells}</div>`;
    }

    function sectionLabel(text){
      return `<div style="font-family:'DM Mono',ui-monospace,monospace;font-size:12px;letter-spacing:.06em;` +
        `text-transform:uppercase;color:#5C6664;margin-top:14px">${text}</div>`;
    }

    let idOffset = 9000;
    const sections = [];
    [['A', 'A -- natural tones'], ['B', 'B -- neutral ink-and-wash']].forEach(([fillKey, fillLabel]) => {
      [['study', 'study size'], ['front', 'front-row shelf size (104px)'], ['back', 'back-row shelf size (34px)']].forEach(([sizeKey, sizeLabel]) => {
        sections.push(sectionLabel(`${fillLabel} -- ${sizeLabel}`));
        sections.push(buildRow(fillKey, sizeKey, idOffset));
        idOffset += 10;
      });
    });

    const container = document.createElement('div');
    container.id = 'mushroomStudy';
    container.style.cssText =
      'position:fixed;top:0;left:0;background:#E6EAE8;padding:32px;z-index:9999;width:max-content;display:flex;flex-direction:column;gap:6px';
    container.innerHTML =
      `<div style="font-family:'DM Mono',ui-monospace,monospace;font-size:14px;letter-spacing:.08em;` +
      `text-transform:uppercase;color:#141817">Mushroom body-fill study -- bucket color moved to the label; ` +
      `body fill is A (natural) or B (neutral wash); line-art throughout</div>` +
      sections.join('');
    document.body.appendChild(container);
  });

  const el = await page.$('#mushroomStudy');
  await el.screenshot({ path: path.join(OUT, 'mushroom-study.png') });

  if (errors.length) console.log('console errors:', errors);
  console.log('Mushroom study written to', path.join(OUT, 'mushroom-study.png'));

  await browser.close();
  server.close();
})();
