#!/usr/bin/env node
// Drinks and guava study: every bottle form (BOTTLE_PROFILES) through a
// drink that uses it -- beer, canned beer, red and white wine unopened and
// opened, vodka, whiskey, cream liqueur -- and guava, each at 0/50/100% of
// its shelf life at study size, then fresh at the size the All items row
// gives it; then every drink in FOODS, fresh, side by side. Same
// methodology as fruit-study.js: real fridge-item objects through
// leftAt()/decayFraction() and foodShapeMarkupLine -- no separate drawing
// path. Beer and cans have no FoodKeeper number, so they are given a
// printed date (as at entry); spirits keep, so every cell is the same.
// Sparkling wine, rosé and vermouth (estimated, Iowa State Extension's
// opened figures) are drawn opened and, unopened, with a printed date;
// sake and soju with a printed date.
//
// Run: node tools/drinks-guava-study.js
// Output: tools/screenshots/drinks-guava-study.png

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
      ['Long-neck · Beer · printed date 120 days', {key: 'beer', shelf: 120, shelfFrom: 'date'}],
      ['Can · Canned beer · printed date 120 days', {key: 'cannedbeer', shelf: 120, shelfFrom: 'date'}],
      ['Still wine · Red wine · unopened', {key: 'redwine'}],
      ['Still wine · Red wine · opened', {key: 'redwine', opened: true}],
      ['Still wine · White wine · opened', {key: 'whitewine', opened: true}],
      ['Tall spirit · Vodka · keeps', {key: 'vodka'}],
      ['Square · Whiskey · keeps', {key: 'whiskey'}],
      ['Square · Cream liqueur', {key: 'creamliqueur'}],
      ['Sparkling · Sparkling wine · opened', {key: 'sparklingwine', opened: true}],
      ['Sparkling · Sparkling wine · printed date 120 days', {key: 'sparklingwine', shelf: 120, shelfFrom: 'date'}],
      ['Still wine · Rosé · opened', {key: 'rose', opened: true}],
      ['Still wine · Vermouth · opened', {key: 'vermouth', opened: true}],
      ['Sake · Sake · printed date 120 days', {key: 'sake', shelf: 120, shelfFrom: 'date'}],
      ['Small green · Soju · printed date 120 days', {key: 'soju', shelf: 120, shelfFrom: 'date'}],
      ['Guava · ripe', {key: 'guava'}],
    ];
    let uid = 31000;
    function cellAt(extra, targetFraction, shelfSize){
      if (extra.form){
        const size = shelfSize ? 44 : STUDY;
        const svg = foodShapeMarkupLine(extra.form, '#dbe6e8', targetFraction, 0, 0, 0, size, uid++);
        return {svg, size, label: shelfSize ? `shelf size · ${size}px` : `${Math.round(targetFraction * 100)}% (drawn directly)`};
      }
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
    const head = extra => extra.form ? 'no FOODS entry' : `${fridgeShapeOf({id: 0, bought: day, ...extra})} · ${shelfSourceOf({id: 0, bought: day, ...extra})}`;
    const card = ([title, extra]) => `<div style="border:1px solid #B5BFBB;background:#E6EAE8;padding:12px 14px">
        <div style="font-family:'tonos-mono-vf',ui-monospace,monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8B9491;margin-bottom:8px">${title} · ${head(extra)}</div>
        <div style="display:flex;gap:10px;align-items:flex-end">
          ${cellMarkup(cellAt(extra, 0), STUDY)}${cellMarkup(cellAt(extra, 0.5), STUDY)}${cellMarkup(cellAt(extra, 1), STUDY)}
          <div style="width:1px;align-self:stretch;background:#B5BFBB"></div>${cellMarkup(cellAt(extra, 0, true), 174)}
        </div></div>`;

    const DRINKS = Object.keys(FOODS).filter(k => FOODS[k].cat === 'drinks');
    const drinkCell = key => {
      const it = {id: uid++, key, bought: day, ...(FOODS[key].pkgDate ? {shelf: 120, shelfFrom: 'date'} : {})};
      const cat = fridgeCatOf(it);
      const svg = foodShapeMarkupLine(fridgeShapeOf(it), foodBodyColor(it, 0), 0, cat.sag, cat.mold, cat.wrinkle, 120, it.id);
      return cellMarkup({svg, size: 120, label: FOODS[key].en}, 120).replace(/width:136px/, 'width:96px');
    };
    const container = document.createElement('div');
    container.id = 'drinksStudy';
    container.style.cssText = 'position:absolute;top:0;left:0;background:#DCE1DF;padding:24px;z-index:9999;width:max-content';
    container.innerHTML = `<div style="font-family:'tonos-mono-vf',ui-monospace,monospace;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#141817;margin-bottom:14px">
        Drinks and guava -- 0/50/100% of shelf life at study size, then fresh at its own size on the All items shelf</div>
      <div style="display:grid;grid-template-columns:repeat(2, max-content);gap:14px">${ROWS.map(card).join('')}</div>
      <div style="border:1px solid #B5BFBB;background:#E6EAE8;padding:12px 14px;margin-top:14px">
        <div style="font-family:'tonos-mono-vf',ui-monospace,monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8B9491;margin-bottom:8px">Every drink in FOODS, fresh, at 120px</div>
        <div style="display:flex;gap:4px;align-items:flex-end;flex-wrap:wrap">${DRINKS.map(drinkCell).join('')}</div></div>`;
    document.body.appendChild(container);
    return {rows: ROWS.length};
  });

  const el = await page.$('#drinksStudy');
  await el.screenshot({ path: path.join(OUT, 'drinks-guava-study.png') });

  if (errors.length) { console.log('console errors:', errors); process.exitCode = 1; }
  console.log('Drinks and guava study written to', path.join(OUT, 'drinks-guava-study.png'), result);

  await browser.close();
  server.close();
})();
