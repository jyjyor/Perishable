#!/usr/bin/env node
// Fridge contents study: the condiments, the frozen packages and the
// leftovers container, each a real fridge record drawn through
// foodShapeMarkupLine (and freezerBurnMarkup for frozen ones) exactly as
// the illustrated fridge draws it -- no separate drawing path.
//   Condiments: unopened at 0/50/100% of their time, and opened (where
//     FoodKeeper gives an after-opening figure) at 0/50/100%.
//   Frozen: fresh, and with freezer burn at 50 and 100%.
//   Leftovers: 0/50/80/100%, the dish's name on the tape.
//
// Run: node tools/fridge-contents-study.js
// Output: tools/screenshots/fridge-contents-study.png

const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
const PORT = 8981;
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
    const day = today(), SIZE = 120;
    let uid = 52000;
    const mono = "font-family:'tonos-mono-vf',ui-monospace,monospace";
    const draw = (it, frac, burn) => {
      const cat = fridgeCatOf(it), shape = fridgeShapeOf(it);
      const size = BOTTLES[shape] ? Math.round(SIZE * 1.25) : SIZE;
      let svg = foodShapeMarkupLine(shape, foodBodyColor(it, frac), frac, cat.sag, cat.mold, cat.wrinkle, size, it.id, food(it).en);
      if (burn != null) svg = freezerBurnMarkup(svg, burn, it.id);
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:${SIZE + 10}px">
        <div style="height:${Math.round(SIZE * 1.25)}px;display:flex;align-items:flex-end"><div style="width:${size}px;height:${size}px">${svg}</div></div>
        <div style="${mono};font-size:10px;color:#5C6664">${burn != null ? 'burn ' + Math.round(burn * 100) : Math.round(frac * 100)}%</div></div>`;
    };
    const rec = (key, o = {}) => ({id: uid++, key, bought: day, custom: null, ...o});
    const card = (title, cells) => `<div style="border:1px solid #B5BFBB;background:#E6EAE8;padding:10px 12px">
      <div style="${mono};font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#8B9491;margin-bottom:6px">${title}</div>
      <div style="display:flex;gap:4px;align-items:flex-end">${cells.join('')}</div></div>`;
    const cards = [];
    const condiments = Object.keys(FOODS).filter(k => FOODS[k].cat === 'condiments').concat(['butter']);
    condiments.forEach(k => {
      const f = FOODS[k], cells = [0, 0.5, 1].map(t => draw(rec(k), t));
      if (f.opens != null) cells.push(...[0, 0.5, 1].map(t => draw(rec(k, {opened: true}), t)));
      cards.push(card(`${f.en} · #${f.fk} · ${f.opens != null ? 'unopened, then opened' : 'nothing asked'}`, cells));
    });
    Object.keys(FOODS).filter(k => FOODS[k].cat === 'frozen').forEach(k => {
      cards.push(card(`${FOODS[k].en} · #${FOODS[k].fk} · frozen`, [null, 0.5, 1].map(b => draw(rec(k, {frozen: true}), 0, b == null ? 0 : b))));
    });
    cards.push(card('Leftovers · #173 · named for the dish', [0, 0.5, 0.8, 1].map(t => draw(rec('leftovers', {name: 'Tomato egg stir-fry'}), t))));
    cards.push(card('Leftovers · #174 · typed "takeout"', [0, 0.8].map(t => draw(rec('leftoversveg', {name: 'Takeout'}), t))));
    const box = document.createElement('div');
    box.id = 'contentsStudy';
    box.style.cssText = 'position:absolute;top:0;left:0;background:#DCE1DF;padding:20px;z-index:9999;width:max-content';
    box.innerHTML = `<div style="${mono};font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#141817;margin-bottom:12px">
      Fridge contents -- condiments, frozen packages, leftovers</div>
      <div style="display:grid;grid-template-columns:repeat(2, max-content);gap:10px">${cards.join('')}</div>`;
    document.body.appendChild(box);
    return {cards: cards.length, nan: box.innerHTML.includes('NaN')};
  });

  await (await page.$('#contentsStudy')).screenshot({ path: path.join(OUT, 'fridge-contents-study.png') });
  if (result.nan) { console.log('NaN in the markup'); process.exitCode = 1; }
  if (errors.length) { console.log('console errors:', errors); process.exitCode = 1; }
  console.log('Fridge contents study written to', path.join(OUT, 'fridge-contents-study.png'), result);
  await browser.close();
  server.close();
})();
