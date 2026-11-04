#!/usr/bin/env node
// Freezer burn study: frozen food doesn't rot, so as its freezer time
// (FoodKeeper's freezer value) runs out it shows freezer burn instead -- a
// frost rim that thickens and pale, dry patches. Each food here is a real
// frozen fridge record, frozen on a day chosen so burnFraction() lands on
// 0, 50 and 100%, drawn through foodShapeMarkupLine and
// freezerBurnMarkup exactly as the illustrated fridge and the All items
// row draw it -- no separate drawing path. A spirit keeps, so it only
// ever has the thin rim.
//
// Run: node tools/freezer-burn-study.js
// Output: tools/screenshots/freezer-burn-study.png

const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
const PORT = 8979;
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
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html?v=${Date.now()}`);
  await page.waitForSelector('#headline');

  const result = await page.evaluate(() => {
    const day = today();
    const SIZE = 130;
    const KEYS = ['chicken', 'shrimp', 'steak', 'broccoli', 'blueberry', 'strawberry', 'bread', 'corn', 'butter', '_fk_317', 'vodka'];
    let uid = 41000;
    const cell = (key, target) => {
      const probe = {id: 0, key, bought: day, frozen: true, clockFrom: day};
      const s = shelfOf(probe);
      const age = s && s !== Infinity ? Math.round(target * s) : 0;
      const it = {id: uid++, key, bought: day - age, frozen: true, clockFrom: day - age, custom: null};
      if (key.startsWith('_fk_')) it.name = 'Ice cream';
      const burn = burnFraction(it, day);
      const cat = fridgeCatOf(it);
      const shape = fridgeShapeOf(it);
      const size = BOTTLES[shape] ? Math.round(SIZE * 1.2) : SIZE;
      let svg = foodShapeMarkupLine(shape, foodBodyColor(it, 0), 0, cat.sag, cat.mold, cat.wrinkle, size, it.id);
      svg = freezerBurnMarkup(svg, burn, it.id);
      const fl = frozenLeftAt(it, day);
      const label = `${Math.round(target * 100)}% · ${Math.round(burn * 100)}% actual · ${keeps(it) ? 'keeps' : fl + 'd left'}`;
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:${SIZE + 24}px">
        <div style="height:${Math.round(SIZE * 1.2)}px;display:flex;align-items:flex-end"><div style="width:${size}px;height:${size}px">${svg}</div></div>
        <div style="font-family:'tonos-mono-vf',ui-monospace,monospace;font-size:10px;color:#5C6664;text-align:center">${label}</div></div>`;
    };
    const card = key => {
      const probe = {id: 0, key, bought: day, frozen: true, clockFrom: day, name: key.startsWith('_fk_') ? 'Ice cream' : undefined};
      return `<div style="border:1px solid #B5BFBB;background:#E6EAE8;padding:12px 14px">
        <div style="font-family:'tonos-mono-vf',ui-monospace,monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8B9491;margin-bottom:8px">${food(probe).en} · ${shelfSourceOf(probe)}</div>
        <div style="display:flex;gap:8px;align-items:flex-end">${cell(key, 0)}${cell(key, 0.5)}${cell(key, 1)}</div></div>`;
    };
    const box = document.createElement('div');
    box.id = 'burnStudy';
    box.style.cssText = 'position:absolute;top:0;left:0;background:#DCE1DF;padding:24px;z-index:9999;width:max-content';
    box.innerHTML = `<div style="font-family:'tonos-mono-vf',ui-monospace,monospace;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#141817;margin-bottom:14px">
        Freezer burn -- 0/50/100% of FoodKeeper's freezer time</div>
      <div style="display:grid;grid-template-columns:repeat(3, max-content);gap:14px">${KEYS.map(card).join('')}</div>`;
    document.body.appendChild(box);
    return {foods: KEYS.length};
  });

  await (await page.$('#burnStudy')).screenshot({ path: path.join(OUT, 'freezer-burn-study.png') });
  if (errors.length) { console.log('console errors:', errors); process.exitCode = 1; }
  console.log('Freezer burn study written to', path.join(OUT, 'freezer-burn-study.png'), result);
  await browser.close();
  server.close();
})();
