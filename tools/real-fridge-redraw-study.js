#!/usr/bin/env node
// Design-review render for the real-fridge redraw: the static open fridge
// (cream body) for the 7-item scenario and the ~25-item haul at desktop
// width, and the 7-item scenario at phone width. Same seeding as
// real-fridge-study.js, through the real renderRealFridge().
//
// Run: node tools/real-fridge-redraw-study.js
// Output: tools/screenshots/real-fridge-redraw-*.png

const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
const PORT = 8948;
const CHROME_PATH = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
fs.mkdirSync(OUT, { recursive: true });

function serve(){
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

async function seedFridge(page, n){
  await page.evaluate(n => {
    const KEYS = ['spinach', 'milk', 'chicken', 'tofu', 'onion', 'tomato', 'carrot',
      'pepper', 'broccoli', 'mushroom', 'potato', 'lemon', 'mango', 'apple', 'banana',
      'cheese', 'cookedrice', 'bokchoy', 'cucumber', 'zucchini', 'cauliflower', 'corn',
      'beef', 'bacon', 'egg', 'yogurt', 'garlic', 'ginger'];
    const day = today();
    fridge = [];
    for (let i = 0; i < n; i++){
      const key = KEYS[i % KEYS.length];
      const fracPattern = [0, 0.35, 0.75, 0.98, 1.15, 1.6];
      fridge.push({id: uid++, key, bought: day - Math.round(FOODS[key].shelf * fracPattern[i % fracPattern.length])});
    }
    render();
  }, n);
}

const SHOTS = [
  {name: '7item-desktop', n: 7, vp: {width: 1200, height: 1400}},
  {name: '25item-desktop', n: 25, vp: {width: 1200, height: 1400}},
  {name: '7item-phone', n: 7, vp: {width: 390, height: 1000}},
];

(async () => {
  const server = await serve();
  const browser = await chromium.launch({executablePath: CHROME_PATH, headless: true});
  const only = process.argv.slice(2);
  for (const shot of SHOTS.filter(s => !only.length || only.includes(s.name))){
    const page = await (await browser.newContext({deviceScaleFactor: 2})).newPage();
    await page.setViewportSize(shot.vp);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://localhost:${PORT}/index.html?v=${Date.now()}`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#headline');
    await seedFridge(page, shot.n);
    await page.waitForTimeout(1800); // auto-open finished; this render is the static open state
    const file = path.join(OUT, `real-fridge-redraw-${shot.name}-open.png`);
    await (await page.$('.rf-stage')).screenshot({path: file});
    console.log('  wrote', path.basename(file), errors.length ? 'ERRORS ' + JSON.stringify(errors) : '');
    await page.context().close();
  }
  await browser.close();
  server.close();
})();
