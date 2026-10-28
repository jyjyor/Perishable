#!/usr/bin/env node
// Design-review render for the real-fridge redraw: the static open fridge,
// 7-item scenario, desktop width, in both body options (data-body cool /
// cream), composited side by side into one image. Same seeding as
// real-fridge-study.js, through the real renderRealFridge().
//
// Run: node tools/real-fridge-redraw-study.js
// Output: tools/screenshots/real-fridge-redraw-7item-desktop-open-bodies.png
//         (plus one file per body option)

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
    const KEYS = ['spinach', 'milk', 'chicken', 'tofu', 'onion', 'tomato', 'carrot'];
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

(async () => {
  const server = await serve();
  const browser = await chromium.launch({executablePath: CHROME_PATH, headless: true});
  const shots = [];
  for (const body of ['cream', 'cool']){
    const page = await (await browser.newContext({deviceScaleFactor: 2})).newPage();
    await page.setViewportSize({width: 1200, height: 1400});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://localhost:${PORT}/index.html?v=${Date.now()}`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#headline');
    await page.evaluate(b => { document.getElementById('rfUnit').dataset.body = b; }, body);
    await seedFridge(page, 7);
    await page.waitForTimeout(1800); // auto-open finished; this render is the static open state
    const file = path.join(OUT, `real-fridge-redraw-7item-desktop-open-${body}.png`);
    await (await page.$('.rf-stage')).screenshot({path: file});
    shots.push({body, file});
    console.log('  wrote', path.basename(file), errors.length ? 'ERRORS ' + JSON.stringify(errors) : '');
    await page.context().close();
  }
  const page = await browser.newPage();
  const imgs = shots.map(s => `<figure><img src="data:image/png;base64,${fs.readFileSync(s.file).toString('base64')}"><figcaption>${s.body}</figcaption></figure>`).join('');
  await page.setContent(`<style>body{margin:0;background:#E6EAE8;display:flex;gap:0}figure{margin:0}img{display:block;width:900px}
    figcaption{font:12px ui-monospace,monospace;color:#5C6664;padding:0 0 14px 24px;text-transform:uppercase;letter-spacing:.06em}</style>${imgs}`);
  const comp = path.join(OUT, 'real-fridge-redraw-7item-desktop-open-bodies.png');
  await page.setViewportSize({width: 1800, height: 800});
  await page.screenshot({path: comp, fullPage: true});
  console.log('  wrote', path.basename(comp));
  await browser.close();
  server.close();
})();
