#!/usr/bin/env node
// Drinks study: the bottles (beer, red and white wine unopened
// and opened, vodka), each at 0/50/100% of its shelf life at
// study size, then fresh at the size the All items row gives it. Same
// methodology as fruit-study.js: real fridge-item objects through
// leftAt()/decayFraction() and foodShapeMarkupLine -- no separate drawing
// path. Beer has no FoodKeeper number, so it is given a printed date (as
// at entry); vodka keeps, so it never decays and every cell is the same.
//
// Run: node tools/drinks-study.js
// Output: tools/screenshots/drinks-study.png

const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
const PORT = 8978;
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
    // [title, record extras]: what entry would store for each.
    const ROWS = [
      ['Beer · printed date 120 days', {key: 'beer', shelf: 120, shelfFrom: 'date'}],
      ['Red wine · unopened', {key: 'redwine'}],
      ['Red wine · opened', {key: 'redwine', opened: true}],
      ['White wine · opened', {key: 'whitewine', opened: true}],
      ['Vodka · keeps', {key: 'vodka'}],
    ];
    let uid = 31000;
    function cellAt(extra, targetFraction, shelfSize){
      const probe = {id: 0, bought: day, ...extra};
      const shelf = keeps(probe) ? 0 : shelfOf(probe);
      const age = shelfSize ? 0 : Math.round(targetFraction * shelf);
      const it = {id: uid++, bought: day - age, ...extra};
      const d = leftAt(it, day);
      const frac = decayFraction(it, day);
      const cat = fridgeCatOf(it);
      const size = shelfSize ? Math.round(44 + (1 - pos(Math.max(0, d)) / 100) * 130)
        : Math.max(16, Math.round(STUDY * (1 - frac * 0.22 * (PACKAGED_SHAPES[fridgeShapeOf(it)] ? 0 : cat.shrink))));
      const svg = foodShapeMarkupLine(fridgeShapeOf(it), foodBodyColor(it, frac), frac, cat.sag, cat.mold, cat.wrinkle, size, it.id);
      return {svg, size, label: shelfSize ? `shelf, fresh · ${size}px` : `${Math.round(targetFraction * 100)}% · ${Math.round(frac * 100)}% actual · ${shortLeft(it, d)}`};
    }
    const cellMarkup = (cell, colSize) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:${colSize + 16}px">
        <div style="height:${colSize}px;width:100%;display:flex;align-items:flex-end;justify-content:center">
          <div style="width:${cell.size}px;height:${cell.size}px">${cell.svg}</div></div>
        <div style="font-family:'tonos-mono-vf',ui-monospace,monospace;font-size:10px;letter-spacing:.03em;color:#5C6664;text-align:center">${cell.label}</div></div>`;
    const card = ([title, extra]) => `<div style="border:1px solid #B5BFBB;background:#E6EAE8;padding:12px 14px">
        <div style="font-family:'tonos-mono-vf',ui-monospace,monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8B9491;margin-bottom:8px">${title} · ${fridgeShapeOf({id: 0, bought: day, ...extra})} · ${shelfSourceOf({id: 0, bought: day, ...extra})}</div>
        <div style="display:flex;gap:10px;align-items:flex-end">
          ${cellMarkup(cellAt(extra, 0), STUDY)}${cellMarkup(cellAt(extra, 0.5), STUDY)}${cellMarkup(cellAt(extra, 1), STUDY)}
          <div style="width:1px;align-self:stretch;background:#B5BFBB"></div>${cellMarkup(cellAt(extra, 0, true), 174)}
        </div></div>`;

    const container = document.createElement('div');
    container.id = 'drinksStudy';
    container.style.cssText = 'position:absolute;top:0;left:0;background:#DCE1DF;padding:24px;z-index:9999;width:max-content';
    container.innerHTML = `<div style="font-family:'tonos-mono-vf',ui-monospace,monospace;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#141817;margin-bottom:14px">
        Drinks -- 0/50/100% of shelf life at study size, then fresh at its own size on the All items shelf</div>
      <div style="display:grid;grid-template-columns:repeat(2, max-content);gap:14px">${ROWS.map(card).join('')}</div>`;
    document.body.appendChild(container);
    return {rows: ROWS.length};
  });

  const el = await page.$('#drinksStudy');
  await el.screenshot({ path: path.join(OUT, 'drinks-study.png') });

  if (errors.length) { console.log('console errors:', errors); process.exitCode = 1; }
  console.log('Drinks study written to', path.join(OUT, 'drinks-study.png'), result);

  await browser.close();
  server.close();
})();
