#!/usr/bin/env node
// Drawings study: every FOODS entry's drawing, for the recognition audit.
// Every drawing goes through foodShapeMarkupLine (and freezerBurnMarkup)
// exactly as the illustrated fridge draws it, with the fridge's wobble
// filter -- no separate drawing path.
//
//   node tools/drawings-study.js sheet [out] [key,key...]
//     Labelled contact sheets, one per category: each food fresh large,
//     100% decayed large, and fresh at phone shelf size (40 CSS px at 3x).
//     Given keys, only those foods (a sheet of the flagged drawings).
//     -> tools/screenshots/<out|drawings>/sheet-<group>.png
//   node tools/drawings-study.js contexts [out]
//     Every place a food is drawn, per category: fresh, 50%, 100%, Used
//     some (half, wrapped or opened), half at 60%, frozen with full freezer
//     burn, and cut for a dish (no film).
//     -> tools/screenshots/<out|drawings>/contexts-<group>.png
//   node tools/drawings-study.js blind <name> [group,group...]
//     The blind recognition test, unlabelled: one PNG per drawing per
//     condition (fresh large, 100% decayed large, phone shelf size), shuffled
//     and numbered, plus confusable pairs side by side (A and B); key.json
//     holds the answers; sheet-*.png are the same drawings numbered on one
//     page each, for running the test with people.
//     -> tools/screenshots/blind-<name>/
//
// HTML=path loads that file as index.html instead (a before/after: check
// out an older index.html to a temp file and point HTML at it).

const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
const PORT = 8979;
const CHROME_PATH = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HTML = process.env.HTML ? path.resolve(process.env.HTML) : path.join(ROOT, 'index.html');

// The categories the drawings are redrawn in, in order. Soft produce that
// is a vegetable is drawn with the vegetables.
const GROUPS = ['leafy', 'veg', 'fruit', 'protein', 'dairy', 'cooked', 'drinks', 'condiments', 'frozen'];
const GROUP_TITLE = {leafy: 'Leafy greens', veg: 'Vegetables', fruit: 'Fruit and soft produce', protein: 'Protein',
  dairy: 'Dairy', cooked: 'Cooked and deli', drinks: 'Drinks', condiments: 'Condiments', frozen: 'Frozen'};
const SOFT_VEG = ['tomato', 'cherrytomato', 'cucumber', 'pepper', 'zucchini', 'chineseeggplant', 'mushroom', 'enoki', 'shiitake'];
// Pairs a person could mix up, shown side by side.
const PAIRS = [
  ['apple', 'tomato'], ['lemon', 'lime'], ['orange', 'mandarin'], ['cilantro', 'parsley'], ['steak', 'porkchop'],
  ['beef', 'groundturkey'], ['chicken', 'chickenthigh'], ['romaine', 'leaflettuce'], ['bokchoy', 'choysum'],
  ['gailan', 'choysum'], ['cabbage', 'napacabbage'], ['scallion', 'leek'], ['scallion', 'garlicchives'],
  ['basil', 'spinach'], ['kale', 'arugula'], ['zucchini', 'cucumber'], ['potato', 'sweetpotato'], ['potato', 'taro'],
  ['carrot', 'babycarrot'], ['peach', 'apricotless'], ['plum', 'fig'], ['blueberry', 'blackberry'],
  ['raspberry', 'strawberry'], ['cantaloupe', 'honeydew'], ['orange', 'grapefruit'], ['pear', 'asianpear'],
  ['daikon', 'carrot'], ['broccoli', 'cauliflower'], ['greenbeans', 'snowpeas'], ['snowpeas', 'edamame'],
  ['yogurt', 'sourcream'], ['cottagecheese', 'creamcheese'], ['milk', 'heavycream'], ['halfandhalf', 'heavycream'],
  ['shreddedcheese', 'stringcheese'], ['hardcheese', 'butter'], ['flourtortilla', 'corntortilla'], ['salsa', 'jarredsalsa'],
  ['hummus', 'salsa'], ['ketchup', 'bbqsauce'], ['soysauce', 'oystersauce'], ['mayonnaise', 'creamydressing'],
  ['mustard', 'mayonnaise'], ['jam', 'jarredsalsa'], ['vodka', 'gin'], ['redwine', 'whitewine'], ['beer', 'cannedbeer'],
  ['hardcider', 'hardseltzer'], ['frozenberries', 'frozenveg'], ['icecream', 'icepops'], ['salmon', 'steak'],
  ['shrimp', 'salmon'], ['mushroom', 'shiitake'], ['pepper', 'tomato'], ['bacon', 'steak']
].filter(p => !p.includes('apricotless'));

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      const file = url === '/index.html' ? HTML : path.join(ROOT, url);
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    server.listen(PORT, () => resolve(server));
  });
}

