#!/usr/bin/env node
// Used some study: every FOODS entry drawn whole, then after "Used some"
// once (half left) and twice (a quarter), then half left at 60% decayed --
// real fridge records drawn through foodShapeMarkupLine exactly as the
// illustrated fridge draws them. Whole food is cut and wrapped in cling
// film; packages are opened instead (cap off, lid ajar, cork out).
//
// Run: node tools/used-some-study.js
// Output: tools/screenshots/used-some-study.png

const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
const PORT = 8983;
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
    const day = today(), SIZE = 96;
    let uid = 61000;
    const mono = "font-family:'tonos-mono-vf',ui-monospace,monospace";
    const draw = (it, frac, label) => {
      const cat = fridgeCatOf(it), shape = fridgeShapeOf(it);
      const size = BOTTLES[shape] ? Math.round(SIZE * 1.25) : SIZE;
      const svg = foodShapeMarkupLine(shape, foodBodyColor(it, frac), frac, cat.sag, cat.mold, cat.wrinkle, size, it.id, food(it).en, usedSomeOf(it), it.key);
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;width:${SIZE + 4}px">
        <div style="height:${Math.round(SIZE * 1.25)}px;display:flex;align-items:flex-end"><div style="width:${size}px;height:${size}px">${svg}</div></div>
        <div style="${mono};font-size:9px;color:#5C6664">${label}</div></div>`;
    };
    const rec = (key, o = {}) => ({id: uid++, key, bought: day, custom: null, ...o});
    const cards = Object.keys(FOODS).map(k => {
      const f = FOODS[k], opened = f.opens != null ? {opened: true} : {}, nm = f.cat === 'leftovers' ? {name: 'Fried rice'} : {};
      const cells = [draw(rec(k, nm), 0, 'whole'), draw(rec(k, {...nm, ...opened, part: 0.5}), 0, 'half'),
        draw(rec(k, {...nm, ...opened, part: 0.25}), 0, 'quarter'), draw(rec(k, {...nm, ...opened, part: 0.5}), 0.6, 'half · 60%')];
      return `<div style="border:1px solid #B5BFBB;background:#E6EAE8;padding:6px 8px">
        <div style="${mono};font-size:9.5px;letter-spacing:.05em;text-transform:uppercase;color:#8B9491;margin-bottom:2px">${f.en} · ${usedSomeOpens(rec(k)) ? 'opened' : 'cut'}</div>
        <div style="display:flex;gap:2px;align-items:flex-end">${cells.join('')}</div></div>`;
    });
    const box = document.createElement('div');
    box.id = 'usedSomeStudy';
    box.style.cssText = 'position:absolute;top:0;left:0;background:#DCE1DF;padding:16px;z-index:9999;width:max-content';
    box.innerHTML = `<div style="${mono};font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#141817;margin-bottom:10px">
      Used some -- cut and wrapped, or opened</div>
      <div style="display:grid;grid-template-columns:repeat(4, max-content);gap:8px">${cards.join('')}</div>`;
    document.body.appendChild(box);
    return {cards: cards.length, nan: box.innerHTML.includes('NaN') || box.innerHTML.includes('undefined')};
  });

  await (await page.$('#usedSomeStudy')).screenshot({ path: path.join(OUT, 'used-some-study.png') });
  if (result.nan) { console.log('NaN or undefined in the markup'); process.exitCode = 1; }
  if (errors.length) { console.log('console errors:', errors); process.exitCode = 1; }
  console.log('Used some study written to', path.join(OUT, 'used-some-study.png'), result);
  await browser.close();
  server.close();
})();
