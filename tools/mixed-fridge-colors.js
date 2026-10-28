#!/usr/bin/env node
// One-off: ~10-item mixed fridge screenshot showing the new per-FOODS-entry
// base colors (natureColor(foodBaseColor(it), frac)) across a realistic
// mixed haul -- a range of categories and decay stages, not just the four
// produce items from produce-study.js. Same methodology as the other
// studies: real entry text through the real #entry/#addbtn flow, so the
// shelf shown is exactly what the app itself renders.
//
// Run: node tools/mixed-fridge-colors.js
// Output: tools/screenshots/mixed-fridge-colors.png

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
  const page = await (await browser.newContext()).newPage();
  await page.setViewportSize({ width: 390, height: 1600 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`http://localhost:${PORT}/index.html?v=${Date.now()}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#headline');

  // 10 items spanning categories (soft/veg/leafy/dairy/protein) and decay
  // stages, including all four of the newly-shaped/colored produce items.
  await page.fill('#entry',
    'potato, apple 14d, banana 2d, tomato 1d, mushroom 1d, ' +
    'spinach 1d, carrot 10d, egg 20d, cheese 30d, chicken 1d');
  await page.click('#addbtn');
  await page.waitForTimeout(150);

  const fridgeCount = await page.textContent('#fridgeCount');
  console.log('fridge count:', fridgeCount.trim());

  const el = await page.$('#fridgeview') || await page.$('body');
  await el.screenshot({ path: path.join(OUT, 'mixed-fridge-colors.png') });

  if (errors.length) console.log('console errors:', errors);
  console.log('Mixed fridge colors screenshot written to', path.join(OUT, 'mixed-fridge-colors.png'));

  await browser.close();
  server.close();
})();