// A seeded shuffle, so the same name gives the same order every run.
function shuffled(arr, seed) {
  let s = seed;
  const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Installed in the page: draw one food as the fridge would.
function pageHelpers() {
  window.__study = {
    groupOf(key) {
      const f = FOODS[key];
      if (f.cat === 'soft') return window.__SOFT_VEG.includes(key) ? 'veg' : 'fruit';
      if (f.cat === 'leftovers') return 'cooked';
      return f.cat;
    },
    // size: the drawing's design px; show: its CSS px on screen
    draw(key, frac, size, opts = {}) {
      const it = {id: opts.seed || 4100, key, bought: today(), part: opts.some == null ? undefined : opts.some, frozen: opts.burn != null};
      const shape = fridgeShapeOf(it), cat = fridgeCatOf(it);
      let svg = foodShapeMarkupLine(shape, foodBodyColor(it, frac), frac, cat.sag, cat.mold, cat.wrinkle, size, it.id,
        FOODS[key].en, opts.some == null ? null : opts.some, key, opts.wrap !== false);
      if (opts.burn != null) svg = freezerBurnMarkup(svg, opts.burn, it.id);
      const show = opts.show || size;
      svg = svg.replace(/^<svg width="[\d.]+" height="[\d.]+"/, `<svg width="${show}" height="${show}"`);
      return `<span style="display:block;width:${show}px;height:${show}px;filter:url(#rfWobblePx)">${svg}</span>`;
    },
    // a dish piece (dishPiece's own path: cut, no film, no decay)
    dish(key, size) {
      const it = {key, bought: today(), part: 0.5};
      const shape = fridgeShapeOf(it);
      if (opensWhenUsed(shape)) return '<span style="display:block;width:' + size + 'px;height:' + size + 'px;font:10px ui-monospace;color:#8B9491;padding-top:40%;text-align:center">package</span>';
      const cat = fridgeCatOf(it);
      return `<span style="display:block;width:${size}px;height:${size}px">${foodShapeMarkupLine(shape, FOODS[key].base || DEFAULT_BASE_HEX, 0, cat.sag, cat.mold, cat.wrinkle, size, 77, FOODS[key].en, 0.5, key, false)}</span>`;
    }
  };
}

const MONO = "font-family:'tonos-mono-vf',ui-monospace,monospace";
// The phone shelf: 40 CSS px in a 320 px-wide fridge unit, drawn at the
// design px the fridge would draw it at (360 units, RF.PX per unit).
const PHONE_SHOW = 40, PHONE_DRAW = Math.round(40 * 360 / 320 * (600 / 360));
const LARGE = 200;
const BG = '#E6EAE8';

async function open(viewport = { width: 1600, height: 1000 }, dpr = 1) {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  const page = await (await browser.newContext({ viewport, deviceScaleFactor: dpr })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html?v=${Date.now()}`);
  await page.waitForSelector('#headline');
  await page.evaluate(sv => { window.__SOFT_VEG = sv; }, SOFT_VEG);
  await page.evaluate(pageHelpers);
  return { browser, page, errors };
}

async function shoot(page, html, file, width = null) {
  await page.evaluate(({ html, width }) => {
    let el = document.getElementById('__studyOut');
    if (!el) { el = document.createElement('div'); el.id = '__studyOut'; document.body.appendChild(el); }
    el.style.cssText = `position:absolute;top:0;left:0;z-index:99999;background:${'#DCE1DF'};${width ? 'width:' + width + 'px;' : 'width:max-content;'}`;
    el.innerHTML = html;
  }, { html, width });
  const el = await page.$('#__studyOut');
  await el.screenshot({ path: file });
}

async function sheets(out, mode, only) {
  const dir = path.join(SHOTS, out);
  fs.mkdirSync(dir, { recursive: true });
  const { browser, page, errors } = await open();
  for (const g of GROUPS) {
    const keys = await page.evaluate(({ g, only }) => Object.keys(FOODS).filter(k => __study.groupOf(k) === g && (!only || only.includes(k))), { g, only });
    if (!keys.length) continue;
    const cells = await page.evaluate(({ keys, mode, LARGE, PHONE_DRAW, PHONE_SHOW, MONO, BG }) => keys.map(k => {
      const f = FOODS[k], shape = fridgeShapeOf({key: k});
      const col = (art, label, w) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:${w}px">
        <div style="height:${w}px;display:flex;align-items:flex-end;justify-content:center">${art}</div>
        <div style="${MONO};font-size:9px;color:#5C6664">${label}</div></div>`;
      let row;
      if (mode === 'sheet') {
        row = col(__study.draw(k, 0, LARGE), 'fresh', LARGE) + col(__study.draw(k, 1, LARGE), '100%', LARGE)
          + col(__study.draw(k, 0, PHONE_DRAW, {show: PHONE_SHOW}), 'phone', 56);
      } else {
        const S = 130;
        row = col(__study.draw(k, 0, S), 'fresh', S) + col(__study.draw(k, 0.5, S), '50%', S) + col(__study.draw(k, 1, S), '100%', S)
          + col(__study.draw(k, 0, S, {some: 0.5}), 'used some', S) + col(__study.draw(k, 0.6, S, {some: 0.5}), 'half · 60%', S)
          + col(__study.draw(k, 0, S, {burn: 1}), 'frozen · burn', S) + col(__study.dish(k, S), 'in a dish', S);
      }
      return `<div style="background:${BG};border:1px solid #B5BFBB;padding:10px 12px">
        <div style="${MONO};font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#141817;margin-bottom:6px">${f.en} <span style="color:#8B9491">· ${k} · ${shape}</span></div>
        <div style="display:flex;gap:10px;align-items:flex-end">${row}</div></div>`;
    }), { keys, mode, LARGE, PHONE_DRAW, PHONE_SHOW, MONO, BG });
    const cols = mode === 'sheet' ? 3 : 2;
    const html = `<div style="padding:20px"><div style="${MONO};font-size:14px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:12px">${GROUP_TITLE[g]} · ${keys.length}</div>
      <div style="display:grid;grid-template-columns:repeat(${cols}, max-content);gap:12px">${cells.join('')}</div></div>`;
    await shoot(page, html, path.join(dir, `${mode}-${g}.png`));
    console.log(`${mode}-${g}.png`, keys.length);
  }
  if (errors.length) console.log('page errors:', errors);
  await browser.close();
}

