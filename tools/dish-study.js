#!/usr/bin/env node
// Dish study: every dish in DISHES drawn through dishMarkup exactly as the
// Kitchen's cutting board draws it (large) and as the meal plates and the
// line under the bag draw it (small): its vessel, its own ingredients cut
// and cooked inside, steam over a hot one. Labelled with the dish's
// vessel and meals.
//
// Run: node tools/dish-study.js
// Output: tools/screenshots/dish-study.png

const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
const PORT = 8987;
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
    const mono = "font-family:'tonos-mono-vf',ui-monospace,monospace";
    const cards = DISHES.map(d => `<div style="border:1px solid #B5BFBB;background:#E6EAE8;padding:6px 8px;width:196px">
        <div style="${mono};font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:#8B9491">${d.vessel}${d.hot ? ' · hot' : ''} · ${d.meals.join(', ')}</div>
        <div style="font-family:Georgia,serif;font-size:12px;color:#141817;min-height:30px">${d.name}</div>
        <div style="display:flex;align-items:flex-end;gap:8px"><div style="width:140px;height:140px">${dishMarkup(d, 140)}</div>
        <div style="width:40px;height:40px">${dishMarkup(d, 40)}</div></div></div>`);
    const box = document.createElement('div');
    box.id = 'dishStudy';
    box.style.cssText = 'position:absolute;top:0;left:0;background:#DCE1DF;padding:16px;z-index:9999;width:max-content';
    box.innerHTML = `<div style="${mono};font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#141817;margin-bottom:10px">
      Dishes -- vessel, ingredients cut and cooked, large and small</div>
      <div style="display:grid;grid-template-columns:repeat(6, max-content);gap:8px">${cards.join('')}</div>`;
    document.body.appendChild(box);
    return {dishes: cards.length, nan: box.innerHTML.includes('NaN') || box.innerHTML.includes('undefined')};
  });

  await (await page.$('#dishStudy')).screenshot({ path: path.join(OUT, 'dish-study.png') });
  if (result.nan) { console.log('NaN or undefined in the markup'); process.exitCode = 1; }
  if (errors.length) { console.log('console errors:', errors); process.exitCode = 1; }
  console.log('Dish study written to', path.join(OUT, 'dish-study.png'), result);
  await browser.close();
  server.close();
})();
