#!/usr/bin/env node
// Design-review study for the new "real fridge" section (see REPORT.md on
// branch real-fridge). Not a pass/fail test -- renders the actual page at
// several door phases, viewport widths, and fridge populations, through
// the real rfInit()/renderRealFridge() functions and real `fridge` state
// (built via direct object construction, same methodology as
// produce-study.js -- no separate drawing path), so what's approved here
// is what the real page shows.
//
// Run: node tools/real-fridge-study.js
// Output: tools/screenshots/real-fridge-*.png

const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
const PORT = 8947;
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

// Spreads N items across the full urgency range (gone/crit/turn/fresh),
// cycling through a varied set of FOODS keys so shapes/colors differ too.
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
      const shelf = FOODS[key].shelf;
      const fracPattern = [0, 0.35, 0.75, 0.98, 1.15, 1.6]; // past-date at 1.15/1.6
      const frac = fracPattern[i % fracPattern.length];
      const age = Math.round(shelf * frac);
      fridge.push({id: uid++, key, bought: day - age});
    }
    render();
  }, n);
}

async function freshPage(browser, viewport){
  const page = await (await browser.newContext()).newPage();
  if (viewport) await page.setViewportSize(viewport);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html?v=${Date.now()}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#headline');
  return {page, errors};
}

async function shoot(page, name){
  const rf = await page.$('#rf');
  await rf.screenshot({path: path.join(OUT, `real-fridge-${name}.png`)});
  console.log('  wrote', name);
}

(async () => {
  const server = await serve();
  const browser = await chromium.launch({executablePath: CHROME_PATH, headless: true});
  const DESKTOP = {width: 1200, height: 900};
  const PHONE = {width: 390, height: 900};

  // --- Door phases, 7-item fridge, desktop ---
  {
    const {page, errors} = await freshPage(browser, DESKTOP);
    await seedFridge(page, 7);
    await shoot(page, '7item-desktop-closed'); // before rfInit's 500ms auto-open timer fires
    await page.waitForTimeout(500 + 380); // ~38% into the 1s transition
    await shoot(page, '7item-desktop-midswing');
    await page.waitForTimeout(1200);
    await shoot(page, '7item-desktop-open');
    if (errors.length) console.log('  console errors:', errors);
    await page.context().close();
  }

  // --- Door phases, 7-item fridge, phone ---
  {
    const {page, errors} = await freshPage(browser, PHONE);
    await seedFridge(page, 7);
    await shoot(page, '7item-phone-closed');
    await page.waitForTimeout(500 + 380);
    await shoot(page, '7item-phone-midswing');
    await page.waitForTimeout(1200);
    await shoot(page, '7item-phone-open');
    if (errors.length) console.log('  console errors:', errors);
    await page.context().close();
  }

  // --- Populations: empty, desktop + phone ---
  for (const [vpName, vp] of [['desktop', DESKTOP], ['phone', PHONE]]){
    const {page, errors} = await freshPage(browser, vp);
    await page.waitForTimeout(1600); // let it auto-open
    await shoot(page, `empty-${vpName}-open`);
    if (errors.length) console.log('  console errors:', errors);
    await page.context().close();
  }

  // --- Populations: 25 items, desktop + phone ---
  for (const [vpName, vp] of [['desktop', DESKTOP], ['phone', PHONE]]){
    const {page, errors} = await freshPage(browser, vp);
    await seedFridge(page, 25);
    await page.waitForTimeout(1600);
    await shoot(page, `25item-${vpName}-open`);
    if (errors.length) console.log('  console errors:', errors);
    await page.context().close();
  }

  // --- Item tap popover + handle toggle (desktop, 7 items) ---
  {
    const {page, errors} = await freshPage(browser, DESKTOP);
    await seedFridge(page, 7);
    await page.waitForTimeout(1600);
    await page.click('.rf-fooditem[data-rf-item]');
    await page.waitForTimeout(150);
    await shoot(page, '7item-desktop-popover');
    await page.click('#rfHandle'); // close
    await page.waitForTimeout(1200);
    await shoot(page, '7item-desktop-closed-by-handle');
    if (errors.length) console.log('  console errors:', errors);
    await page.context().close();
  }

  await browser.close();
  server.close();
  console.log('Real fridge study written to', OUT);
})();