async function blind(name, only) {
  const dir = path.join(SHOTS, 'blind-' + name);
  fs.rmSync(dir, { recursive: true, force: true });
  const conds = { fresh: { frac: 0, size: LARGE, dpr: 1 }, decayed: { frac: 1, size: LARGE, dpr: 1 }, phone: { frac: 0, size: PHONE_DRAW, show: PHONE_SHOW, dpr: 3 } };
  const key = { conditions: {}, pairs: [] };
  let allKeys;
  for (const [cname, c] of Object.entries(conds)) {
    const { browser, page, errors } = await open({ width: 900, height: 900 }, c.dpr);
    allKeys = allKeys || await page.evaluate(only => Object.keys(FOODS).filter(k => !only || only.includes(__study.groupOf(k))), only);
    const order = shuffled(allKeys, 1000 + cname.length * 7919 + name.length * 31);
    fs.mkdirSync(path.join(dir, cname), { recursive: true });
    key.conditions[cname] = {};
    const pad = c.show ? 10 : 16;
    for (let i = 0; i < order.length; i++) {
      const id = String(i + 1).padStart(3, '0');
      key.conditions[cname][id] = order[i];
      const art = await page.evaluate(({ k, c }) => __study.draw(k, c.frac, c.size, {show: c.show}), { k: order[i], c });
      await shoot(page, `<div style="background:${BG};padding:${pad}px">${art}</div>`, path.join(dir, cname, id + '.png'));
    }
    // the same drawings on numbered pages, 30 to a page, for people
    const perPage = 30, cell = c.show ? 70 : 150;
    for (let p = 0; p * perPage < order.length; p++) {
      const slice = order.slice(p * perPage, (p + 1) * perPage);
      const cells = await page.evaluate(({ slice, c, cell, start, MONO }) => slice.map((k, i) => {
        const big = !c.show, show = big ? cell - 10 : c.show;
        return `<div style="width:${cell}px;display:flex;flex-direction:column;align-items:center;gap:4px">
          <div style="height:${big ? cell - 10 : 50}px;display:flex;align-items:flex-end">${__study.draw(k, c.frac, big ? cell - 10 : c.size, {show})}</div>
          <div style="${MONO};font-size:11px;color:#141817">${String(start + i + 1).padStart(3, '0')}</div></div>`;
      }).join(''), { slice, c, cell, start: p * perPage, MONO });
      await shoot(page, `<div style="background:${BG};padding:20px;display:grid;grid-template-columns:repeat(6, max-content);gap:14px 18px">${cells}</div>`,
        path.join(dir, `sheet-${cname}-${p + 1}.png`));
    }
    if (errors.length) console.log(cname, 'page errors:', errors);
    await browser.close();
    console.log(cname, order.length);
  }
  // confusable pairs: A on the left, B on the right, sides shuffled
  const { browser, page } = await open({ width: 900, height: 600 }, 1);
  const pairs = PAIRS.filter(p => p.every(k => allKeys.includes(k)));
  fs.mkdirSync(path.join(dir, 'pairs'), { recursive: true });
  const flips = shuffled(pairs.map((_, i) => i % 2), 77);
  for (let i = 0; i < pairs.length; i++) {
    const [a, b] = flips[i] ? [pairs[i][1], pairs[i][0]] : pairs[i];
    const id = String(i + 1).padStart(2, '0');
    key.pairs.push({ id, A: a, B: b });
    const html = await page.evaluate(({ a, b, MONO, BG }) => `<div style="background:${BG};padding:16px;display:flex;gap:28px">
      ${[a, b].map((k, j) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px">${__study.draw(k, 0, 180)}
        <div style="${MONO};font-size:14px">${j ? 'B' : 'A'}</div></div>`).join('')}</div>`, { a, b, MONO, BG });
    await shoot(page, html, path.join(dir, 'pairs', id + '.png'));
  }
  await browser.close();
  fs.writeFileSync(path.join(dir, 'key.json'), JSON.stringify(key, null, 1));
  console.log('pairs', pairs.length, '->', dir);
}

(async () => {
  const server = await serve();
  const [mode, arg, arg2] = process.argv.slice(2);
  try {
    if (mode === 'blind') await blind(arg || 'run', arg2 ? arg2.split(',') : null);
    else if (mode === 'contexts') await sheets(arg || 'drawings', 'contexts');
    else await sheets(arg || 'drawings', 'sheet', arg2 ? arg2.split(',') : null);
  } finally { server.close(); }
})();
