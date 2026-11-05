#!/usr/bin/env node
// Three-fridge sanity check for index.html: all fresh, all past date,
// and mixed. Confirms Tonight never builds a recommendation around a
// past-date item, and that the past-date-only state gets its own honest
// copy instead of the generic "doesn't add up to a meal" message. Also
// includes a migration check (migrationScenario) that loads a real
// localStorage state built on the pushed origin/main version into the
// current code, since a real phone's saved data always lags behind the
// working tree by however much hasn't been pushed yet.
//
// Setup (once): cd tools && npm install
// Run:          node tools/scenarios.js
//
// Needs a local Chrome/Chromium. Defaults to the standard macOS path;
// override with CHROME_PATH=/path/to/chrome if that doesn't exist.
// Screenshots land in tools/screenshots/ (gitignored) — open them and look,
// don't just trust the console output.

const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
const PORT = 8934;
const PORT_LIVE = 8970; // separate, short-lived server for the pushed (origin/main) version only
const CHROME_PATH = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

fs.mkdirSync(OUT, { recursive: true });

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
    });
    server.listen(PORT, () => resolve(server));
  });
}

// A 2x2 JPEG fixture — the receipt scenario stubs the API call, so this
// never needs to look like a receipt, it just has to be a file real enough
// for the browser's Image()/canvas downscale step to decode (sips-generated,
// not hand-rolled, so the JFIF/ICC structure is valid).
const FIXTURE_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAASABIAAD/4QB8RXhpZgAATU0AKgAAAAgABgEGAAMAAAABAAIAAAESAAMAAAABAAEAAAEoAAMAAAABAAIAAAFCAAQAAAABAAACAAFDAAQAAAABAAACAIdpAAQAAAABAAAAVgAAAAAAAqACAAQAAAABAAAAAqADAAQAAAABAAAAAgAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/+ICiElDQ19QUk9GSUxFAAEBAAACeGFwcGwCEAAAbW50clJHQiBYWVogB9UABAABAAEAAQABYWNzcEFQUEwAAAAAQVBQTAAAAAAAAAAAAAAAAAAAAAAAAPbWAAEAAAAA0y1hcHBsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALZGVzYwAAAQgAAAB6Y3BydAAAAYQAAAAid3RwdAAAAagAAAAUclhZWgAAAbwAAAAUZ1hZWgAAAdAAAAAUYlhZWgAAAeQAAAAUclRSQwAAAfgAAAAOdmNndAAAAggAAAAwbmRpbgAAAjgAAAA+YlRSQwAAAfgAAAAOZ1RSQwAAAfgAAAAOZGVzYwAAAAAAAAAgUXVpY2tUaW1lICduY2xjJyBWaWRlbyAoMTIsMiwxKQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHRleHQAAAAAQ29weXJpZ2h0IDIwMDcgQXBwbGUgSW5jLgAAAFhZWiAAAAAAAADzUQABAAAAARbMWFlaIAAAAAAAAIPfAAA9v////7tYWVogAAAAAAAASr8AALE3AAAKuVhZWiAAAAAAAAAoOAAAEQsAAMi5Y3VydgAAAAAAAAABAc0AAHZjZ3QAAAAAAAAAAQABAAAAAAAAAAEAAAABAAAAAAAAAAEAAAABAAAAAAAAAAEAAG5kaW4AAAAAAAAANgAArhQAAFHsAABD1wAAsKQAACZmAAAPXAAAUA0AAFQ5AAHMzQABzM0AAczNAAAAAAAAAAD/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9sAQwACAgICAgIDAgIDBAMDAwQFBAQEBAUHBQUFBQUHCAcHBwcHBwgICAgICAgICgoKCgoKCwsLCwsNDQ0NDQ0NDQ0N/9sAQwECAgIDAwMGAwMGDQkHCQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0N/90ABAAB/9oADAMBAAIRAxEAPwD8lWuJ3Ys0jkk5JLEkk0nnTf32/wC+jUVFeOB//9k=',
  'base64'
);

async function receiptScenario(browser) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => localStorage.setItem('perishable.key', 'test-key'));
  await page.reload();
  await page.waitForSelector('#headline');

  // Stub the network call: canned items cover a FOODS match that needs
  // its package date (milk), a FoodKeeper-only match (cranberries ->
  // Cranberries #259, 60 days, quantity 2 -> two fridge rows), a
  // name that must match nothing (potato chips: never Potato) and a
  // non-food line that must land unchecked. The date is legible, so age
  // is receipt-derived. (Dragonfruit was the no-match fixture until the
  // FoodKeeper fallback table arrived and recognised it; potato chips took
  // that role. It was then the FoodKeeper-only fixture until dragon fruit
  // got its own FOODS entry; cranberries took that role.)
  await page.evaluate(() => {
    window.__receiptApiOverride = async () => ({
      date: '2026-10-20',
      items: [
        {raw: 'ORG CRANBERRIES', expanded: 'organic cranberries', quantity: 2, is_food: true},
        {raw: 'MILK 2% GAL', expanded: 'Milk', quantity: 1, is_food: true},
        {raw: 'KS POTATO CHIPS', expanded: 'Potato chips', quantity: 1, is_food: true},
        {raw: 'PAPER TOWEL 12CT', expanded: 'Paper towels', quantity: 3, is_food: false}
      ]
    });
  });

  const fixturePath = path.join(require('os').tmpdir(), 'perishable-receipt-fixture.jpg');
  fs.writeFileSync(fixturePath, FIXTURE_JPEG);
  await page.setInputFiles('#receiptFile', fixturePath);
  await page.waitForSelector('.receipt-row');

  console.log('\n--- RECEIPT SCAN ---');
  const readRows = () => page.$$eval('#receiptLines .receipt-row', els => els.map(el => ({
    checked: !el.classList.contains('void'),
    name: el.querySelector('.receipt-name').value,
    flag: el.classList.contains('unresolved') ? 'no match' : el.classList.contains('needs-date') ? 'needs date' : '',
    match: ((e => e && e.key ? sourceOf(e.key) : '')(pendingItems[+el.dataset.idx]) + ' ' + (el.querySelector('.match') || {textContent: ''}).textContent).trim(),
    details: (el.querySelector('.match') || {textContent: ''}).textContent.trim(),
    qty: el.querySelector('.qty').textContent.trim()
  })));
  const rows = await readRows();
  console.log('review rows:', JSON.stringify(rows));
  const dateLine = await page.textContent('#receiptPreview > div:first-child');
  console.log('date line:', dateLine);

  const expectChecked = [true, true, true, false];
  rows.forEach((r, i) => {
    if (r.checked !== expectChecked[i]) throw new Error(`row ${i} checked=${r.checked}, expected ${expectChecked[i]}`);
  });
  expectEqual('cranberries label (the scanned name, cleaned)', rows[0].name, 'Cranberries');
  if (rows[0].flag || !rows[0].match.includes('FoodKeeper #259') || rows[0].match.includes('FOODS')) throw new Error('cranberries should match FoodKeeper #259 alone: ' + JSON.stringify(rows[0]));
  if (rows[1].flag !== 'needs date' || !rows[1].match.includes('FOODS')) throw new Error('milk should match FOODS and ask for its package date: ' + JSON.stringify(rows[1]));
  if (rows[2].flag !== 'no match' || !rows[2].match.includes('no shelf-life data')) throw new Error('potato chips should match nothing: ' + JSON.stringify(rows[2]));
  if (!(await page.$eval('#addbtn', b => b.disabled))) throw new Error('confirm should be blocked while lines need answers');

  // Answer through the real controls: milk's printed date 7 days after
  // purchase, the chips' use-by 60 days after.
  const purchase = await page.evaluate(() => receiptPending.age);
  const isoAfter = n => page.evaluate(([a, d]) => new Date((today() - a + d - DAY_OFFSET) * 86400000).toISOString().slice(0, 10), [purchase, n]);
  await page.fill('#receiptLines .entry-date[data-idx="1"]', await isoAfter(7));
  await page.fill('#receiptLines .entry-date[data-idx="2"]', await isoAfter(60));
  if (await page.$eval('#addbtn', b => b.disabled)) throw new Error('confirm still blocked after every line was answered');
  await page.click('#addbtn');
  await page.waitForTimeout(150);

  await page.waitForTimeout(300);
  const fridgeRows = await readInventory(page);
  console.log('fridge rows after confirm:', JSON.stringify(fridgeRows));
  const rowNames = fridgeRows.map(r => r.name);
  if (rowNames.length !== 4) throw new Error(`expected 4 fridge rows (2 cranberries + milk + chips), got ${rowNames.length}`);
  if (rowNames.filter(n => n === 'Cranberries').length !== 2) throw new Error('expected two cranberries rows from quantity 2');
  const leftOf = n => fridgeRows.find(r => r.name === n).left;
  expectEqual('cranberries days left (60 - age)', leftOf('Cranberries'), (60 - purchase) + ' days');
  expectEqual('milk days left (package date)', leftOf('Milk'), 7 - purchase < 0 ? Math.abs(7 - purchase) + 'd past' : (7 - purchase) + ' days');
  expectEqual('chips days left (use-by given)', leftOf('Potato chips'), (60 - purchase) + ' days');
  if (rowNames.includes('Paper towels')) throw new Error('unchecked paper towels should not have been added');

  if (errors.length) console.log('console errors:', errors);
  await page.screenshot({ path: path.join(OUT, 'scn-receipt.png'), fullPage: true });
  await page.context().close();
  fs.unlinkSync(fixturePath);
}

// Typed entry now stops at a preview when a name needs an answer: a
// package date (milk), or which of several equal matches (cheese, lettuce).
// Older scenarios were written before that, so this answers it through the
// real controls the way they used to be resolved: the first option (what
// the old first-match lookup picked) and a package date seven days after
// purchase (milk's old fixed value), then adds. No-op when nothing opened.
async function answerPreview(page) {
  await page.waitForTimeout(50);
  if (!(await page.$('#receiptLines .receipt-row'))) return;
  for (;;) {
    const pick = await page.$('#receiptLines .receipt-row.unresolved .entry-pick');
    if (!pick) break;
    const first = await pick.$eval('option:nth-child(2)', o => o.value);
    await pick.selectOption(first);
  }
  for (;;) {
    const input = await page.$('#receiptLines .entry-date:not([data-done])');
    if (!input) break;
    const idx = await input.getAttribute('data-idx');
    const iso = await page.evaluate(i => new Date((today() - pendingItems[i].age + 7 - DAY_OFFSET) * 86400000)
      .toISOString().slice(0, 10), +idx);
    await input.fill(iso);
    await page.$eval(`#receiptLines .entry-date[data-idx="${idx}"]`, el => el.setAttribute('data-done', ''));
  }
  await page.click('#addbtn');
  await page.waitForTimeout(100);
}

async function scenario(browser, name, entryText, shotName) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#headline');
  await page.fill('#entry', entryText);
  await page.click('#addbtn');
  await answerPreview(page);
  await page.waitForTimeout(150);

  console.log(`\n--- ${name} ---`);
  console.log('headline:', await page.textContent('#headline'));
  console.log('tonight h2:', await page.textContent('#tonight h2'));
  const board = await page.$$eval('#kcBoardItems [data-board-item]', els => els.map(e => e.getAttribute('aria-label')));
  console.log('on the board:', JSON.stringify(board));
  if (errors.length) console.log('console errors:', errors);

  await page.screenshot({ path: path.join(OUT, shotName), fullPage: true });
  await page.context().close();
}

// Phase 2: a suggestion should name only the ingredients actually at risk
// (this week or sooner), soonest first, and the ledger it credits on Cook
// must match that same set -- not every matched ingredient, which is what
// was wired before this pass. Chicken (2d, crit) and spinach/milk (7d,
// turn) are at risk; onion (10d) is fresh and matched but not at risk.
async function recommendationScenario(browser) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#headline');
  await page.fill('#entry', 'spinach, milk, chicken, onion');
  await page.click('#addbtn');
  await answerPreview(page);
  await page.waitForTimeout(150);

  console.log('\n--- RECOMMENDATION: at-risk naming ---');
  const usesUp = await page.textContent('#tonight .dish-usesup');
  console.log('uses-up line:', usesUp);
  const expected = 'Uses up Chicken breast (2d), Spinach (7d), and Milk (7d) before they turn.';
  if (usesUp.trim() !== expected) throw new Error(`uses-up line was "${usesUp.trim()}", expected "${expected}"`);

  // The ingredients are drawn on the cutting board, soonest first; onion
  // is matched (drawn) but not at risk (not in the uses-up line).
  const board = await page.$$eval('#kcBoardItems [data-board-item]', els => els.map(e => e.getAttribute('aria-label')));
  console.log('on the board:', JSON.stringify(board));
  expectEqual('board ingredients', board, ['Chicken breast', 'Spinach', 'Milk', 'Onion']);

  const eyebrow = await page.textContent('.tonight .eyebrow');
  console.log('eyebrow:', eyebrow);
  if (eyebrow.trim() !== 'Rescues 3 items') throw new Error(`eyebrow was "${eyebrow.trim()}", expected "Rescues 3 items" (onion isn't at risk)`);

  await page.click('#tabKitchen');
  await page.waitForTimeout(900); // the panel switch settles before Cook this is clicked
  await page.click('#tonight .js-cook');
  await page.waitForTimeout(150);
  const savedG = await page.textContent('#savedG');
  console.log('savedG after cook:', savedG);
  // chicken 500g + spinach 200g + milk 900g = 1600g at risk; onion's 150g
  // must not be in this number even though it was matched and consumed.
  if (savedG.trim() !== '1600 g') throw new Error(`savedG was "${savedG.trim()}", expected "1600 g" (at-risk grams only)`);

  if (errors.length) console.log('console errors:', errors);
  await page.screenshot({ path: path.join(OUT, 'scn-recommendation.png'), fullPage: true });
  await page.context().close();
}

// Phase 2: a fridge where nothing is at risk (everything well past this
// week) should suggest no dish at all, on any of the three day cards --
// "closest match" is still a recipe-app move if nothing in it is actually
// about to be lost. Egg/cheese/butter are all deep in the fresh bucket
// bought today, and together they fully match "Cheese omelette" -- proving
// the gap is the urgency requirement, not a lack of matchable dishes.
async function noRiskScenario(browser) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#headline');
  await page.fill('#entry', 'egg, cheese, butter');
  await page.click('#addbtn');
  await answerPreview(page);
  await page.waitForTimeout(150);

  console.log('\n--- NO RISK: nothing to suggest ---');
  const tonightH2 = await page.textContent('#tonight h2');
  console.log('tonight h2:', tonightH2);
  if (tonightH2.trim() !== 'Nothing here is about to turn.') throw new Error(`tonight h2 was "${tonightH2.trim()}"`);
  const boardCount = await page.$$eval('#kcBoardItems [data-board-item]', els => els.length);
  if (boardCount !== 0) throw new Error(`expected nothing on the board on a noRisk tonight, found ${boardCount}`);
  const cookBtn = await page.$('#tonight .js-cook');
  if (cookBtn) throw new Error('a noRisk tonight should have no Cook button');

  for (const [boxId, label] of [['tomorrow', 'Tomorrow'], ['dayAfter', 'The day after']]) {
    const visible = await page.isVisible('#' + boxId);
    if (!visible) throw new Error(`#${boxId} should render (with the plain line), not stay hidden`);
    const fact = await page.textContent('#' + boxId + ' .daily-fact');
    const dishName = await page.textContent('#' + boxId + ' .dish-name');
    console.log(`${label} fact:`, fact.trim(), '/ dish-sub:', dishName.trim());
    // The headline itself must say nothing's at risk, not cite whichever
    // safe item happens to be least-safe (e.g. "Eggs has 34 days left").
    if (fact.trim() !== 'Nothing in the fridge is at risk yet.') throw new Error(`${label} daily-fact was "${fact.trim()}"`);
    if (dishName.trim() !== 'Nothing here is about to turn.') throw new Error(`${label} dish-name was "${dishName.trim()}"`);
  }

  if (errors.length) console.log('console errors:', errors);
  await page.screenshot({ path: path.join(OUT, 'scn-norisk.png'), fullPage: true });
  await page.context().close();
}

// Phase 3: four items at roughly 25/50/75/95% of their own shelf life used
// -- the point the earlier fridge screenshots never actually showed, since
// everything in them was either freshly bought or already gone. Carrot
// 25%, yogurt 50%, mushrooms ~75%, cheese ~95%, spanning veg/dairy/soft so
// three different category shapes show up in one shot too.
async function fridgeGradientScenario(browser) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#headline');
  // baby carrots 7/28, yogurt 7/14, mushrooms 5/7, hard cheese 171/180:
  // the same 25/50/75/95% spread the original carrot/cheese values gave.
  await page.fill('#entry', 'baby carrots 7d, yogurt 7d, mushrooms 5d, hard cheese 171d');
  await page.click('#addbtn');
  await answerPreview(page);
  await page.waitForTimeout(150);

  console.log('\n--- FRIDGE GRADIENT: 25/50/75/95% ---');
  await openRow(page);
  const fills = await page.$$eval('#fridgeShelf .fridge-item .fridge-shape svg > path',
    els => els.map(e => e.getAttribute('fill')));
  console.log('shelf fills (front to back):', JSON.stringify(fills));
  if (new Set(fills).size < 4) throw new Error(`expected 4 distinct colors across the decay gradient, got ${JSON.stringify(fills)}`);
  if (errors.length) console.log('console errors:', errors);
  await page.screenshot({ path: path.join(OUT, 'fridge-gradient.png'), fullPage: true });
  await page.context().close();
}

// Both fridges: no two item labels overlap (line-art labels, illustrated
// tags), no line-art label sits on any food, and no food is drawn above
// the line-art fridge's heading.
async function assertFridgeLayout(page, where) {
  await openRow(page);
  const res = await page.evaluate(() => {
    const box = el => { const r = el.getBoundingClientRect(); return {left: r.left, right: r.right, top: r.top, bottom: r.bottom, text: el.textContent.trim().slice(0, 30)}; };
    const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const pairs = list => { for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (hit(list[i], list[j])) return [list[i], list[j]]; return null; };
    // a label's box holds its buttons; the buttons are checked on their own
    // too, against every other label and button, so a 44px tap area can't
    // reach into a neighbour
    const labels = [...document.querySelectorAll('#fridgeShelf .fridge-label')].map(box);
    const actBoxes = [...document.querySelectorAll('#fridgeShelf .fridge-act')].map(b => ({...box(b), owner: b.closest('.fridge-label')}));
    const labelEls = [...document.querySelectorAll('#fridgeShelf .fridge-label')];
    const nm = el => el.closest('.fridge-label').childNodes[0].textContent;
    const actHit = actBoxes.flatMap(a => actBoxes.filter(b => b !== a && b.owner !== a.owner && hit(a, b)).map(b => [nm(a.owner) + ' ' + a.text, [a.left, a.top, a.right, a.bottom].map(Math.round), nm(b.owner) + ' ' + b.text, [b.left, b.top, b.right, b.bottom].map(Math.round), box(a.owner), box(b.owner)])
      .concat(labelEls.filter(l => l !== a.owner).map(l => [l, box(l)]).filter(([, lb]) => hit(a, lb)).map(([, lb]) => [a.text, lb.text])))[0] || null;
    const shapes = [...document.querySelectorAll('#fridgeShelf .fridge-shape svg > path:first-of-type')].map(box);
    const tags = [...document.querySelectorAll('#rfUnit .rf-tag')].filter(t => t.offsetParent).map(box);
    const head = document.querySelector('.fridgeview-head').getBoundingClientRect().bottom;
    const items = [...document.querySelectorAll('#fridgeShelf .fridge-item')].map(box);
    const headBox = box(document.querySelector('.fridgeview-head'));
    const tagOnHeading = tags.find(t => hit(t, headBox)) || null;
    return {
      labels: labels.length, tags: tags.length, rows: document.querySelectorAll('#fridgeShelf .fridge-row').length,
      lineArtLabels: pairs(labels), actHit, acts: actBoxes.length, labelOnFood: labels.flatMap(l => shapes.filter(s => hit(l, s)).map(s => [l, s]))[0] || null,
      illustratedTags: pairs(tags), aboveHeading: items.filter(i => i.top < head - 0.5)[0] || tagOnHeading,
      // desktop: at most 9 to a shelf, every label in one row (no tier)
      desktop: innerWidth > 720,
      perShelf: [...document.querySelectorAll('#fridgeShelf .fridge-row')].map(r => r.querySelectorAll('.fridge-item').length),
      stepped: [...document.querySelectorAll('#fridgeShelf .fridge-label')].filter(l => l.style.getPropertyValue('--tier')).map(l => l.childNodes[0].textContent)
    };
  });
  console.log(`${where}: line-art ${res.labels} labels on ${res.rows} shelves ${JSON.stringify(res.perShelf)}, illustrated ${res.tags} tags`);
  if (res.actHit) throw new Error(`${where}: a Used/Tossed button runs into another label: ${JSON.stringify(res.actHit)}`);
  if (res.lineArtLabels) throw new Error(`${where}: line-art labels overlap: ${JSON.stringify(res.lineArtLabels)}`);
  if (res.labelOnFood) throw new Error(`${where}: a line-art label sits on a food: ${JSON.stringify(res.labelOnFood)}`);
  if (res.illustratedTags) throw new Error(`${where}: illustrated tags overlap: ${JSON.stringify(res.illustratedTags)}`);
  if (res.aboveHeading) throw new Error(`${where}: an item is drawn above the fridge heading: ${JSON.stringify(res.aboveHeading)}`);
  if (res.desktop && res.perShelf.some(n => n > 9)) throw new Error(`${where}: more than 9 items on a shelf: ${JSON.stringify(res.perShelf)}`);
  if (res.desktop && res.stepped.length) throw new Error(`${where}: labels stepped down a tier: ${JSON.stringify(res.stepped)}`);
  return res;
}

// Phase 3: a realistic ~25-item haul (22 savable across every category,
// 3 already gone) -- the point of this one is volume: does the shelf
// actually spread over several shelves, each with every label showing and
// none colliding, in both fridges.
async function fridgeHaulScenario(browser) {
  const page = await (await browser.newContext()).newPage();
  // Phone width, not desktop -- receipt scanning is explicitly a phone
  // feature, and a realistic haul needs a narrow shelf to actually wrap
  // into the rows behind-row items depend on, which 1080px of desktop
  // width mostly absorbed in one row.
  await page.setViewportSize({ width: 390, height: 1600 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#headline');
  await page.fill('#entry',
    'spinach, lettuce 2d, milk, yogurt 3d, chicken, beef, bacon 2d, egg 5d, tofu 1d, ' +
    'onion, scallion 2d, garlic, ginger, tomato 2d, carrot, pepper 1d, broccoli 1d, ' +
    'mushroom 3d, potato, cheese 10d, butter, cooked rice 2d, ' +
    'daikon 20d, zucchini 8d, enoki 10d');
  await page.click('#addbtn');
  await answerPreview(page);
  await page.waitForTimeout(150);

  console.log('\n--- FRIDGE HAUL: ~25 items ---');
  const fridgeCount = await page.textContent('#fridgeCount');
  console.log('fridge count:', fridgeCount);
  if (fridgeCount.trim() !== '25') throw new Error(`expected 25 items, got "${fridgeCount.trim()}"`);

  await page.waitForTimeout(900);
  const layout = await assertFridgeLayout(page, 'haul at 390px');
  if (layout.rows < 2) throw new Error('a 25-item haul at phone width should need more than one shelf');
  expectEqual('every savable item labelled', layout.labels, 22);

  await openRow(page);
  const drawerCount = await page.$$eval('#fridgeDrawerItems .fridge-item', els => els.length);
  console.log('drawer (gone) items:', drawerCount);
  if (drawerCount !== 3) throw new Error(`expected 3 gone items in the drawer, got ${drawerCount}`);

  if (errors.length) console.log('console errors:', errors);
  await page.screenshot({ path: path.join(OUT, 'fridge-haul.png'), fullPage: true });
  await page.context().close();
}

// Regression for the Tomorrow/day-after fact-line bug: the daily-fact line
// must read from that day's own projected (working) fridge, not the live
// real one, once an earlier day's recommendation has (in the simulation)
// used something up -- otherwise the fact cites an ingredient the dish-sub
// right under it just said nothing is happening to. Exact repro: chicken,
// spinach, milk, onion, bacon -- tonight's dish only needs the first four,
// leaving just bacon for tomorrow's projection. Bacon is at risk (7d, already
// turn-bucket) but appears in only one DISH, as 1 of 3 needed, so alone it
// can't even form a near-miss (2 missing, not 1) -- tomorrow lands on
// terminal, a tier that still shows a fact line, and that fact must cite
// bacon, never chicken. (noRisk's own fact line is covered separately below:
// it no longer cites any item at all.)
async function fridgeFactBugScenario(browser) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#headline');
  await page.fill('#entry', 'chicken, spinach, milk, onion, bacon');
  await page.click('#addbtn');
  await answerPreview(page);
  await page.waitForTimeout(150);

  console.log('\n--- FACT-LINE BUG: Tomorrow must read the projected fridge ---');
  const fact = await page.textContent('#tomorrow .daily-fact');
  const dishName = await page.textContent('#tomorrow .dish-name');
  console.log('Tomorrow fact:', fact.trim());
  console.log('Tomorrow dish-sub:', dishName.trim());
  if (dishName.trim() !== 'Not even one ingredient away from a dish.') throw new Error(`expected tomorrow's tier to be terminal, dish-sub was "${dishName.trim()}"`);
  if (fact.includes('Chicken')) throw new Error(`Tomorrow's fact still cites chicken, which tonight's own recommendation assumes got used -- "${fact.trim()}"`);
  if (!fact.includes('Bacon')) throw new Error(`expected Tomorrow's fact to cite bacon (the only item left in the projection), got "${fact.trim()}"`);

  if (errors.length) console.log('console errors:', errors);
  await page.screenshot({ path: path.join(OUT, 'fridge-factbug-fixed.png'), fullPage: true });
  await page.context().close();

  // Edge case the fix itself exposed: when the projected fridge is fully
  // emptied (every item in it was part of today's meals), factAt()
  // legitimately returns null. Tomorrow is then one small line -- no
  // headline, no "Not even one ingredient away from a dish", never the
  // literal word "null".
  const page2 = await (await browser.newContext()).newPage();
  const errors2 = [];
  page2.on('pageerror', e => errors2.push(e.message));
  await page2.goto(`http://localhost:${PORT}/index.html`);
  await page2.evaluate(() => localStorage.clear());
  await page2.reload();
  await page2.waitForSelector('#headline');
  await page2.fill('#entry', 'spinach, milk, chicken, onion');
  await page2.click('#addbtn');
  await answerPreview(page2);
  await page2.waitForTimeout(150);
  const empty = await page2.evaluate(() => {
    const box = document.getElementById('tomorrow');
    return {line: (box.querySelector('.projected-empty') || {textContent: ''}).textContent.trim(),
      headline: !!box.querySelector('.daily-fact, h2'), text: box.textContent.replace(/\s+/g, ' ').trim()};
  });
  console.log('Tomorrow when the projection is fully emptied:', JSON.stringify(empty));
  expectEqual('one small line', empty.line, 'Nothing left to plan for tomorrow');
  expectEqual('no headline', empty.headline, false);
  if (/null|Not even one ingredient/.test(empty.text)) throw new Error(`emptied Tomorrow says more than the one line: "${empty.text}"`);
  if (errors2.length) console.log('console errors:', errors2);
  await page2.context().close();
}

// Plural agreement: Eggs is a plural FOODS name, marked plural:true. Same
// terminal-tier repro shape as the fact-line bug scenario above (consume
// everything but one item, so the fact line still renders), swapped to an
// item whose name needs "have"/"are", to catch "Eggs has" regressing back.
async function pluralAgreementScenario(browser) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#headline');
  // No spinach: no dish today can cook the eggs (Eggs on toast is one
  // short), Dinner cooks the rest, so Tomorrow's fact is about the eggs.
  await page.fill('#entry', 'chicken, milk, onion, egg 34d');
  await page.click('#addbtn');
  await answerPreview(page);
  await page.waitForTimeout(150);

  console.log('\n--- PLURAL AGREEMENT ---');
  const fact = await page.textContent('#tomorrow .daily-fact');
  console.log('Tomorrow fact:', fact.trim());
  if (!/^Eggs (have|are) /.test(fact.trim())) throw new Error(`expected plural agreement ("Eggs have/are ..."), got "${fact.trim()}"`);
  if (/Eggs (has|is) /.test(fact.trim())) throw new Error(`singular verb leaked through for a plural name -- "${fact.trim()}"`);

  if (errors.length) console.log('console errors:', errors);
  await page.context().close();
}

// Dish-repeat collapsing: a lone at-risk yogurt (no mango) is a near-miss
// tonight -- nearmiss consumes nothing, so tomorrow's projection is the
// identical fridge aged one more day, and the same dish wins again. That
// second card should collapse to one line instead of repeating in full.
async function dishRepeatScenario(browser) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#headline');
  await page.fill('#entry', 'yogurt 10d');
  await page.click('#addbtn');
  await answerPreview(page);
  await page.waitForTimeout(150);

  console.log('\n--- DISH REPEAT COLLAPSING ---');
  // Yogurt bowl with mango is a breakfast (and snack) dish: today's
  // breakfast has it, so that's the meal to look at.
  await page.click('#tonight .meal-tab[data-meal="breakfast"]');
  const tonightH2 = await page.textContent('#tonight h2');
  const tomorrowDishName = await page.textContent('#tomorrow .dish-name');
  console.log('Tonight:', tonightH2.trim());
  console.log('Tomorrow dish-sub:', tomorrowDishName.trim());
  if (tonightH2.trim() !== 'Yogurt bowl with mango') throw new Error(`expected tonight's near-miss to be "Yogurt bowl with mango", got "${tonightH2.trim()}"`);
  const expected = "Same dish as today's breakfast: Yogurt bowl with mango.";
  if (tomorrowDishName.trim() !== expected) throw new Error(`expected Tomorrow to collapse to "${expected}", got "${tomorrowDishName.trim()}"`);
  // Collapsed cards still carry no full rescue chip row or stats -- confirm
  // it didn't just render the full card again with different wording.
  const tomorrowChips = await page.$$eval('#tomorrow .chip', els => els.length);
  if (tomorrowChips !== 0) throw new Error(`expected a collapsed card to have no chips, found ${tomorrowChips}`);

  if (errors.length) console.log('console errors:', errors);
  await page.screenshot({ path: path.join(OUT, 'scn-dish-repeat.png'), fullPage: true });
  await page.context().close();
}

// Migration safety: a real phone's localStorage was written by whatever's
// actually live on origin/main, not by whatever's in the working tree.
// This pulls the real pushed index.html (git show, no working-tree
// changes), drives it like an actual user to build a realistic saved
// state -- known items, an unrecognized/custom item (the shape most
// likely to be missing new fields like cat/shape/plural), something
// tossed (waste ledger), something cooked (saved ledger), a standing/
// restock chip -- captures the exact localStorage blob that produces,
// then loads that same blob into the CURRENT code and confirms the count,
// the ledger, and the fridge view all survive with no console errors.
// Never touches the working tree; the "live" copy exists only in a temp
// file for the few seconds this scenario needs it.
async function migrationScenario(browser) {
  const liveHtml = execSync('git show origin/main:index.html', { cwd: ROOT, maxBuffer: 1024 * 1024 * 20 });
  const tmpLive = path.join(os.tmpdir(), 'perishable-live-' + Date.now() + '.html');
  fs.writeFileSync(tmpLive, liveHtml);

  const liveServer = await new Promise(resolve => {
    const s = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      res.end(liveHtml);
    });
    s.listen(PORT_LIVE, () => resolve(s));
  });

  console.log('\n--- MIGRATION: origin/main saved state into current code ---');

  // Build a realistic saved state on the real pushed version.
  const livePage = await (await browser.newContext()).newPage();
  const liveErrors = [];
  livePage.on('pageerror', e => liveErrors.push(e.message));
  await livePage.goto(`http://localhost:${PORT_LIVE}/`);
  await livePage.evaluate(() => localStorage.clear());
  await livePage.reload();
  await livePage.waitForSelector('#headline');
  await livePage.fill('#entry', 'spinach, milk, chicken, onion, dragonfruit, garlic 5d');
  await livePage.click('#addbtn');
  await livePage.waitForTimeout(150);
  // Since 42c2338 a typed batch with an item that needs a date (milk's
  // printed date, dragonfruit matching nothing) waits in a review instead
  // of saving at once: give every date a person would, then Add.
  // (Its Add was #voiceAdd until voice entry was removed: either.)
  const ADD = '#entryAdd, #voiceAdd';
  const reviewAdd = await livePage.$(ADD);
  if (reviewAdd && await reviewAdd.isVisible()) {
    const inFive = await livePage.evaluate(() => new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10));
    // the review re-renders as each date is given: look again each time
    const n = (await livePage.$$('.entry-date')).length;
    for (let i = 0; i < n; i++) {
      await livePage.locator('.entry-date').nth(i).fill(inFive);
      await livePage.waitForTimeout(100);
    }
    if (await livePage.$eval(ADD, b => b.disabled)) throw new Error('origin/main review still blocks Add after every date was filled');
    await livePage.click(ADD);
    await livePage.waitForTimeout(150);
  }
  // Since the grocery bag (f8a556f) the batch waits on the receipt
  // instead: the same dates, then Put away (#addbtn) again.
  if (await livePage.$('#receiptLines .receipt-row')) {
    const inFive = await livePage.evaluate(() => new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10));
    const n = (await livePage.$$('#receiptLines .entry-date')).length;
    for (let i = 0; i < n; i++) {
      await livePage.locator('#receiptLines .entry-date').nth(i).fill(inFive);
      await livePage.waitForTimeout(100);
    }
    await livePage.click('#addbtn');
    await livePage.waitForTimeout(150);
  }
  // A driver that no longer matches origin/main's entry UI saves nothing,
  // and every check below would then pass on an empty state: refuse that.
  const added = await livePage.evaluate(() => fridge.length);
  if (added !== 6) throw new Error(`origin/main saved ${added} of 6 typed items -- the scenario no longer drives its entry UI`);
  // Toss one item so the waste ledger has something to carry: the old
  // list button, or (since d2cd073) Tossed under the item in the All items row.
  let tossBtn = await livePage.$('[data-toss]');
  if (!tossBtn && await livePage.$('#allItems')) {
    await livePage.$eval('#allItems', d => { d.open = true; });
    await livePage.waitForTimeout(150);
    tossBtn = await livePage.$('[data-fridge-tossed]');
  }
  if (tossBtn) await tossBtn.click();
  await livePage.waitForTimeout(100);
  const cookBtn = await livePage.$('.js-cook');
  if (cookBtn) await cookBtn.click();
  await livePage.waitForTimeout(100);
  // What else a phone on origin/main holds, written in origin/main's own
  // record shape and saved by its own saveState: a banana not ripe yet, a
  // ripe avocado, potatoes (kept out of the fridge: the bowl now), and a
  // tomato past date (the crisper).
  await livePage.evaluate(() => {
    const t = today();
    fridge.push({id: ++uid, key: 'banana', bought: t - 1, custom: null, ripening: true},
                {id: ++uid, key: 'avocado', bought: t - 1, custom: null, ripeOn: t},
                {id: ++uid, key: 'potato', bought: t - 3, custom: null},
                {id: ++uid, key: 'tomato', bought: t - 12, custom: null});
    render(); saveState();
  });

  const savedState = await livePage.evaluate(() => localStorage.getItem('perishable.v1'));
  if (!savedState) throw new Error('origin/main produced no saved state to migrate -- nothing to test');
  const parsed = JSON.parse(savedState);
  const expectedCount = parsed.fridge.length;
  if (!(parsed.ledger.wasteG > 0)) throw new Error('origin/main saved no waste -- the scenario no longer drives its Tossed button');
  console.log('live (origin/main) fridge items:', expectedCount, '· standing keys:', Object.keys(parsed.standing).length);
  console.log('live ledger:', JSON.stringify(parsed.ledger));
  if (liveErrors.length) throw new Error(`origin/main itself threw console errors while building state: ${JSON.stringify(liveErrors)}`);
  await livePage.context().close();
  liveServer.close();
  fs.unlinkSync(tmpLive);

  // Load that exact blob into the current (unpushed) code.
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(state => localStorage.setItem('perishable.v1', state), savedState);
  await page.reload();
  await page.waitForSelector('#headline');
  await page.waitForTimeout(250);

  const newCount = await page.textContent('#fridgeCount');
  console.log('current code item count:', newCount.trim());
  if (parseInt(newCount, 10) !== expectedCount) throw new Error(`expected ${expectedCount} items to survive migration, current code shows "${newCount.trim()}"`);

  const wasteG = await page.textContent('#wasteG');
  const savedG = await page.textContent('#savedG');
  console.log('current code ledger: wasteG =', wasteG.trim(), ', savedG =', savedG.trim());
  if (parseInt(wasteG, 10) !== Math.round(parsed.ledger.wasteG)) throw new Error(`waste ledger lost in migration: expected ${Math.round(parsed.ledger.wasteG)}, got "${wasteG.trim()}"`);
  if (parseInt(savedG, 10) !== Math.round(parsed.ledger.savedG)) throw new Error(`saved ledger lost in migration: expected ${Math.round(parsed.ledger.savedG)}, got "${savedG.trim()}"`);

  const restockChips = await page.$$eval('#restock .chip, #restock button', els => els.length);
  console.log('restock chips rendered:', restockChips);
  if (!restockChips) throw new Error('standing/restock data did not survive migration');

  // The fridge view specifically: every migrated item (including the
  // unrecognized "dragonfruit" custom entry, which carries none of the
  // newer cat/shape/plural fields) must render through the current
  // category/shape lookups without crashing or silently dropping anything.
  await openRow(page);
  const shelfItems = await page.$$eval('#fridgeShelf .fridge-item', els => els.length);
  const drawerItems = await page.$$eval('#fridgeDrawerItems .fridge-item', els => els.length);
  console.log('fridge view: shelf =', shelfItems, ', drawer =', drawerItems);
  if (shelfItems + drawerItems !== expectedCount) throw new Error(`fridge view shows ${shelfItems + drawerItems} items total, expected ${expectedCount}`);

  // Nothing counts as waste by loading: the ledger is exactly what was
  // saved, and every record is still there by id.
  const after = await page.evaluate(() => ({ledger, ids: fridge.map(i => i.id).sort((a, b) => a - b),
    frozen: fridge.filter(i => i.frozen).length}));
  expectEqual('ledger unchanged by loading', after.ledger, parsed.ledger);
  expectEqual('every saved record kept', after.ids, parsed.fridge.map(i => i.id).sort((a, b) => a - b));
  // Every item is drawn somewhere: the illustrated fridge (shelves,
  // crisper, door bins) or the kitchen (the bowl, the board, the counter);
  // the freezer is empty and closed, with nothing moved into it.
  const where = await page.evaluate(() => fridge.map(it => {
    const at = sel => !!document.querySelector(`${sel} [data-rf-item="${it.id}"], ${sel} [data-board-item="${it.id}"]`);
    const place = at('#rfFzShelf') ? 'freezer' : at('#rfCrisperItems') ? 'crisper' : at('#rfShelfEye') || at('#rfShelfUpper') ? 'shelf'
      : at('[id^=rfDoorBin]') ? 'door' : at('#kcBowlItems') || at('#kcBowlBack') ? 'bowl' : at('#kcBoardItems') ? 'board' : at('#kcCounterBack') ? 'counter' : null;
    return [it.key, place];
  }));
  console.log('drawn at:', JSON.stringify(where));
  const missing = where.filter(([, p]) => !p);
  if (missing.length) throw new Error('not drawn anywhere: ' + JSON.stringify(missing));
  const placeOf = k => (where.find(([key]) => key === k) || [])[1];
  expectEqual('banana (not ripe) and potato in the kitchen, past-date tomato in the crisper',
    [['bowl', 'board'].includes(placeOf('banana')), ['bowl', 'board'].includes(placeOf('potato')), placeOf('tomato')], [true, true, 'crisper']);
  const fz = await page.evaluate(() => [document.getElementById('rfFzCount').textContent, document.querySelectorAll('#rfFzShelf [data-rf-item]').length, document.getElementById('rfUnit').classList.contains('fz-open')]);
  expectEqual('freezer empty and closed, nothing frozen', [...fz, after.frozen], ['empty', 0, false, 0]);

  if (errors.length) throw new Error(`current code threw console errors loading migrated state: ${JSON.stringify(errors)}`);
  await page.screenshot({ path: path.join(OUT, 'scn-migration.png'), fullPage: true });
  await page.context().close();
}

/* ---------- real fridge (new section, above the untouched line-art
   fridge view) -- door-on-load, handle toggle, reduced motion, the
   closed-state count, and item tap. Seeds `fridge` directly (same
   methodology as tools/real-fridge-study.js) rather than through
   #entry/#addbtn, for precise control over each item's days-left. ---------- */

async function rfSeed(page, day){
  await page.evaluate(day => {
    fridge = [
      {id: uid++, key: 'chicken', bought: day},       // today, critical
      {id: uid++, key: 'spinach', bought: day - 5},    // turn
      {id: uid++, key: 'hardcheese', bought: day - 5}, // fresh (180-day shelf)
      {id: uid++, key: 'tomato', bought: day - 9},     // gone, into the crisper
    ];
    render();
  }, day);
}

async function realFridgeDoorLoadScenario(browser) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#headline');

  console.log('\n--- REAL FRIDGE: door opens on load ---');
  const beforeOpen = await page.$eval('#rfUnit', el => el.classList.contains('open'));
  console.log('open before the auto-open delay elapses:', beforeOpen);
  if (beforeOpen) throw new Error('door was already open immediately on load -- expected a closed first paint, then an auto-open animation');

  await page.waitForTimeout(900); // past rfInit's 500ms delay + most of the 1s transition
  const afterOpen = await page.$eval('#rfUnit', el => el.classList.contains('open'));
  console.log('open after the delay:', afterOpen);
  if (!afterOpen) throw new Error('door did not open on its own after loading');

  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

async function realFridgeHandleToggleScenario(browser) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#headline');
  await page.waitForTimeout(900); // let the load-open animation finish first

  // Open, the door swings past square: its handle faces away, so the
  // pointer closes it by the door's visible inside face, and the keyboard
  // by the handle, which stays the focusable control. Closed, the handle
  // is in view and opens it by pointer.
  console.log('\n--- REAL FRIDGE: handle toggles the door ---');
  const state = async () => ({
    open: await page.$eval('#rfUnit', el => el.classList.contains('open')),
    label: await page.getAttribute('#rfHandle', 'aria-label'),
    pressed: await page.getAttribute('#rfHandle', 'aria-pressed'),
  });
  const expectClosed = (st, how) => {
    console.log(`closed after ${how}:`, !st.open, '· aria-label:', st.label, '· aria-pressed:', st.pressed);
    if (st.open) throw new Error(`${how} did not close the open door`);
    if (st.label !== 'Open fridge door') throw new Error(`expected aria-label "Open fridge door" once closed, got "${st.label}"`);
    if (st.pressed !== 'false') throw new Error(`expected aria-pressed="false" once closed, got "${st.pressed}"`);
  };
  const expectOpen = (st, how) => {
    console.log(`open after ${how}:`, st.open, '· aria-label:', st.label, '· aria-pressed:', st.pressed);
    if (!st.open) throw new Error(`${how} did not open the closed door`);
    if (st.label !== 'Close fridge door') throw new Error(`expected aria-label "Close fridge door" once open, got "${st.label}"`);
    if (st.pressed !== 'true') throw new Error(`expected aria-pressed="true" once open, got "${st.pressed}"`);
  };

  if (!(await state()).open) throw new Error('expected the door to already be open before testing the handle');

  await page.click('.rf-door-inside');
  await page.waitForTimeout(1100);
  expectClosed(await state(), 'clicking the open door\'s inside face');

  await page.click('#rfHandle');
  await page.waitForTimeout(1100);
  expectOpen(await state(), 'clicking the handle on the closed door');

  await page.focus('#rfHandle');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1100);
  expectClosed(await state(), 'Enter on the focused handle');

  await page.keyboard.press('Enter');
  await page.waitForTimeout(1100);
  expectOpen(await state(), 'Enter on the handle again');

  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

async function realFridgeReducedMotionScenario(browser) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#headline');

  console.log('\n--- REAL FRIDGE: prefers-reduced-motion skips the load animation ---');
  // No wait for rfInit's normal 500ms delay -- reduced motion should show
  // it open essentially immediately, not after the same pause.
  await page.waitForTimeout(80);
  const openImmediately = await page.$eval('#rfUnit', el => el.classList.contains('open'));
  console.log('open within 80ms of load:', openImmediately);
  if (!openImmediately) throw new Error('prefers-reduced-motion did not show the door open immediately on load');

  const transitionDuration = await page.$eval('#rfDoor', el => getComputedStyle(el).transitionDuration);
  console.log('door transition-duration under reduced motion:', transitionDuration);
  if (!/^0s(,\s*0s)*$/.test(transitionDuration.trim())) throw new Error(`expected the door's transition to be suppressed (0s) under reduced motion, got "${transitionDuration}"`);

  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

async function realFridgeClosedCountScenario(browser) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#headline');
  const day = await page.evaluate(() => today());
  await rfSeed(page, day);

  console.log('\n--- REAL FRIDGE: closed-door count matches the turn/crit "at risk" bucket ---');
  // chicken (today, crit) and spinach (5d bought, 7d shelf -> 2d left, crit)
  // are at risk; cheese (5d bought, 42d shelf) is fresh; tomato (9d bought,
  // 7d shelf) is already gone, into the crisper, not this count.
  const line = await page.textContent('#rfClosedLine');
  console.log('closed-door line:', line.trim());
  if (line.trim() !== '2 items need attention') throw new Error(`expected "2 items need attention", got "${line.trim()}"`);

  await page.screenshot({ path: path.join(OUT, 'scn-realfridge-closedcount.png') });
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

async function realFridgeItemTapScenario(browser) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#headline');
  const day = await page.evaluate(() => today());
  await rfSeed(page, day);
  await page.waitForTimeout(900); // past the load-open animation

  console.log('\n--- REAL FRIDGE: tapping an item shows a popover and never the door ---');
  const openBefore = await page.$eval('#rfUnit', el => el.classList.contains('open'));

  await page.click('[data-rf-item]');
  await page.waitForTimeout(150);
  const popoverVisible = await page.$eval('#rfPopover', el => !el.hidden);
  const popoverText = await page.textContent('#rfPopover');
  console.log('popover visible after item tap:', popoverVisible, '· text:', popoverText.replace(/\s+/g, ' ').trim());
  if (!popoverVisible) throw new Error('tapping an item did not open the popover');
  if (!/Bought|Status|Left/.test(popoverText)) throw new Error('popover is missing the expected name/bought/status/left fields');

  const openAfterTap = await page.$eval('#rfUnit', el => el.classList.contains('open'));
  console.log('door state unchanged by the item tap:', openBefore === openAfterTap);
  if (openBefore !== openAfterTap) throw new Error('tapping an item changed the door state -- it must never trigger the door');

  // Clicking elsewhere (outside the popover) dismisses it.
  await page.click('#headline');
  await page.waitForTimeout(100);
  const popoverAfterOutsideClick = await page.$eval('#rfPopover', el => el.hidden);
  console.log('popover hidden after an outside click:', popoverAfterOutsideClick);
  if (!popoverAfterOutsideClick) throw new Error('clicking outside the popover did not dismiss it');

  await page.screenshot({ path: path.join(OUT, 'scn-realfridge-popover.png') });
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Schema-1 saved state (before the app went English-only) can carry
// Chinese names, but only on custom records: a '_c_' + raw-text key on a
// fridge item and on its standing entry. These four scenarios seed such a
// state directly, load the current code, and read back what it saved.
async function seedLegacy(browser, build) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`);
  const day = await page.evaluate(() => {
    const d = new Date();
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
  });
  const state = build(day);
  await page.evaluate(st => { localStorage.clear(); localStorage.setItem('perishable.v1', JSON.stringify(st)); }, state);
  await page.reload();
  await page.waitForSelector('#headline');
  const read = async () => JSON.parse(await page.evaluate(() => localStorage.getItem('perishable.v1')));
  return { page, errors, day, state, read };
}

function legacyCustom(name) {
  return { en: name, zh: [], shelf: 7, g: 250, usd: 2.5 };
}

function expectEqual(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`);
}

async function legacyMapScenario(browser) {
  console.log('\n--- LEGACY NAMES: known Chinese names move to their English FOODS entry ---');
  const { page, errors, day, read } = await seedLegacy(browser, day => ({
    fridge: [
      { id: 5, key: '_c_菠菜', bought: day - 2, custom: legacyCustom('菠菜') },
      { id: 6, key: 'milk', bought: day - 1, custom: null },
      { id: 7, key: '_c_番茄', bought: day - 9, custom: legacyCustom('番茄'), crossed: true },
    ],
    standing: {
      '_c_菠菜': { count: 2, lastBought: day - 2, custom: legacyCustom('菠菜') },
      milk: { count: 1, lastBought: day - 1, custom: null },
      '_c_番茄': { count: 1, lastBought: day - 9, custom: legacyCustom('番茄') },
    },
    ledger: { wasteG: 300, wasteUSD: 2.5, savedG: 400 },
    uid: 7, startedAt: day - 20, lastVisit: day,
  }));
  const after = await read();
  const byId = Object.fromEntries(after.fridge.map(it => [it.id, it]));
  console.log('fridge after load:', after.fridge.map(it => `${it.id}:${it.key}`).join(', '));
  console.log('standing keys after load:', Object.keys(after.standing).join(', '));
  expectEqual('spinach record', byId[5], { id: 5, key: 'spinach', bought: day - 2, custom: null });
  expectEqual('tomato record keeps date and crossed', [byId[7].key, byId[7].bought - day, byId[7].crossed, byId[7].custom], ['tomato', -9, true, null]);
  expectEqual('untouched milk record', [byId[6].key, byId[6].custom], ['milk', null]);
  expectEqual('standing spinach', after.standing.spinach, { count: 2, lastBought: day - 2, custom: null });
  if ('_c_菠菜' in after.standing || '_c_番茄' in after.standing) throw new Error('old Chinese standing keys survived the migration');
  expectEqual('ledger unchanged', after.ledger, { wasteG: 300, wasteUSD: 2.5, savedG: 400 });
  expectEqual('uid unchanged', after.uid, 7);
  expectEqual('schema stamped', after.schema, 3);
  const label = await page.$$eval('.row, [data-id]', els => els.map(e => e.textContent).join(' '));
  if (/[一-鿿]/.test(label)) throw new Error('Chinese text still rendered after migration');
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  console.log('ids, dates, crossed status and ledger kept; keys now English: ok');
  await page.context().close();
}

async function legacyLinkScenario(browser) {
  console.log('\n--- LEGACY NAMES: restock entries stay linked to their fridge records ---');
  const { page, errors, day, read } = await seedLegacy(browser, day => ({
    fridge: [
      { id: 1, key: 'spinach', bought: day - 4, custom: null },
      { id: 2, key: '_c_菠菜', bought: day - 1, custom: legacyCustom('菠菜') },
      { id: 3, key: '_c_菠菜', bought: day, custom: legacyCustom('菠菜') },
    ],
    standing: {
      spinach: { count: 3, lastBought: day - 4, custom: null },
      '_c_菠菜': { count: 2, lastBought: day, custom: legacyCustom('菠菜') },
    },
    ledger: { wasteG: 0, wasteUSD: 0, savedG: 0 },
    uid: 3, startedAt: day - 10, lastVisit: day,
  }));
  const after = await read();
  console.log('fridge after load:', after.fridge.map(it => `${it.id}:${it.key}@${it.bought - day}`).join(', '));
  console.log('standing after load:', JSON.stringify(after.standing));
  expectEqual('fridge keys', after.fridge.map(it => [it.id, it.key]), [[1, 'spinach'], [2, 'spinach'], [3, 'spinach']]);
  expectEqual('fridge dates', after.fridge.map(it => it.bought - day), [-4, -1, 0]);
  expectEqual('one merged standing entry', Object.keys(after.standing), ['spinach']);
  expectEqual('merged count and latest purchase', [after.standing.spinach.count, after.standing.spinach.lastBought - day], [5, 0]);
  // Every fridge record's key resolves to a live standing entry: the
  // restock chip and the records it restocks still point at each other.
  for (const it of after.fridge) if (!after.standing[it.key]) throw new Error(`fridge record ${it.id} lost its standing entry`);
  const chips = await page.$$eval('[data-restock]', els => els.map(e => e.dataset.restock));
  expectEqual('restock chips', chips, ['spinach']);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  console.log('links intact, standing merged instead of duplicated: ok');
  await page.context().close();
}

async function legacyOnceScenario(browser) {
  console.log('\n--- LEGACY NAMES: migration runs once; repeat loads change nothing ---');
  const { page, errors, read } = await seedLegacy(browser, day => ({
    fridge: [{ id: 1, key: '_c_牛奶', bought: day - 1, custom: legacyCustom('牛奶') }],
    standing: { '_c_牛奶': { count: 1, lastBought: day - 1, custom: legacyCustom('牛奶') } },
    ledger: { wasteG: 0, wasteUSD: 0, savedG: 0 },
    uid: 1, startedAt: day - 3, lastVisit: day,
  }));
  const first = await read();
  for (let n = 0; n < 3; n++) { await page.reload(); await page.waitForSelector('#headline'); }
  const later = await read();
  console.log('after first load:', JSON.stringify({ fridge: first.fridge, standing: first.standing }));
  expectEqual('state after three more loads', later, first);
  expectEqual('no duplicate records', [later.fridge.length, Object.keys(later.standing).length], [1, 1]);
  // A schema-2 state is never re-migrated, even if it somehow holds a
  // name the old table would have mapped.
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('perishable.v1'));
    st.fridge.push({ id: 9, key: '_c_牛奶', bought: st.lastVisit, custom: { en: '牛奶', zh: [], shelf: 7, g: 250, usd: 2.5 } });
    localStorage.setItem('perishable.v1', JSON.stringify(st));
  });
  await page.reload(); await page.waitForSelector('#headline');
  const stamped = await read();
  expectEqual('schema-2 record left alone', stamped.fridge.find(it => it.id === 9).key, '_c_牛奶');
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  console.log('idempotent, schema-gated: ok');
  await page.context().close();
}

async function legacyUnmappedScenario(browser) {
  console.log('\n--- LEGACY NAMES: anything not mapped exactly stays as it was ---');
  const keep = day => ({
    fridge: [
      { id: 1, key: '_c_火龙果', bought: day - 2, custom: legacyCustom('火龙果') },
      { id: 2, key: '_c_有机菠菜', bought: day - 1, custom: legacyCustom('有机菠菜') },
      { id: 3, key: '_c_菠菜', bought: day - 1, custom: legacyCustom('菠菜') },
      { id: 4, key: '_c_dragonfruit', bought: day - 3, custom: legacyCustom('Dragonfruit') },
    ],
    standing: {
      '_c_火龙果': { count: 1, lastBought: day - 2, custom: legacyCustom('火龙果') },
      '_c_有机菠菜': { count: 1, lastBought: day - 1, custom: legacyCustom('有机菠菜') },
      // same key as fridge record 3, but this entry's own name doesn't map
      // exactly -- so neither moves, and the pair stays linked
      '_c_菠菜': { count: 1, lastBought: day - 1, custom: legacyCustom('菠菜（散装）') },
      '_c_dragonfruit': { count: 1, lastBought: day - 3, custom: legacyCustom('Dragonfruit') },
    },
    ledger: { wasteG: 0, wasteUSD: 0, savedG: 0 },
    uid: 4, startedAt: day - 10, lastVisit: day,
  });
  const { page, errors, state, read } = await seedLegacy(browser, keep);
  const after = await read();
  console.log('fridge keys after load:', after.fridge.map(it => it.key).join(', '));
  expectEqual('unmapped fridge records', after.fridge, state.fridge);
  expectEqual('unmapped standing entries', after.standing, state.standing);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  console.log('unmapped and partly-mapped records kept exactly: ok');
  await page.context().close();
}

async function splitEntriesScenario(browser) {
  console.log('\n--- SPLIT ENTRIES: saved lettuce/cheese/carrot/onion/milk keep their dates ---');
  const { page, errors, day, read } = await seedLegacy(browser, day => ({
    schema: 2,
    fridge: [
      { id: 1, key: 'lettuce', bought: day - 2, custom: null },
      { id: 2, key: 'cheese', bought: day - 30, custom: null },
      { id: 3, key: 'carrot', bought: day - 20, custom: null },
      { id: 4, key: 'onion', bought: day - 4, custom: null, crossed: false },
      { id: 5, key: 'milk', bought: day - 3, custom: null },
    ],
    standing: {
      lettuce: { count: 2, lastBought: day - 2, custom: null },
      cheese: { count: 1, lastBought: day - 30, custom: null },
      hardcheese: { count: 1, lastBought: day - 60, custom: null },
      onion: { count: 3, lastBought: day - 4, custom: null },
    },
    ledger: { wasteG: 0, wasteUSD: 0, savedG: 0 },
    uid: 5, startedAt: day - 40, lastVisit: day,
  }));
  const after = await read();
  const rows = after.fridge.map(it => [it.id, it.key, it.bought - day, it.shelf]);
  console.log('fridge after load [id, key, bought, pinned shelf]:', JSON.stringify(rows));
  expectEqual('records', rows, [
    [1, 'leaflettuce', -2, 7], [2, 'hardcheese', -30, 42], [3, 'carrot', -20, 28], [4, 'onion', -4, 10], [5, 'milk', -3, 7],
  ]);
  expectEqual('standing', Object.keys(after.standing).sort(), ['hardcheese', 'leaflettuce', 'onion']);
  expectEqual('merged cheese standing', [after.standing.hardcheese.count, after.standing.hardcheese.lastBought - day], [2, -30]);
  // Days left on screen are the ones the old values gave: 5, 12, 8, 6, 4.
  const shown = (await readInventory(page)).map(r => r.name + ' ' + r.left);
  console.log('inventory rows:', JSON.stringify(shown));
  for (const [name, days] of [['Leaf lettuce', 5], ['Hard cheese', 12], ['Carrots', 8], ['Onion', 6], ['Milk', 4]]) {
    if (!shown.some(t => t.includes(name) && new RegExp(`\\b${days}\\b`).test(t))) throw new Error(`${name} does not show ${days} days left`);
  }
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  console.log('dates kept, items still display under their new names: ok');
  await page.context().close();
}

// ---------- FoodKeeper fallback, matching and dates (Part B step 5) ----------
// Each drives the real controls: #entry/#addbtn, the add preview's
// selects and date inputs, the receipt review, the restock chips and the
// illustrated fridge's popover.

async function freshPage(browser) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => localStorage.setItem('perishable.key', 'test-key'));
  await page.reload();
  await page.waitForSelector('#headline');
  return { page, errors };
}
async function typeEntry(page, text) {
  await page.fill('#entry', text);
  await page.click('#addbtn');
  await page.waitForTimeout(120);
}
// The receipt asks: there are lines on it waiting for Put away.
const previewOpen = page => page.$eval('#receiptLines', el => !!el.querySelector('.receipt-row'));
// Every typed line taken off the receipt with its own ×.
// Where a receipt line's match comes from, whether or not the line says so.
const lineSource = (page, i) => page.evaluate(i => pendingItems[i].key ? sourceOf(pendingItems[i].key) : '', i);
async function takeOffReceipt(page) {
  while (await page.$('#receiptLines .rl-void')) {
    await page.click('#receiptLines .rl-void');
    await page.waitForTimeout(20);
  }
}
// A receipt line: the name as shown (what was typed, store words cleaned
// off), the food it matched when that's a different name (as, shown
// inline after an arrow), its flag, the questions under it (details), and
// -- from the line's data, since the receipt no longer says it -- where
// its numbers come from (source). match is source and details together.
function readReview(page, box) {
  return page.$$eval(`${box} .receipt-row`, els => els.map(el => {
    const e = pendingItems[+el.dataset.idx];
    const source = e && e.key ? sourceOf(e.key) : '';
    const details = (el.querySelector('.match') || { textContent: '' }).textContent.replace(/\s+/g, ' ').trim();
    const arrow = el.querySelector('.rl-match');
    return {
      name: el.querySelector('.receipt-name').value,
      as: arrow ? arrow.textContent.replace(/^→\s*/, '') : null,
      flag: el.classList.contains('unresolved') ? 'no match / choice' : el.classList.contains('needs-date') ? 'needs date' : '',
      source, details, match: (source + ' ' + details).trim(),
      options: [...el.querySelectorAll('.entry-pick option')].slice(1).map(o => o.textContent)
    };
  }));
}
// Every item as the line-art row shows it -- the row does the list's job
// now -- with days left written out the way the old list wrote them
// ("10d" -> "10 days", "1d" -> "1 day", "3d gone" -> "3d past") so the
// expectations read as before; weight is the popover's Est. weight.
// The line-art row sits closed under "All items (N)"; it's laid out when
// it opens, so open it (and let it draw) before reading or clicking in it.
async function openRow(page) {
  if (await page.$eval('#allItems', d => d.open)) return;
  await page.$eval('#allItems', d => { d.open = true; });
  await page.waitForTimeout(150);
}
async function readInventory(page) {
  await openRow(page);
  return page.$$eval('#fridgeShelf .fridge-label, #fridgeDrawerItems .fridge-label', els => els.map(e => {
    const name = e.childNodes[0].textContent.trim();
    const days = e.querySelector('.fridge-days').textContent.trim();
    const m = days.match(/^(\d+)d( gone)?$/);
    const left = !m ? days : m[2] ? m[1] + 'd past' : m[1] + (m[1] === '1' ? ' day' : ' days');
    const it = fridge.find(i => food(i).en === name);
    return { name, left, g: it ? estWeightOf(it) : '' };
  }));
}
const isoIn = (page, n) => page.evaluate(n => new Date((today() + n - DAY_OFFSET) * 86400000).toISOString().slice(0, 10), n);
async function popoverText(page, key) {
  const id = await page.evaluate(k => fridge.find(i => i.key === k).id, key);
  await page.$eval(`[data-rf-item="${id}"]`, el => el.click());
  await page.waitForTimeout(80);
  const text = (await page.textContent('#rfPopover')).replace(/\s+/g, ' ').trim();
  await page.click('#headline');
  return text;
}
function expectRow(rows, name, left, g) {
  const r = rows.find(x => x.name === name);
  if (!r) throw new Error(`no inventory row "${name}" in ${JSON.stringify(rows)}`);
  expectEqual(`${name} days left`, r.left, left);
  if (g) expectEqual(`${name} weight`, r.g, g);
}

// A food only FoodKeeper knows gets FoodKeeper's days, the generic
// fallback's estimated weight (≈, its decay category's FOODS median), and
// goes straight in when nothing needs asking.
async function fkOnlyScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- FOODKEEPER ONLY: an item outside FOODS gets FoodKeeper days ---');
  await typeEntry(page, 'boysenberries, chicken salad 1d');
  if (await previewOpen(page)) throw new Error('both match one FoodKeeper item with days; nothing should be asked');
  const rows = await readInventory(page);
  console.log('inventory:', JSON.stringify(rows));
  const med = await page.evaluate(() => [CAT_MEDIANS.soft.g, CAT_MEDIANS.cooked.g]);
  expectRow(rows, 'Boysenberries', '6 days', `≈${med[0]} g`);   // #253, 6
  expectRow(rows, 'Chicken salad', '3 days', `≈${med[1]} g`);                               // #418, 4, bought 1 day ago
  await page.waitForTimeout(900);
  const pop = await popoverText(page, '_fk_253');
  console.log('popover:', pop);
  if (!/^× Boysenberries/.test(pop)) throw new Error('popover title should be the typed name');
  if (!pop.includes('FoodKeeper #253 “Berries (blackberries, boysenberries, currant)”')) throw new Error('popover source should name #253 and its title');
  // A FoodKeeper-only food counted from ripeness offers Ripe / Not ripe yet.
  await typeEntry(page, 'apricots');
  const [apricot] = await readReview(page, '#receiptLines');
  console.log(' ', apricot.name, '|', apricot.flag || 'ok', '|', apricot.match);
  if (apricot.match.includes('FOODS') || !apricot.match.includes('FoodKeeper #249')) throw new Error('apricots should match FoodKeeper #249 alone');
  if (!apricot.match.includes('Ripe') || !apricot.match.includes('Not ripe yet')) throw new Error('apricots should offer the ripeness choice');
  await takeOffReceipt(page);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// FOODS aliases and receipt words: whole-name matches straight in.
async function aliasScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- ALIASES: alias and store words resolve to the FOODS entry ---');
  await typeEntry(page, 'romaine hearts, yams, pico de gallo, ks organic large eggs');
  if (await previewOpen(page)) throw new Error('every name is an exact FOODS alias; nothing should be asked');
  const rows = await readInventory(page);
  console.log('inventory:', JSON.stringify(rows.map(r => r.name + ' ' + r.left)));
  expectRow(rows, 'Romaine lettuce', '14 days');
  expectRow(rows, 'Sweet potatoes', '21 days');
  expectRow(rows, 'Fresh salsa', '7 days');
  expectRow(rows, 'Eggs', '35 days');
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// One generic word never carries a longer name.
async function noFalseMatchScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- NO FALSE MATCH: apple juice is not Apple, almond milk is not Milk ---');
  await typeEntry(page, 'apple juice, chicken salad, almond milk, potato chips');
  if (!(await previewOpen(page))) throw new Error('almond milk and potato chips need answers; the preview should open');
  const rows = await readReview(page, '#receiptLines');
  rows.forEach(r => console.log(' ', r.name, '|', r.flag || 'ok', '|', r.match));
  const byName = n => rows.find(r => r.name === n);
  const expectMatch = (n, src, not) => {
    const r = byName(n);
    if (!r.match.includes(src)) throw new Error(`${n} should match ${src}: ${r.match}`);
    if (r.match.includes(not)) throw new Error(`${n} matched ${not}`);
  };
  expectMatch('Apple juice', 'FoodKeeper #537', 'matched Apple ·');
  expectMatch('Chicken salad', 'FoodKeeper #418', 'Chicken breast');
  expectMatch('Almond milk', 'FoodKeeper #427', 'matched Milk ·');
  expectEqual('almond milk flag', byName('Almond milk').flag, 'needs date');
  expectEqual('potato chips flag', byName('Potato chips').flag, 'no match / choice');
  if (!byName('Potato chips').match.includes('no shelf-life data')) throw new Error('potato chips should say no shelf-life data');
  const keys = await page.evaluate(() => ['apple juice', 'chicken salad', 'almond milk', 'potato chips'].map(t => resolveName(t).keys));
  if (keys.flat().some(k => ['apple', 'chicken', 'milk', 'potato'].includes(k))) throw new Error('a generic FOODS key matched: ' + JSON.stringify(keys));
  await takeOffReceipt(page);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// A FoodKeeper entry that covers several species never redirects to one
// FOODS food; the hand-kept aliases in the import script catch store names.
async function handAliasScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- HAND ALIASES: ground pork is Pork (ground); papaya is not Mango, tuna is not Salmon ---');
  const got = await page.evaluate(() => Object.fromEntries(
    ['kiwi', 'mandarins', 'ground pork', 'deli turkey', 'yellow squash', 'green onions', 'papaya', 'tuna', 'parsnips', 'buns']
      .map(t => { const r = resolveName(t); return [t, r.keys.length === 1 ? r.keys[0] : r.keys]; })));
  console.log(JSON.stringify(got));
  // kiwi and mandarins have FOODS entries now, which match first; their
  // hand aliases still reach the FoodKeeper rows for the fallback table.
  expectEqual('kiwi', got['kiwi'], 'kiwi');
  expectEqual('mandarins', got['mandarins'], 'mandarin');
  const fkAliases = await page.evaluate(() => [FK_BY_ID.get(263)[2], FK_BY_ID.get(256)[2]]);
  if (!fkAliases[0].split('|').includes('kiwi') || !fkAliases[1].split('|').includes('mandarin')) throw new Error('hand aliases missing from FK_TABLE: ' + JSON.stringify(fkAliases));
  expectEqual('ground pork', got['ground pork'], '_fk_73');
  expectEqual('deli turkey', got['deli turkey'], '_fk_514');
  expectEqual('yellow squash', got['yellow squash'], '_fk_302');
  expectEqual('green onions', got['green onions'], 'scallion');
  expectEqual('papaya (its own FOODS entry, never Mango)', got['papaya'], 'papaya');
  expectEqual('tuna', got['tuna'], '_fk_146');
  expectEqual('parsnips', got['parsnips'], '_fk_279');
  expectEqual('buns', got['buns'], '_fk_195');
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Equal matches ask; nothing goes in until the person picks.
async function ambiguousScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- AMBIGUOUS: "cheese" and "tortillas" ask which one ---');
  await typeEntry(page, 'cheese, tortillas');
  const rows = await readReview(page, '#receiptLines');
  rows.forEach(r => console.log(' ', r.name, '|', r.flag, '|', r.options.join(' / ')));
  expectEqual('cheese options', rows[0].options, ['Hard cheese (FOODS)', 'Shredded cheese (FOODS)', 'Soft cheese (FOODS)']);
  expectEqual('tortilla options', rows[1].options, ['Flour tortillas (FOODS)', 'Corn tortillas (FOODS)']);
  if (!(await page.$eval('#addbtn', b => b.disabled))) throw new Error('Add should be blocked while a choice is open');
  if ((await readInventory(page)).length) throw new Error('nothing should be added before the choices are made');
  await page.selectOption('#receiptLines .entry-pick[data-idx="0"]', 'softcheese');
  await page.selectOption('#receiptLines .entry-pick[data-idx="1"]', 'corntortilla');
  await page.click('#addbtn');
  await page.waitForTimeout(100);
  const inv = await readInventory(page);
  console.log('inventory:', JSON.stringify(inv.map(r => r.name + ' ' + r.left)));
  expectRow(inv, 'Soft cheese', '14 days');
  expectRow(inv, 'Corn tortillas', '90 days');
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// No match: no default; blocked until a use-by date is given, then that
// date is what the item keeps.
async function noMatchScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- NO MATCH: cannot be saved without a date ---');
  await typeEntry(page, 'potato chips 2d');
  const [row] = await readReview(page, '#receiptLines');
  console.log(' ', row.name, '|', row.flag, '|', row.match);
  if (!(await page.$eval('#addbtn', b => b.disabled))) throw new Error('Put away should be blocked with no date');
  await page.waitForTimeout(80);
  expectEqual('fridge after refused add', (await readInventory(page)).length, 0);
  await page.fill('#receiptLines .entry-date[data-idx="0"]', await isoIn(page, 28));
  await page.click('#addbtn');
  await page.waitForTimeout(100);
  const inv = await readInventory(page);
  console.log('inventory:', JSON.stringify(inv));
  expectRow(inv, 'Potato chips', '28 days');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('perishable.v1')).fridge[0]);
  expectEqual('saved shelf (use-by minus purchase)', [saved.shelf, saved.shelfFrom, saved.key], [30, 'date', '_c_potatochips']);
  await page.waitForTimeout(900);
  const pop = await popoverText(page, '_c_potatochips');
  if (!pop.includes('date given at entry')) throw new Error('popover should say the date was given at entry: ' + pop);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// A receipt of new staples: FOODS additions, a FoodKeeper-only line, two
// package/ripeness dates, and a choice; then restocking a package-date
// item asks again, and puts a second one beside the first.
async function receiptNewItemsScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- RECEIPT: new foods, dates and a choice ---');
  await page.evaluate(() => {
    window.__receiptApiOverride = async () => ({
      date: null,
      items: [
        {raw: 'KS ORG STRAWBERRIES 2LB', expanded: 'Kirkland organic strawberries', quantity: 1, is_food: true},
        {raw: 'ROTISSERIE CHKN', expanded: 'Rotisserie chicken', quantity: 1, is_food: true},
        {raw: 'AVOCADO HASS 5CT', expanded: 'Avocados', quantity: 1, is_food: true},
        {raw: 'DAISY SOUR CRM', expanded: 'Sour cream', quantity: 1, is_food: true},
        {raw: 'MISSION TORTILLA', expanded: 'Tortillas', quantity: 1, is_food: true},
        {raw: 'PLUMS', expanded: 'Plums', quantity: 1, is_food: true},
        {raw: 'KS SALMON FILLET', expanded: 'Salmon fillet', quantity: 1, is_food: true}
      ]
    });
  });
  const fixturePath = path.join(require('os').tmpdir(), 'perishable-receipt-fixture-2.jpg');
  fs.writeFileSync(fixturePath, FIXTURE_JPEG);
  await page.setInputFiles('#receiptFile', fixturePath);
  await page.waitForSelector('#receiptLines .receipt-row');
  const rows = await readReview(page, '#receiptLines');
  rows.forEach(r => console.log(' ', r.name, '|', r.flag || 'ok', '|', r.match));
  expectEqual('flags', rows.map(r => r.flag), ['', '', '', 'needs date', 'no match / choice', '', '']);
  expectEqual('scanned names, cleaned (the match, where it differs)', rows.map(r => r.as || r.name),
    ['Strawberries', 'Rotisserie chicken', 'Avocados', 'Sour cream', 'Tortillas', 'Plums', 'Salmon']);
  if (!rows[0].match.includes('FOODS, FoodKeeper #481')) throw new Error('strawberries should match FOODS (#481)');
  if (!rows[2].match.includes('Not ripe yet')) throw new Error('avocados should offer the ripeness choice');
  if (!(await lineSource(page, 5)).includes('FOODS, FoodKeeper #266') || !rows[5].match.includes('Not ripe yet')) throw new Error('plums should match FOODS (#266) and offer the ripeness choice');
  if (!(await page.$eval('#addbtn', b => b.disabled))) throw new Error('confirm should be blocked');

  await page.check('#receiptLines .entry-ripe[data-idx="2"][value="unripe"]');
  await page.fill('#receiptLines .entry-date[data-idx="3"]', await isoIn(page, 21));
  await page.selectOption('#receiptLines .entry-pick[data-idx="4"]', 'flourtortilla');
  await page.fill('#receiptLines .entry-date[data-idx="4"]', await isoIn(page, 30));
  await page.click('#addbtn');
  await page.waitForTimeout(150);
  fs.unlinkSync(fixturePath);

  const inv = await readInventory(page);
  console.log('inventory:', JSON.stringify(inv.map(r => r.name + ' ' + r.left)));
  expectRow(inv, 'Strawberries', '3 days');
  expectRow(inv, 'Rotisserie chicken', '4 days');
  expectRow(inv, 'Avocados', 'ripening');
  expectRow(inv, 'Sour cream', '21 days');
  expectRow(inv, 'Flour tortillas', '30 days');
  expectRow(inv, 'Plums', '5 days');
  expectRow(inv, 'Salmon', '2 days');

  await page.waitForTimeout(900);
  const popSour = await popoverText(page, 'sourcream');
  const popAvo = await popoverText(page, 'avocado');
  const popStraw = await popoverText(page, 'strawberry');
  console.log('popovers:', [popSour, popAvo, popStraw].map(t => t.replace(/^.*Shelf life/, '')).join(' / '));
  if (!popSour.includes('package date')) throw new Error('sour cream popover should say package date');
  if (!popAvo.includes('ripening')) throw new Error('avocado popover should say ripening: ' + popAvo);
  if (!popStraw.includes('FoodKeeper #481')) throw new Error('strawberry popover should name #481');

  await page.click('[data-restock="sourcream"]');
  await page.waitForTimeout(100);
  const heading = await page.textContent('#receiptLines .receipt-row:last-child');
  console.log('restock sour cream:', heading.replace(/\s+/g, ' ').trim());
  if (!/date\?/.test(heading) || !/printed date/.test(heading) || /needs the date/.test(heading)) throw new Error('restocking sour cream should ask for the printed date on its receipt line');
  await page.fill('#receiptLines .entry-date[data-idx="0"]', await isoIn(page, 25));
  await page.click('#addbtn');
  await page.waitForTimeout(100);
  const after = await readInventory(page);
  // a second tub beside the first, each with its own printed date
  expectEqual('sour cream rows after restock', after.filter(r => r.name === 'Sour cream').map(r => r.left), ['21 days', '25 days']);
  await page.screenshot({ path: path.join(OUT, 'scn-receipt-new-foods.png'), fullPage: true });
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Only a toss is waste: restocking something past date leaves the old one
// in the drawer, counted nowhere, and adds the new one beside it.
async function restockNoWasteScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- RESTOCK: a past-date item is not counted as waste ---');
  await typeEntry(page, 'yogurt 20d');
  await page.click('[data-restock="yogurt"]');
  await page.click('#addbtn');
  await page.waitForTimeout(100);
  const inv = await readInventory(page);
  console.log('inventory:', JSON.stringify(inv.map(r => r.name + ' ' + r.left)), '· waste:', await page.textContent('#wasteG'));
  expectEqual('yogurt rows', inv.map(r => r.left).sort(), ['14 days', '6d past']);
  expectEqual('waste after restock', (await page.textContent('#wasteG')).trim(), '0 g');
  expectEqual('ledger', await page.evaluate(() => [ledger.wasteG, ledger.wasteUSD]), [0, 0]);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// The same 18 items in both fridges, at desktop and phone width: FOODS
// additions, FoodKeeper fallbacks under their typed names, estimated
// items, package and ripeness dates, a no-match item with its own date,
// and one past date. Asserts the layout and writes four screenshots.
const MIXED_18 = [
  ['strawberry', 1], ['avocado', 0, 6], ['salmon', 0], ['onion', 5], ['milk', 2, 9], ['sourcream', 3, 24],
  ['_fk_266', 2, 7, null, 'Plums'], ['_fk_418', 3, null, null, 'Chicken salad'], ['tomato', 4], ['napacabbage', 2],
  ['rotisserie', 3], ['beets', 1], ['bread', 15], ['_fk_427', 1, 10, null, 'Almond milk'], ['spinach', 9],
  ['shrimp', 1], ['chickenthigh', 0], ['_c_potatochips', 0, 60, {en: 'Potato chips', g: 450, usd: 2.99, estWeight: true}]
];
// Twenty savable items, most of them fruit, across the urgency range: the
// All items row at desktop (nine to a shelf, labels in one row) and phone.
const ROW_20 = [
  ['strawberry', 2], ['cherries', 2], ['raspberry', 1], ['salmon', 1], ['avocado', 2], ['peach', 3], ['kiwi', 3],
  ['banana', 1], ['blackberry', 3], ['cantaloupe', 1], ['mango', 4], ['grapes', 3], ['plum', 2],
  ['pineapple', 2], ['honeydew', 2], ['lychee', 2], ['blueberry', 5], ['coconut', 1], ['lime', 6], ['pomegranate', 10]
];
async function rowFixtureScenario(browser) {
  console.log('\n--- ALL ITEMS ROW: 20 items, desktop and phone ---');
  for (const [w, tag] of [[1280, 'desktop'], [390, 'phone']]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: 1400 } })).newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await seedMixed18(page, ROW_20);
    await page.waitForSelector('#headline');
    await page.waitForTimeout(1300);
    const res = await assertFridgeLayout(page, `row 20 at ${w}px`);
    expectEqual(`all 20 on the row at ${w}px`, res.labels, 20);
    if (w > 720) expectEqual('desktop shelves', JSON.stringify(res.perShelf), '[9,9,2]');
    await (await page.$('.fridgeview')).screenshot({ path: path.join(OUT, `row20-${tag}.png`) });
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    await page.context().close();
  }
}
async function seedMixed18(page, items = MIXED_18) {
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(items => {
    const d = new Date(), T = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
    const fridge = [], standing = {};
    items.forEach(([key, ago, shelf, custom, name, extra], i) => {
      const it = {id: i + 1, key, bought: T - ago, custom: custom || null};
      if (name) it.name = name;
      if (extra) Object.assign(it, extra);
      if (shelf != null){ it.shelf = shelf; it.shelfFrom = 'date'; }
      fridge.push(it);
      standing[key] = {count: 1, lastBought: T - ago, custom: custom || null, ...(name ? {name} : {})};
    });
    localStorage.setItem('perishable.v1', JSON.stringify({schema: 3, fridge, standing,
      ledger: {wasteG: 0, wasteUSD: 0, savedG: 0}, uid: items.length, startedAt: T - 15, lastVisit: T}));
  }, items);
  await page.reload();
}

// The 18-item fixture has chicken thighs and a rotisserie chicken, milk
// and onion: chicken thighs fill a dish's "chicken", so Tonight has a dish.
async function dishFixtureScenario(browser) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await seedMixed18(page);
  await page.waitForSelector('#headline');
  console.log('\n--- DISHES: the 18-item fixture has a dish tonight ---');
  const h2 = (await page.textContent('#tonight h2')).trim();
  const board = await page.$$eval('#kcBoardItems [data-board-item]', els => els.map(e => e.getAttribute('aria-label')));
  console.log('tonight:', h2, JSON.stringify(board));
  expectEqual('tonight dish', h2, 'Creamy chicken spinach rice');
  if (!board.some(c => /^(Rotisserie chicken|Chicken thighs)$/.test(c))) throw new Error('chicken should be filled by the thighs or the rotisserie chicken');
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}
async function mixedFridgeScenario(browser) {
  console.log('\n--- MIXED 18: both fridges, desktop and phone ---');
  for (const [w, tag] of [[1280, 'desktop'], [390, 'phone']]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: 1400 } })).newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await seedMixed18(page);
    await page.waitForSelector('#headline');
    await page.waitForTimeout(1300);
    await openRow(page);
    const names = await page.$$eval('#fridgeShelf .fridge-label', els => els.map(e => e.childNodes[0].textContent.trim()));
    if (names.some(n => /nectarines|sapote|\(/.test(n))) throw new Error('a label shows a FoodKeeper title: ' + JSON.stringify(names));
    await assertFridgeLayout(page, `mixed 18 at ${w}px`);
    // Illustrated fridge: nothing hangs under its items; the line-art row
    // names every item and carries Used and Tossed under each.
    expectEqual(`no tags in the illustrated fridge at ${w}px`, await page.$$eval('#rfUnit .rf-tag, #rfUnit .rf-under', e => e.length), 0);
    const acts = await page.evaluate(() => [...document.querySelectorAll('.fridge-label')].map(l =>
      [...l.querySelectorAll('.fridge-act')].map(b => { const r = b.getBoundingClientRect(); return [b.textContent, Math.round(r.width), Math.round(r.height)]; })));
    expectEqual(`Used and Tossed under all 18 at ${w}px`, acts.filter(a => a.map(b => b[0]).join() === 'Used,Tossed').length, 18);
    if (w < 720 && acts.flat().some(([, bw, bh]) => bw < 44 || bh < 44)) throw new Error(`a button under 44px on phone: ${JSON.stringify(acts.flat())}`);
    // tapping a drawing in the row opens the same popover
    await page.$eval('[data-fridge-item]', el => { el.scrollIntoView({block: 'center'}); el.click(); });
    if (await page.$eval('#rfPopover', p => p.hidden)) throw new Error('tapping a line-art drawing should open the popover');
    await page.mouse.click(2, 2);
    const crisper = (await page.textContent('#rfCrisperLabel')).replace(/\s+/g, ' ').trim();
    const goneN = await page.evaluate(() => fridge.filter(it => left(it) < 0).length);
    expectEqual('drawer front', crisper, `${goneN} past date · Toss all`);
    const onHandle = await page.evaluate(() => {
      const a = document.getElementById('rfCrisperLabel').getBoundingClientRect();
      const b = document.querySelector('#rfCrisperFrontSvg rect.b3').getBoundingClientRect();
      return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    });
    if (onHandle) throw new Error(`${w}px: the drawer-front line runs into the crisper handle`);
    const look = await page.$eval('#rfUnit .rf-fooditem', b => getComputedStyle(b).cursor);
    expectEqual('items show a pointer', look, 'pointer');
    const quiet = await page.evaluate(() => fridge.find(it => left(it) >= 0).id);
    await page.$eval(`[data-rf-item="${quiet}"]`, el => { el.scrollIntoView({block: 'center'}); el.click(); });
    const popName = await page.textContent('#rfPopover .rf-pop-name');
    expectEqual('tap shows the name', popName.trim(), await page.evaluate(id => food(fridge.find(i => i.id === id)).en, quiet));
    await page.mouse.click(2, 2);
    await page.waitForTimeout(100);
    await (await page.$('#rfUnit')).screenshot({ path: path.join(OUT, `mixed18-illustrated-${tag}.png`) });
    await (await page.$('.fridgeview')).screenshot({ path: path.join(OUT, `mixed18-lineart-${tag}.png`) });
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    await page.context().close();
  }
}

// The decay line with the 18-item fixture: one baseline, Today / 72 h /
// 1 week / 3 weeks, past items on the dashed stub; one label per day up to
// a week, in its urgency colour, never crossing the line, another label or
// another label's stem; one line on desktop, at most two on a phone; dots
// only past a week; the legend on one line.
async function decayLineScenario(browser) {
  console.log('\n--- DECAY LINE: one label per day, nothing crosses ---');
  for (const [w, tag] of [[1280, 'desktop'], [390, 'phone']]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: 1400 } })).newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await seedMixed18(page);
    await page.waitForSelector('#headline');
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const box = el => { const b = el.getBoundingClientRect(); return {left: b.left, right: b.right, top: b.top, bottom: b.bottom, text: el.textContent}; };
      const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const chart = document.getElementById('chart');
      const labels = [...chart.querySelectorAll('.blab')].map(box);
      const stems = [...chart.querySelectorAll('.stem')].map(box);
      const line = chart.querySelector('.axis').getBoundingClientRect().top;
      const legend = document.querySelector('.chart-legend');
      const days = [...new Set(fridge.map(it => left(it)).filter(d => d <= 7).map(d => d < 0 ? 'past' : d))];
      return {
        labels: labels.map(l => l.text), heights: labels.map(l => l.bottom - l.top),
        overlap: labels.flatMap((a, i) => labels.slice(i + 1).filter(b => hit(a, b)).map(b => [a.text, b.text]))[0] || null,
        crossesLine: labels.find(l => l.bottom > line) || null,
        stemThrough: stems.flatMap(s => labels.filter(l => hit({...s, left: s.left + 0.1, right: s.right - 0.1, top: s.top + 0.5, bottom: s.bottom}, l)).map(l => l.text))[0] || null,
        overflow: labels.find(l => l.right > chart.getBoundingClientRect().right + 0.5) || null,
        days: days.length, ticks: [...chart.querySelectorAll('.tl')].map(t => t.textContent),
        dots: chart.querySelectorAll('.dot').length, items: fridge.length,
        legendLines: Math.round(legend.offsetHeight / parseFloat(getComputedStyle(legend).lineHeight || 16)),
        legendH: legend.offsetHeight, legendW: legend.scrollWidth, legendBox: legend.clientWidth,
        vlines: chart.querySelectorAll('.g').length,
        ticksOverlap: (() => { const t = [...chart.querySelectorAll('.tl')].map(box);
          return t.flatMap((a, i) => t.slice(i + 1).filter(b => hit(a, b)).map(b => [a.text, b.text]))[0] || null; })()
      };
    });
    console.log(`${tag}:`, JSON.stringify(r.labels));
    expectEqual(`${tag} ticks`, r.ticks, ['Today', '72 h', '1 week', '3 weeks', 'past']);
    expectEqual(`${tag} one label per day`, r.labels.length, r.days);
    expectEqual(`${tag} a dot per item`, r.dots, r.items);
    expectEqual(`${tag} no vertical gridlines`, r.vlines, 0);
    if (r.ticksOverlap) throw new Error(`${tag}: axis marks overlap: ${JSON.stringify(r.ticksOverlap)}`);
    if (r.overlap) throw new Error(`${tag}: labels overlap: ${JSON.stringify(r.overlap)}`);
    if (r.crossesLine) throw new Error(`${tag}: a label crosses the line: ${JSON.stringify(r.crossesLine)}`);
    if (r.stemThrough) throw new Error(`${tag}: a stem runs through a label: ${r.stemThrough}`);
    if (r.overflow) throw new Error(`${tag}: a label runs past the edge: ${JSON.stringify(r.overflow)}`);
    const maxLines = tag === 'phone' ? 2 : 1;
    if (r.heights.some(h => h > 15 * maxLines + 1)) throw new Error(`${tag}: a label is more than ${maxLines} line(s): ${JSON.stringify(r.heights)}`);
    if (r.legendW > r.legendBox + 1 || r.legendH > 20) throw new Error(`${tag}: legend is not one line: ${JSON.stringify([r.legendW, r.legendBox, r.legendH])}`);
    const b = await page.$eval('#chart', el => { const r = el.getBoundingClientRect(); return { y: r.top + scrollY, h: r.height }; });
    await page.screenshot({ path: path.join(OUT, `decay-line-${tag}.png`), fullPage: true, clip: { x: 0, y: b.y - 16, width: w, height: b.h + 70 } });
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    await page.context().close();
  }
}

// Bought, edited in the popover: an item on its FOODS number keeps its
// shelf life, so Use by moves with it; a Use by the person set stays put.
// Bought can't be in the future or after Use by, and Use by can't be
// before Bought. None of it touches the waste ledger or the restock count.
async function editBoughtScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- EDIT BOUGHT: Use by follows unless I set it ---');
  await typeEntry(page, 'spinach, yogurt');
  await page.waitForTimeout(900);
  const ids = await page.evaluate(() => Object.fromEntries(fridge.map(i => [i.key, i.id])));
  const before = await page.evaluate(() => ({ ledger: {...ledger}, standing: JSON.parse(JSON.stringify(standing)) }));
  const pop = async key => { await page.$eval(`[data-rf-item="${ids[key]}"]`, el => el.click()); await page.waitForSelector('#rfPopover:not([hidden])'); };
  const setField = async (cls, iso) => { await page.fill(`#rfPopover ${cls}`, iso); await page.waitForTimeout(100); };

  // Spinach (FOODS 7 days): bought 2 days ago -> 5 days left.
  await pop('spinach'); await setField('.rf-pop-bought', await isoIn(page, -2));
  let rows = await readInventory(page);
  expectRow(rows, 'Spinach', '5 days');
  // Yogurt: set Use by to 10 days out, then move Bought back 4 days: still 10.
  await pop('yogurt'); await setField('.rf-pop-date', await isoIn(page, 10));
  await pop('yogurt'); await setField('.rf-pop-bought', await isoIn(page, -4));
  rows = await readInventory(page);
  console.log('after editing:', JSON.stringify(rows.map(r => r.name + ' ' + r.left)));
  expectRow(rows, 'Yogurt', '10 days');
  expectEqual('yogurt bought moved', await page.evaluate(id => today() - fridge.find(i => i.id === id).bought, ids.yogurt), 4);

  // Refused: Bought in the future; Bought after a Use by I set; Use by before Bought.
  await pop('spinach'); await setField('.rf-pop-bought', await isoIn(page, 2));
  await pop('yogurt'); await setField('.rf-pop-bought', await isoIn(page, 0));
  await pop('yogurt'); await setField('.rf-pop-date', await isoIn(page, 12));
  await pop('yogurt'); await setField('.rf-pop-bought', await isoIn(page, 0));   // fine: today, before use by
  await pop('yogurt'); await setField('.rf-pop-date', await isoIn(page, -1));    // before bought: refused
  rows = await readInventory(page);
  console.log('after refused edits:', JSON.stringify(rows.map(r => r.name + ' ' + r.left)));
  expectRow(rows, 'Spinach', '5 days');
  expectRow(rows, 'Yogurt', '12 days');
  const limits = await page.evaluate(id => { rfShowPopover(id, document.querySelector(`[data-rf-item="${id}"]`));
    return [document.querySelector('.rf-pop-bought').max, document.querySelector('.rf-pop-date').min, isoOfDay(today())]; }, ids.spinach);
  expectEqual('Bought max is today', limits[0], limits[2]);
  // A future-dated Bought set directly is refused too, not only by the picker.
  await page.evaluate(([id, iso]) => setBought(id, iso), [ids.yogurt, await isoIn(page, 30)]);
  expectEqual('yogurt still bought today', await page.evaluate(id => today() - fridge.find(i => i.id === id).bought, ids.yogurt), 0);

  // Corrections only: no waste, no restock count.
  const after = await page.evaluate(() => ({ ledger: {...ledger}, standing: JSON.parse(JSON.stringify(standing)) }));
  expectEqual('ledger untouched', after.ledger, before.ledger);
  expectEqual('restock counts untouched', Object.fromEntries(Object.entries(after.standing).map(([k, v]) => [k, v.count])),
    Object.fromEntries(Object.entries(before.standing).map(([k, v]) => [k, v.count])));

  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// The line-art row starts closed under "All items (N)" on every load and
// opens from the keyboard; while closed, the popover acts on items and the
// crisper's Toss all still works.
async function allItemsScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- ALL ITEMS: the row starts closed, opens from the keyboard ---');
  await typeEntry(page, 'spinach 10d, chicken breast, salmon');
  if (await previewOpen(page)) await answerPreview(page);
  await page.waitForTimeout(900);
  const state = async () => page.evaluate(() => ({ open: document.getElementById('allItems').open,
    summary: document.querySelector('#allItems summary').textContent.trim() }));
  expectEqual('closed on load', await state(), { open: false, summary: 'All items (3)' });
  if (await page.isVisible('[data-fridge-used]')) throw new Error('row buttons should be hidden while closed');
  // acting while closed: the popover's Used, then the crisper's Toss all
  const salmon = await page.evaluate(() => fridge.find(i => i.key === 'salmon').id);
  await page.$eval(`[data-rf-item="${salmon}"]`, el => { el.scrollIntoView({block: 'center'}); el.click(); });
  await page.click('#rfPopover .rf-pop-used');
  await page.click('#rfTossAll'); await page.click('#rfTossYes');
  await page.waitForTimeout(100);
  expectEqual('popover and Toss all work while closed', await page.evaluate(() => fridge.map(i => i.key)), ['chicken']);
  expectEqual('count follows', (await state()).summary, 'All items (1)');
  // keyboard: focus the toggle, Enter opens, the row is drawn
  await page.focus('#allItems summary');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  expectEqual('opens from the keyboard', (await state()).open, true);
  if (!(await page.isVisible('[data-fridge-used]'))) throw new Error('Used should show once open');
  const w = await page.$eval('#fridgeShelf .fridge-item', el => el.getBoundingClientRect().width);
  if (!(w > 20)) throw new Error('the row should be laid out when opened, got width ' + w);
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  expectEqual('closes from the keyboard', (await state()).open, false);
  await page.$eval('#allItems', d => { d.open = true; });
  await page.reload(); await page.waitForSelector('#headline');
  expectEqual('closed again after reload', (await state()).open, false);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// A projected day's headline names what turns that day; an item already
// past date today (the fixture's spinach) is left out.
async function projectionHeadlineScenario(browser) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('\n--- PROJECTIONS: Tomorrow names what turns tomorrow ---');
  await seedMixed18(page);
  await page.waitForSelector('#headline');
  const facts = await page.$$eval('#tomorrow .daily-fact, #dayAfter .daily-fact', els => els.map(e => e.textContent.trim()));
  console.log('facts:', JSON.stringify(facts));
  if (!facts.length) throw new Error('the fixture should show a Tomorrow card');
  if (facts.some(f => /spinach/i.test(f))) throw new Error('a projection names spinach, already past date today: ' + JSON.stringify(facts));
  // from Tomorrow's own projected fridge: tonight's dish may use some up
  const expected = await page.evaluate(() => {
    const t = today() + 1, start = buildDayProjections()[1].fridgeAtStart;
    return start.filter(it => left(it) >= 0 && !it.ripening && leftAt(it, t) === 0).map(it => food(it).en);
  });
  console.log('turning tomorrow:', JSON.stringify(expected));
  if (!expected.length) throw new Error('the fixture should have something whose last day is tomorrow');
  for (const n of expected) if (!facts[0].toLowerCase().includes(n.toLowerCase())) throw new Error(`Tomorrow should name ${n}: ${facts[0]}`);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// The phone's real data: saved by the version live on origin/main at
// 5243994 (pinned -- origin/main moves when this branch is pushed). Drives
// that version to build a realistic state: FOODS entries since split,
// renamed or removed (cheese, lettuce, carrots, "Onion, cut"), milk and
// avocados from before they asked for a date (avocados were a custom item
// then), another custom item, past-date items, a toss and a Used in the
// ledger, and restock entries (one tapped twice). Then loads that exact
// blob into the current code: nothing lost, nothing counted as waste, every
// item drawn in both views, and every item's days left exactly what the
// old version said -- matched by record id, not by name.
const PHONE_COMMIT = '5243994';
async function phoneDataScenario(browser) {
  console.log(`\n--- PHONE DATA: ${PHONE_COMMIT} saved state into current code ---`);
  const oldHtml = execSync(`git show ${PHONE_COMMIT}:index.html`, { cwd: ROOT, maxBuffer: 1024 * 1024 * 20 });
  const PORT_OLD = 8971;
  const oldServer = await new Promise(resolve => {
    const srv = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); res.end(oldHtml); });
    srv.listen(PORT_OLD, () => resolve(srv));
  });
  const old = await (await browser.newContext()).newPage();
  const oldErrors = [];
  old.on('pageerror', e => oldErrors.push(e.message));
  await old.goto(`http://localhost:${PORT_OLD}/`, { waitUntil: 'domcontentloaded' });
  await old.evaluate(() => localStorage.clear());
  await old.reload({ waitUntil: 'domcontentloaded' });
  await old.waitForSelector('#headline');
  await old.fill('#entry', 'cheese 10d, lettuce 3d, carrot 20d, onion 4d, milk 3d, avocados 2d, dragonfruit, ' +
    'spinach 9d, chicken 4d, tomato 1d, eggs, yogurt 20d, mushroom 2d');
  await old.click('#addbtn');
  await old.waitForTimeout(200);
  // restock milk from its chip (count 2), toss the yogurt, cook tonight's dish
  await old.evaluate(() => { const b = [...document.querySelectorAll('#restock button')].find(x => x.textContent.trim() === 'Milk'); if (b) b.click(); });
  await old.waitForTimeout(100);
  await old.evaluate(() => { const id = fridge.find(i => i.key === 'yogurt').id; document.querySelector(`[data-toss="${id}"]`).click(); });
  await old.waitForTimeout(100);
  // Used on the tomato (the "rescued" ledger); cooking would use up the
  // very items this check is about
  await old.evaluate(() => { const id = fridge.find(i => i.key === 'tomato').id; document.querySelector(`[data-used="${id}"]`).click(); });
  await old.waitForTimeout(100);
  const blob = await old.evaluate(() => localStorage.getItem('perishable.v1'));
  const before = await old.evaluate(() => ({
    left: Object.fromEntries(fridge.map(it => [it.id, left(it)])),
    keys: Object.fromEntries(fridge.map(it => [it.id, it.key])),
    ledger: {...ledger}, standingTotal: Object.values(standing).reduce((a, s) => a + s.count, 0),
    standingKeys: Object.keys(standing)
  }));
  if (oldErrors.length) throw new Error(`${PHONE_COMMIT} threw while building state: ${JSON.stringify(oldErrors)}`);
  await old.context().close();
  oldServer.close();
  const saved = JSON.parse(blob);
  const ids = Object.keys(before.left).map(Number);
  console.log(`${PHONE_COMMIT}: ${ids.length} items`, JSON.stringify(Object.values(before.keys)), 'ledger', JSON.stringify(before.ledger));
  for (const k of ['cheese', 'lettuce', 'carrot', 'onion', 'milk', '_c_avocados', '_c_dragonfruit'])
    if (!Object.values(before.keys).includes(k)) throw new Error(`the old state should hold a ${k} item`);
  if (!ids.some(id => before.left[id] < 0)) throw new Error('the old state should hold past-date items');
  if (!(before.ledger.wasteG > 0 && before.ledger.savedG > 0)) throw new Error('the old state should have a toss and a Used in the ledger');

  // Load that exact blob into the current code, at phone width.
  const page = await (await browser.newContext({ viewport: { width: 390, height: 1400 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(b => { localStorage.clear(); localStorage.setItem('perishable.v1', b); }, blob);
  await page.reload();
  await page.waitForSelector('#headline');
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => ({
    left: Object.fromEntries(fridge.map(it => [it.id, left(it)])),
    names: Object.fromEntries(fridge.map(it => [it.id, food(it).en])),
    ledger: {...ledger}, standingTotal: Object.values(standing).reduce((a, s) => a + s.count, 0),
    standingLabels: Object.keys(standing).map(k => labelOf(k)),
    // the fridge's shelves or, for what's kept out of the fridge, the kitchen's bowl
    drawn: [...document.querySelectorAll('#rfUnit [data-rf-item], #kcBowlItems [data-rf-item]')].map(b => +b.dataset.rfItem).sort((a, b) => a - b)
  }));
  console.log('current:', JSON.stringify(after.names));
  expectEqual('every record kept (ids)', Object.keys(after.left).map(Number).sort((a, b) => a - b), ids.sort((a, b) => a - b));
  for (const id of ids) expectEqual(`#${id} ${before.keys[id]} -> ${after.names[id]} days left`, after.left[id], before.left[id]);
  expectEqual('ledger unchanged (nothing counted as waste)', after.ledger, before.ledger);
  expectEqual('restock counts kept', after.standingTotal, before.standingTotal);
  if (after.standingLabels.some(l => !l)) throw new Error('a restock entry lost its name');
  expectEqual('every item drawn in the fridge or the bowl', after.drawn, ids);
  // every item shows in the row too, with the old days left
  await openRow(page);
  const row = await page.$$eval('#allItems [data-fridge-item]', bs => bs.map(b => {
    const days = b.closest('.fridge-item').querySelector('.fridge-days').textContent.trim();
    const m = days.match(/^(\d+)d( gone)?$/);
    return [+b.dataset.fridgeItem, days === 'today' ? 0 : m ? (m[2] ? -m[1] : +m[1]) : days];
  }));
  expectEqual('every item in the row', row.map(r => r[0]).sort((a, b) => a - b), ids);
  for (const [id, d] of row) expectEqual(`#${id} row shows`, d, before.left[id]);
  // a reload changes nothing (migration runs once)
  await page.reload(); await page.waitForSelector('#headline');
  expectEqual('stable across a reload', await page.evaluate(() => Object.fromEntries(fridge.map(it => [it.id, left(it)]))), after.left);
  expectEqual('ledger still unchanged', await page.evaluate(() => ({...ledger})), before.ledger);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.screenshot({ path: path.join(OUT, 'phone-data.png'), fullPage: true });
  await page.context().close();
}

// The popover carries what the list used to: Est. weight, and a quiet
// Remove for an item logged by mistake -- out of the fridge, no waste, its
// restock count undone. Days are "1 day", never "1 days", anywhere.
async function popoverDetailsScenario(browser) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('\n--- POPOVER: Est. weight, Remove, 1 day ---');
  await seedMixed18(page);
  await page.waitForSelector('#headline');
  await page.waitForTimeout(900);
  const chips = await page.evaluate(() => fridge.find(i => i.key === '_c_potatochips').id);
  await page.$eval(`[data-rf-item="${chips}"]`, el => { el.scrollIntoView({block: 'center'}); el.click(); });
  const row = await page.$eval('#rfPopover .rf-pop-weight', w => [w.previousElementSibling.textContent, w.textContent]);
  expectEqual('Est. weight (estimated: ≈)', row, ['Est. weight', '≈450 g']);
  const before = await page.evaluate(() => ({ ledger: {...ledger}, n: fridge.length, count: standing._c_potatochips.count }));
  await page.click('#rfPopover .rf-pop-remove');
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => ({ ledger: {...ledger}, n: fridge.length, chips: fridge.some(i => i.key === '_c_potatochips'), standing: standing._c_potatochips || null }));
  expectEqual('Remove takes it out', [after.n, after.chips], [before.n - 1, false]);
  expectEqual('Remove is not waste', after.ledger, before.ledger);
  expectEqual('restock count undone', after.standing, null);
  // Undo brings back the same record and the restock entry
  const toastText = await page.textContent('#toast');
  if (!/^Removed Potato chips/.test(toastText) || !/Undo/.test(toastText)) throw new Error('Remove toast: ' + toastText);
  await page.click('#toast .toast-undo');
  await page.waitForTimeout(100);
  const undone = await page.evaluate(() => ({ ledger: {...ledger}, n: fridge.length, chips: fridge.some(i => i.key === '_c_potatochips'),
    count: standing._c_potatochips && standing._c_potatochips.count }));
  expectEqual('Undo restores the item and the restock entry', [undone.n, undone.chips, undone.count], [before.n, true, before.count]);
  expectEqual('ledger still untouched', undone.ledger, before.ledger);
  // salmon: FOODS weight, no "≈"; and one day left reads "1 day" in the row
  const salmon = await page.evaluate(() => fridge.find(i => i.key === 'salmon').id);
  await page.$eval(`[data-rf-item="${salmon}"]`, el => { el.scrollIntoView({block: 'center'}); el.click(); });
  const w = await page.textContent('#rfPopover .rf-pop-weight');
  if (!/^\d+ g$/.test(w.trim())) throw new Error('salmon weight: ' + w);
  const inv = await readInventory(page);
  if (!inv.some(r => r.left === '1 day')) throw new Error('the fixture has items with 1 day left: ' + JSON.stringify(inv));
  const text = await page.evaluate(() => document.body.innerText);
  if (/\b1 days\b/i.test(text)) throw new Error('"1 days" on the page');
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Used and Tossed from the fridge's popover and from the line-art row run
// the same code (useItem): the same ledger change, item for item. Undo puts back the same record and
// takes the same amounts off the ledger.
async function popoverUseScenario(browser) {
  console.log('\n--- USED / TOSSED: popover and line-art row match; Undo restores ---');
  const run = async via => {
    const { page, errors } = await freshPage(browser);
    await typeEntry(page, 'spinach, chicken breast, salmon');
    await page.waitForTimeout(900);
    const ids = await page.evaluate(() => Object.fromEntries(fridge.map(i => [i.key, i.id])));
    const ledgers = [await page.evaluate(() => ({...ledger}))];
    for (const [key, tossed] of [['spinach', false], ['chicken', true]]) {
      if (via === 'list'){
        await openRow(page);
        await page.click(`[data-fridge-${tossed ? 'tossed' : 'used'}="${ids[key]}"]`);
      } else {
        await page.$eval(`[data-rf-item="${ids[key]}"]`, el => { el.scrollIntoView({block: 'center'}); el.click(); });
        await page.click(`#rfPopover .rf-pop-${tossed ? 'tossed' : 'used'}`);
        if (!(await page.$eval('#rfPopover', p => p.hidden))) throw new Error('the popover should close');
      }
      await page.waitForTimeout(100);
      ledgers.push(await page.evaluate(() => ({...ledger})));
    }
    const toastText = await page.textContent('#toast');
    const left = await page.evaluate(() => fridge.map(i => i.key));
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    return { page, ids, ledgers, toastText, left };
  };
  const list = await run('list'), pop = await run('popover');   // 'list' is the line-art row now
  console.log('row:', JSON.stringify(list.ledgers.slice(1)), ' popover:', JSON.stringify(pop.ledgers.slice(1)));
  expectEqual('same ledger after Used and Tossed', pop.ledgers, list.ledgers);
  if (!(pop.ledgers[1].savedG > 0 && pop.ledgers[2].wasteG > 0)) throw new Error('Used should count saved, Tossed waste');
  expectEqual('items gone from the fridge', pop.left, ['salmon']);
  if (!/Tossed Chicken breast/.test(pop.toastText) || !/Undo/.test(pop.toastText)) throw new Error('toast: ' + pop.toastText);
  if (/!|great|nice|well done/i.test(pop.toastText)) throw new Error('no celebration: ' + pop.toastText);

  // Undo the toss, then Used + Undo from the popover again.
  const page = pop.page;
  const before = await page.evaluate(id => JSON.stringify(fridge.find(i => i.id === id)), pop.ids.salmon);
  await page.click('#toast .toast-undo');
  await page.waitForTimeout(100);
  expectEqual('Undo restores the ledger', await page.evaluate(() => ({...ledger})), pop.ledgers[1]);
  expectEqual('Undo restores the item', await page.evaluate(() => fridge.map(i => i.key).sort()), ['chicken', 'salmon']);
  await page.$eval(`[data-rf-item="${pop.ids.salmon}"]`, el => { el.scrollIntoView({block: 'center'}); el.click(); });
  await page.click('#rfPopover .rf-pop-used');
  await page.waitForTimeout(100);
  if (!(await page.textContent('#toast')).startsWith('Used Salmon')) throw new Error('toast should say Used Salmon');
  await page.click('#toast .toast-undo');
  await page.waitForTimeout(100);
  expectEqual('Undo restores the same record', await page.evaluate(id => JSON.stringify(fridge.find(i => i.id === id)), pop.ids.salmon), before);
  expectEqual('ledger back to after the first Used', await page.evaluate(() => ({...ledger})), pop.ledgers[1]);
  expectEqual('drawn again', await page.$$eval(`[data-rf-item="${pop.ids.salmon}"]`, e => e.length), 1);
  // a second Undo does nothing
  await page.evaluate(() => document.querySelector('#toast .toast-undo') && document.querySelector('#toast .toast-undo').click());
  expectEqual('Undo once only', await page.evaluate(() => fridge.length), 2);
  await list.page.context().close(); await page.context().close();
}

// A gone item: Tossed is in its popover and counts as waste; the drawer
// front's Toss all asks right there ("Toss N past date? Toss N · Cancel").
async function goneTossScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- GONE: Tossed in the popover, Toss all on the drawer front ---');
  await typeEntry(page, 'spinach 10d, chicken 12d, tofu');
  if (await previewOpen(page)) await answerPreview(page);
  await page.waitForTimeout(900);
  expectEqual('drawer front', (await page.textContent('#rfCrisperLabel')).replace(/\s+/g, ' ').trim(), '2 past date · Toss all');
  const spinach = await page.evaluate(() => fridge.find(i => i.key === 'spinach').id);
  await page.$eval(`[data-rf-item="${spinach}"]`, el => { el.scrollIntoView({block: 'center'}); el.click(); });
  await page.click('#rfPopover .rf-pop-tossed');
  await page.waitForTimeout(100);
  const s = await page.evaluate(() => ({ n: fridge.length, waste: ledger.wasteG }));
  expectEqual('spinach tossed', s.n, 2);
  if (!(s.waste > 0)) throw new Error('a toss from the popover should count as waste');
  expectEqual('drawer front after', (await page.textContent('#rfCrisperLabel')).replace(/\s+/g, ' ').trim(), '1 past date · Toss all');
  const front = async () => (await page.textContent('#rfCrisperLabel')).replace(/\s+/g, ' ').trim();
  // Toss all asks on the drawer front; Cancel goes back, nothing tossed.
  await page.click('#rfTossAll');
  expectEqual('asks first', await front(), 'Toss 1 past date? Toss 1 · Cancel');
  expectEqual('nothing tossed while asking', await page.evaluate(() => [fridge.length, ledger.wasteG]), [2, s.waste]);
  await page.click('#rfTossNo');
  expectEqual('cancel', await front(), '1 past date · Toss all');
  expectEqual('nothing tossed on cancel', await page.evaluate(() => fridge.length), 2);
  await page.click('#rfTossAll');
  await page.click('#rfTossYes');
  await page.waitForTimeout(100);
  if (!(await page.evaluate(w => ledger.wasteG > w, s.waste))) throw new Error('Toss all should count as waste');
  expectEqual('after confirming', await page.evaluate(() => fridge.map(i => i.key)), ['tofu']);
  expectEqual('drawer front empty', (await page.textContent('#rfCrisperLabel')).trim(), 'Crisper — past date');
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// A date set by hand (list Edit mode or the popover) is stored on the
// item: changing the FOODS value and reloading leaves it alone, while an
// unedited item follows the new value.
async function editDateScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- EDIT DATES: a date I set survives a FOODS change ---');
  await typeEntry(page, 'spinach, yogurt, tofu');
  await page.waitForTimeout(900);
  // Spinach from the line-art row's drawing, yogurt from the illustrated fridge.
  await openRow(page);
  await page.$eval('[data-fridge-item="1"]', el => { el.scrollIntoView({block: 'center'}); el.click(); });
  await page.fill('#rfPopover .rf-pop-date', await isoIn(page, 10));
  await page.waitForTimeout(100);
  const id = await page.evaluate(() => fridge.find(i => i.key === 'yogurt').id);
  await page.$eval(`[data-rf-item="${id}"]`, el => el.click());
  await page.fill('#rfPopover .rf-pop-date', await isoIn(page, 3));
  await page.waitForTimeout(100);
  let rows = await readInventory(page);
  console.log('after editing:', JSON.stringify(rows.map(r => r.name + ' ' + r.left)));
  expectRow(rows, 'Spinach', '10 days');
  expectRow(rows, 'Yogurt', '3 days');
  expectRow(rows, 'Tofu', '7 days');

  // Reload with different FOODS values for all three.
  await page.route('**/index.html', async route => {
    const res = await route.fetch();
    const body = (await res.text())
      .replace(/(\n  spinach: +\{en:'Spinach',[^\n]*?shelf:)7,/, '$13,')
      .replace(/(\n  yogurt: +\{en:'Yogurt',[^\n]*?shelf:)14,/, '$130,')
      .replace(/(\n  tofu: +\{en:'Tofu',[^\n]*?shelf:)7,/, '$12,');
    await route.fulfill({ response: res, body });
  });
  await page.reload();
  await page.waitForSelector('#headline');
  expectEqual('FOODS values changed', await page.evaluate(() => [FOODS.spinach.shelf, FOODS.yogurt.shelf, FOODS.tofu.shelf]), [3, 30, 2]);
  rows = await readInventory(page);
  console.log('after FOODS change and reload:', JSON.stringify(rows.map(r => r.name + ' ' + r.left)));
  expectRow(rows, 'Spinach', '10 days');
  expectRow(rows, 'Yogurt', '3 days');
  expectRow(rows, 'Tofu', '2 days');
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Ripeness: "Ripe" starts the clock at purchase; "Not ripe yet" holds it
// (no countdown, no decay) until "It's ripe". The last choice per food is
// the next default, restock included. Pineapple counts from purchase.
async function ripenessScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- RIPENESS: Ripe / Not ripe yet / It\'s ripe ---');
  await typeEntry(page, 'bananas, pineapple');
  if (!(await previewOpen(page))) throw new Error('bananas should open the preview for the ripeness choice');
  // first time: the line asks, nothing chosen yet; Put away would count it ripe
  expectEqual('first time, the line asks', await page.evaluate(() => [document.querySelectorAll('#receiptLines .entry-ripe:checked').length,
    document.querySelector('#receiptLines .receipt-row .rl-days').textContent]), [0, 'ripe?']);
  expectEqual('pineapple asks nothing', await page.$$eval('#receiptLines .entry-ripe[data-idx="1"]', r => r.length), 0);
  if (await page.$eval('#addbtn', b => b.disabled)) throw new Error('a ripeness choice has a default; Add should be enabled');
  await page.check('#receiptLines .entry-ripe[data-idx="0"][value="unripe"]');
  await page.click('#addbtn');
  await page.waitForTimeout(100);
  let inv = await readInventory(page);
  console.log('after adding:', JSON.stringify(inv.map(r => r.name + ' ' + r.left)));
  expectRow(inv, 'Banana', 'ripening');
  expectRow(inv, 'Pineapple', '7 days');
  const later = await page.evaluate(() => { const b = fridge.find(i => i.key === 'banana'); return [leftAt(b, today() + 10), decayFraction(b, today() + 10)]; });
  expectEqual('ten days on, still no countdown or decay', later, [3, 0]);

  await typeEntry(page, 'bananas');
  expectEqual('remembered default', await page.$eval('#receiptLines .entry-ripe:checked', r => r.value), 'unripe');
  await takeOffReceipt(page);
  await page.click('[data-restock="banana"]');
  await page.click('#addbtn');
  await page.waitForTimeout(100);
  expectEqual('restock uses the remembered choice', await page.evaluate(() => fridge.find(i => i.key === 'banana').ripening), true);

  const banana = await page.evaluate(() => fridge.find(i => i.key === 'banana').id);
  await openRow(page);
  await page.$eval(`[data-fridge-item="${banana}"]`, el => { el.scrollIntoView({block: 'center'}); el.click(); });
  await page.click('#rfPopover .rf-pop-ripe');
  await page.waitForTimeout(100);
  inv = await readInventory(page);
  console.log('after It\'s ripe:', JSON.stringify(inv.map(r => r.name + ' ' + r.left)));
  expectRow(inv, 'Banana', '3 days');
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Drinks: beer asks for the printed date (no FoodKeeper entry); "wine"
// asks red or white, then opened or unopened, an opened bottle counting
// FoodKeeper's after-opening 3 days and an unopened red its pantry 5
// years; vodka keeps (#539, "Indefinitely"): no countdown, no decay, out
// of the headline, the decay line and the at-risk count, still in All
// items with Used and Tossed, and a toss still reaches the ledger.
// Placement follows the shelf-life column: refrigerated drinks (beer, an
// opened wine) in the door bins on desktop; room-temperature ones
// (spirits, unopened wine) upright on the counter behind the bowl, never
// in it. Every spirit name keeps under #539; cream liqueur is #540 and
// asks nothing; canned beer, hard cider and hard seltzer ask for the
// printed date. Guava (#262) counts from ripeness.
const FOODS_DRINK = new Set(['beer', 'cannedbeer', 'hardcider', 'hardseltzer', 'redwine', 'whitewine', 'creamliqueur', 'vodka', 'gin', 'rum', 'tequila', 'mezcal', 'baijiu', 'liquor', 'whiskey', 'bourbon', 'scotch', 'brandy', 'cognac']);
async function drinksScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- DRINKS: beer, wine, vodka; guava ---');
  await typeEntry(page, 'beer, wine, vodka, guava');
  let rows = await readReview(page, '#receiptLines');
  console.log(JSON.stringify(rows.map(r => [r.name, r.flag, r.match, r.options])));
  expectEqual('beer needs the printed date', rows[0].flag, 'needs date');
  expectEqual('wine asks which', rows[1].options, ['Red wine (FOODS)', 'White wine (FOODS)']);
  if (!(await lineSource(page, 2)).includes('FoodKeeper #539')) throw new Error('vodka should match FOODS, FoodKeeper #539');
  if (rows[2].as || /matched/.test(rows[2].details)) throw new Error('vodka typed as its own name: nothing after it: ' + JSON.stringify(rows[2]));
  if (!(await lineSource(page, 3)).includes('FoodKeeper #262') || !rows[3].match.includes('Not ripe yet')) throw new Error('guava should be #262 and ask ripeness: ' + rows[3].match);
  await page.fill('#receiptLines .entry-date[data-idx="0"]', await isoIn(page, 120));
  await page.dispatchEvent('#receiptLines .entry-date[data-idx="0"]', 'change');
  await page.selectOption('#receiptLines .entry-pick[data-idx="1"]', 'redwine');
  await page.waitForTimeout(80);
  rows = await readReview(page, '#receiptLines');
  if (!rows[1].match.includes('opened or unopened?')) throw new Error('red wine should ask opened or unopened: ' + rows[1].match);
  // first time: asked, unanswered; Put away counts it unopened
  expectEqual('opened? asked, nothing chosen', await page.evaluate(() => [document.querySelectorAll('#receiptLines .entry-open[data-idx="1"]:checked').length,
    document.querySelectorAll('#receiptLines .rl-days')[1].textContent]), [0, 'opened?']);
  await page.click('#addbtn');
  await page.waitForTimeout(100);
  await typeEntry(page, 'white wine');
  await page.check('#receiptLines .entry-open[data-idx="0"][value="opened"]');
  await page.click('#addbtn');
  await page.waitForTimeout(100);

  let inv = await readInventory(page);
  console.log('inventory:', JSON.stringify(inv.map(r => r.name + ' ' + r.left)));
  expectRow(inv, 'Beer', '120 days');
  expectRow(inv, 'Red wine', '1825 days');
  expectRow(inv, 'White wine', '3 days');
  expectRow(inv, 'Vodka', 'keeps');
  expectRow(inv, 'Guava', '4 days');
  const st = await page.evaluate(() => {
    const v = fridge.find(i => i.key === 'vodka');
    return {
      vodkaLater: [leftAt(v, today() + 4000), decayFraction(v, today() + 4000)],
      whiteOpened: !!fridge.find(i => i.key === 'whitewine').opened,
      headline: document.getElementById('headline').textContent,
      dots: document.querySelectorAll('#chart .dot').length,
      atRisk: rfAtRiskCount(today()),
      vodkaLabel: getComputedStyle([...document.querySelectorAll('#fridgeShelf .fridge-label')].find(l => l.textContent.startsWith('Vodka'))).color,
      remembered: standing.whitewine.open,
    };
  });
  console.log(JSON.stringify(st));
  expectEqual('vodka: no countdown, no decay', st.vodkaLater, [null, 0]); // Infinity serializes as null
  expectEqual('the opened white is opened', st.whiteOpened, true);
  expectEqual('remembered choice', st.remembered, 'opened');
  expectEqual('decay line leaves vodka out', st.dots, 4);
  expectEqual('headline counts the opened white, not vodka', st.headline, '1 thing becomes waste within 72 hours.');
  expectEqual('at-risk count: the white and the guava', st.atRisk, 2);
  expectEqual('vodka\'s label is plain ink, no urgency colour', st.vodkaLabel, 'rgb(92, 102, 100)');

  // In the door bins on desktop.
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.waitForTimeout(300);
  const placed = await page.evaluate(() => {
    const keysIn = sel => [...document.querySelectorAll(sel)].map(b => fridge.find(i => i.id === +(b.dataset.rfItem)).key).sort();
    return {
      bins: keysIn('[id^="rfDoorBin"] [data-rf-item]'),
      counter: keysIn('#kcCounterBack [data-rf-item]'),
      bowl: keysIn('#kcBowlItems [data-rf-item], #kcBowlBack [data-rf-item]'),
    };
  });
  console.log('placed:', JSON.stringify(placed));
  expectEqual('door bins: beer (the opened white is on the eye-level shelf: urgency wins)', placed.bins, ['beer']);
  expectEqual('room-temperature drinks stand on the counter', placed.counter, ['redwine', 'vodka']);
  expectEqual('no drink in the bowl', placed.bowl.filter(k => FOODS_DRINK.has(k)), []);

  // Vodka in All items: Tossed reaches the ledger like anything else.
  const before = await page.evaluate(() => ledger.wasteG);
  const vid = await page.evaluate(() => fridge.find(i => i.key === 'vodka').id);
  await openRow(page);
  await page.$eval(`[data-fridge-tossed="${vid}"]`, b => b.click());
  await page.waitForTimeout(100);
  expectEqual('tossed vodka is waste', await page.evaluate(b => ledger.wasteG - b, before), 750);

  // The rest of the drinks: what each name matches, and what it asks.
  await typeEntry(page, 'whisky, bourbon, scotch, rum, gin, tequila, mezcal, brandy, cognac, baijiu, liquor, spirits, cream liqueur, canned beer, hard cider, hard seltzer');
  rows = await readReview(page, '#receiptLines');
  const sources = await page.evaluate(() => pendingItems.map(e => e.key ? sourceOf(e.key) : ''));
  const got = rows.map((r, i) => [r.as || r.name, r.flag, (sources[i].match(/FoodKeeper #\d+/) || ['none'])[0]]);
  console.log(JSON.stringify(got));
  const keepsNames = ['Whiskey', 'Bourbon', 'Scotch', 'Rum', 'Gin', 'Tequila', 'Mezcal', 'Brandy', 'Cognac', 'Baijiu', 'Liquor', 'Liquor'];
  expectEqual('spirits: #539, nothing asked', got.slice(0, 12), keepsNames.map(n => [n, '', 'FoodKeeper #539']));
  expectEqual('cream liqueur: #540, nothing asked', got[12], ['Cream liqueur', '', 'FoodKeeper #540']);
  expectEqual('cans and cider: the printed date', got.slice(13).map(r => r[1]), ['needs date', 'needs date', 'needs date']);
  const asks = await page.$$eval('#receiptLines .entry-open', r => r.length);
  expectEqual('no opened question for any of these', asks, 0);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Condiments, from FoodKeeper under the rule. Each typed name matches its
// own FoodKeeper entry; "Opened or unopened?" is asked only where
// FoodKeeper gives an after-opening figure (hot sauce #559, relish #500
// and butter #1 have none). Unopened counts the pantry figure (or, for
// horseradish and pesto, the refrigerator one), opened the after-opening
// figure, both from purchase. They live in the door bins on desktop.
async function condimentsScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- CONDIMENTS: door bins, opened or unopened ---');
  const names = ['ketchup', 'mayo', 'mustard', 'soy sauce', 'oyster sauce', 'hot sauce', 'sriracha', 'salad dressing',
    'jam', 'jelly', 'butter', 'bbq sauce', 'hoisin', 'horseradish', 'pickles', 'relish', 'pesto', 'tahini', 'ranch', 'vinaigrette', 'teriyaki', 'jarred salsa'];
  await typeEntry(page, names.join(', '));
  const rows = await readReview(page, '#receiptLines');
  const got = await page.evaluate(() => pendingItems.map(e => [e.key, foodOf(e.key).fk, opensKey(e.key)]));
  console.log(JSON.stringify(got));
  expectEqual('FoodKeeper ids', got.map(g => g[1]),
    [348, 350, 351, 360, 434, 559, 559, 356, 347, 347, 1, 340, 435, 346, 353, 500, 354, 416, 623, 625, 360, 357]);
  const noAsk = ['hot sauce', 'sriracha', 'butter', 'relish'];
  names.forEach((n, i) => {
    const asks = rows[i].match.includes('opened or unopened?');
    if (asks === noAsk.includes(n)) throw new Error(n + (asks ? ' should not ask opened' : ' should ask opened') + ': ' + rows[i].match);
    if (rows[i].flag) throw new Error(n + ' should need no date: ' + rows[i].flag);
  });
  // opened: ketchup, mayo, soy sauce, pesto
  for (const i of [0, 1, 3, 16]) {
    await page.check(`#receiptLines .entry-open[data-idx="${i}"][value="opened"]`);
    await page.waitForTimeout(40);
  }
  await page.click('#addbtn');
  await page.waitForTimeout(200);
  const recs = await page.evaluate(() => fridge.map(i => [i.key, !!i.opened, left(i), fridgeShapeOf(i)]));
  console.log(JSON.stringify(recs));
  const days = Object.fromEntries(recs.map(r => [r[0] + (r[1] ? '+' : ''), r[2]]));
  expectEqual('days', [days['ketchup+'], days['mayonnaise+'], days.mustard, days['soysauce+'], days.oystersauce, days.hotsauce,
    days.saladdressing, days.jam, days.butter, days.bbqsauce, days.hoisin, days.horseradish, days.pickles, days.relish, days['pesto+'],
    days.tahini, days.creamydressing, days.vinaigrette, days.teriyaki, days.jarredsalsa],
    [180, 60, 730, 30, 720, 180, 360, 540, 60, 365, 720, 360, 365, 270, 3, 365, 180, 180, 1095, 365]);
  expectEqual('opened ketchup drawn opened, unopened mustard not', [recs[0][3], recs[2][3]], ['ketchupOpen', 'mustard']);
  const src = await page.evaluate(() => [shelfSourceOf(fridge.find(i => i.key === 'mustard')), shelfSourceOf(fridge.find(i => i.key === 'ketchup')),
    shelfSourceOf(fridge.find(i => i.key === 'horseradish'))]);
  expectEqual('sources', src, ['unopened: FoodKeeper #351, 730 days (its pantry figure; none given for the refrigerator unopened)',
    'opened: FoodKeeper #348, 180 days after opening', 'FoodKeeper #346']);
  // In the door bins on desktop (pesto, opened, 3 days, is at eye level: urgency wins), all of them drawn.
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.waitForTimeout(300);
  const placed = await page.evaluate(() => ({
    bins: [...document.querySelectorAll('[id^="rfDoorBin"] [data-rf-item]')].map(b => fridge.find(i => i.id === +b.dataset.rfItem).key),
    eye: [...document.querySelectorAll('#rfShelfEye [data-rf-item]')].map(b => fridge.find(i => i.id === +b.dataset.rfItem).key),
    upper: document.querySelectorAll('#rfShelfUpper [data-rf-item]').length, nan: document.getElementById('rfUnit').innerHTML.includes('NaN')}));
  console.log(JSON.stringify(placed));
  expectEqual('every other condiment in the door bins, none dropped', placed.bins.length, recs.length - 1);
  expectEqual('opened pesto at eye level', placed.eye, ['pesto']);
  expectEqual('nothing on the upper shelf, no NaN', [placed.upper, placed.nan], [0, false]);
  await page.$eval('#rfUnit', u => u.classList.add('open'));
  await page.waitForTimeout(300);
  await page.locator('#panelFridge').screenshot({ path: path.join(OUT, 'condiments-door-bins.png') });
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Frozen food bought frozen goes straight into the freezer on its
// FoodKeeper freezer value, nothing asked: ice cream #317 (180 days),
// frozen vegetables #331 (540), frozen berries #315 (540), ice pops #318
// (270, typed "popsicles"), frozen pizza #571 (360), and frozen dumplings
// under #330 Frozen entrees (prepared meals), 360 -- potstickers, gyoza,
// wontons and bao too.
async function frozenFoodsScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- FROZEN FOODS: straight into the freezer ---');
  const aliases = await page.evaluate(() => ['dumplings', 'potstickers', 'pot stickers', 'gyoza', 'wontons', 'bao', 'bao buns'].map(n => entryFor(n, 0).key));
  expectEqual('dumpling names', aliases, Array(7).fill('frozendumplings'));
  await typeEntry(page, 'ice cream, frozen vegetables, frozen berries, popsicles, frozen pizza, frozen dumplings');
  if (await previewOpen(page)) {
    const rows = await readReview(page, '#receiptLines');
    throw new Error('nothing should be asked: ' + JSON.stringify(rows.map(r => [r.name, r.as, r.flag])));
  }
  const recs = await page.evaluate(() => fridge.map(i => [i.key, foodOf(i.key).fk, !!i.frozen, shelfOf(i), fridgeShapeOf(i)]));
  console.log(JSON.stringify(recs));
  expectEqual('records', recs, [['icecream', 317, true, 180, 'icecream'], ['frozenveg', 331, true, 540, 'vegbag'],
    ['frozenberries', 315, true, 540, 'berrybag'], ['icepops', 318, true, 270, 'popbox'], ['frozenpizza', 571, true, 360, 'pizzabox'],
    ['frozendumplings', 330, true, 360, 'dumplingbag']]);
  const st = await page.evaluate(() => ({inFz: document.querySelectorAll('#rfFzShelf [data-rf-item]').length, count: document.getElementById('rfFzCount').textContent,
    counted: counted(fridge).length, nan: document.getElementById('rfFzShelf').innerHTML.includes('NaN')}));
  expectEqual('all six in the freezer, out of every count', [st.inFz, st.count, st.counted, st.nan], [6, '6 inside', 0, false]);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.$eval('#rfUnit', u => u.classList.add('fz-open'));
  await page.waitForTimeout(400);
  await page.locator('#panelFridge').screenshot({ path: path.join(OUT, 'frozen-foods-freezer.png') });
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Leftovers. After Cook this the board asks "Any leftovers?"; Yes puts a
// container named for the dish in the fridge on FoodKeeper's leftovers
// value (#173 with egg: 4 days), and it behaves like any item: it decays,
// freezes (#173: 90 days), and Used and Tossed reach the ledger. Undo
// takes it out and asks again; No drops the question. Typed, "leftovers"
// and "takeout" ask which entry, keep their word as the name, and never
// become a usual.
async function leftoversScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- LEFTOVERS: Any leftovers? ---');
  await page.evaluate(() => {
    const t = today();
    fridge = [{id: ++uid, key: 'tomato', bought: t - 5, custom: null}, {id: ++uid, key: 'egg', bought: t - 30, custom: null},
      {id: ++uid, key: 'scallion', bought: t - 5, custom: null}];
    render(); showRoom(1);
  });
  await page.waitForTimeout(300);
  const dish = (await page.textContent('#tonight h2')).trim();
  expectEqual('tonight', dish, 'Tomato egg stir-fry');
  if (await page.$('#leftoversAsk')) throw new Error('no question before cooking');
  await page.click('#tonight .js-cook');
  await page.waitForTimeout(150);
  expectEqual('asked', (await page.textContent('#leftoversAsk p')).trim(), 'Tomato egg stir-fry cooked. Any leftovers?');
  await page.click('#tonight .js-leftovers-yes');
  await page.waitForTimeout(150);
  let st = await page.evaluate(() => fridge.map(i => [i.key, food(i).en, foodOf(i.key).fk, left(i), fridgeShapeOf(i), shelfSourceOf(i)]));
  console.log(JSON.stringify(st));
  expectEqual('one container, named for the dish, #173, 4 days', st, [['leftovers', 'Tomato egg stir-fry', 173, 4, 'leftovers', 'FoodKeeper #173']]);
  expectEqual('question gone, not a usual', [!!(await page.$('#leftoversAsk')), await page.evaluate(() => Object.keys(standing).length)], [false, 0]);
  const svg = await page.evaluate(() => document.querySelector(`[data-rf-item="${fridge[0].id}"]`).innerHTML);
  if (!svg.includes('Tomato egg')) throw new Error('the tape should carry the dish name');
  // Undo: out again, asked again
  await page.click('#toast button');
  await page.waitForTimeout(150);
  expectEqual('undo', [await page.evaluate(() => fridge.length), !!(await page.$('#leftoversAsk'))], [0, true]);
  await page.click('#tonight .js-leftovers-yes');
  await page.waitForTimeout(150);
  await page.evaluate(() => showRoom(0));
  await page.waitForTimeout(300);
  await page.locator('#panelFridge').screenshot({ path: path.join(OUT, 'leftovers-fridge.png') });
  // decays like any item: on its last day, at the last-day level
  const later = await page.evaluate(() => { const it = fridge[0]; return [leftAt(it, today() + 4), decayFraction(it, today() + 4), leftAt(it, today() + 5) < 0]; });
  expectEqual('decay', later, [0, 0.75, true]);
  // Freeze from the popover: #173's freezer value
  const id = await page.evaluate(() => fridge[0].id);
  await openPopover(page, id);
  await page.click('#rfPopover .rf-pop-freeze');
  await page.waitForTimeout(150);
  expectEqual('frozen on #173', await page.evaluate(() => [!!fridge[0].frozen, shelfOf(fridge[0])]), [true, 90]);
  // Tossed: waste, like anything
  const before = await page.evaluate(() => ledger.wasteG);
  await openPopover(page, id);
  await page.click('#rfPopover .rf-pop-tossed');
  await page.waitForTimeout(150);
  expectEqual('tossed is waste', await page.evaluate(b => [ledger.wasteG - b, fridge.length], before), [400, 0]);

  // No: nothing added, the question goes
  await page.evaluate(() => {
    const t = today();
    fridge = [{id: ++uid, key: 'tomato', bought: t - 5, custom: null}, {id: ++uid, key: 'egg', bought: t - 30, custom: null},
      {id: ++uid, key: 'scallion', bought: t - 5, custom: null}];
    render(); showRoom(1);
  });
  await page.waitForTimeout(200);
  await page.click('#tonight .js-cook');
  await page.waitForTimeout(100);
  await page.click('#tonight .js-leftovers-no');
  await page.waitForTimeout(100);
  expectEqual('no', [await page.evaluate(() => fridge.length), !!(await page.$('#leftoversAsk'))], [0, false]);
  // a dish without meat, fish, poultry or egg: #174
  expectEqual('which entry', await page.evaluate(() => [leftoversOf(['tomato', 'egg']), leftoversOf(['spinach', 'tofu']), leftoversOf(['chicken'])]),
    ['leftovers', 'leftoversveg', 'leftovers']);

  // Typed
  await page.evaluate(() => showRoom(0));
  await typeEntry(page, 'leftovers, takeout');
  let rows = await readReview(page, '#receiptLines');
  expectEqual('typed asks which', rows.map(r => r.options), [['Leftovers with meat or egg (FOODS)', 'Leftovers without meat or egg (FOODS)'],
    ['Leftovers with meat or egg (FOODS)', 'Leftovers without meat or egg (FOODS)']]);
  await page.selectOption('#receiptLines .entry-pick[data-idx="0"]', 'leftovers');
  await page.waitForTimeout(40);
  await page.selectOption('#receiptLines .entry-pick[data-idx="1"]', 'leftoversveg');
  await page.waitForTimeout(40);
  await page.click('#addbtn');
  await page.waitForTimeout(200);
  st = await page.evaluate(() => fridge.map(i => [food(i).en, foodOf(i.key).fk, left(i), shelfOf({key: i.key, frozen: true})]));
  expectEqual('typed records keep their word', st, [['Leftovers', 173, 4, 90], ['Takeout', 174, 4, 60]]);
  expectEqual('never a usual', await page.evaluate(() => Object.keys(standing)), []);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Sparkling wine, rosé, vermouth, sake, soju: no FoodKeeper entry. The
// first three are estimated from Iowa State Extension's opened figures
// (3, 7, 28 days) and ask "Opened or unopened?"; unopened, the printed
// date governs. Sake and soju have no credible source: printed date only.
async function moreDrinksScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- MORE DRINKS: sparkling, rosé, vermouth, sake, soju ---');
  await typeEntry(page, 'champagne, prosecco, cava, rosé, rose wine, sweet vermouth, sake, soju');
  let rows = await readReview(page, '#receiptLines');
  console.log(JSON.stringify(rows.map(r => [r.name, r.flag, r.match])));
  expectEqual('names', rows.map(r => r.as || r.name), ['Sparkling wine', 'Sparkling wine', 'Sparkling wine', 'Rosé', 'Rosé', 'Vermouth', 'Sake', 'Soju']);
  rows.forEach(r => { if (r.flag !== 'needs date') throw new Error(r.name + ' unopened should need the printed date: ' + JSON.stringify(r)); });
  for (let i = 0; i < 6; i++) if (!(await lineSource(page, i)).includes('estimated')) throw new Error(rows[i].name + ' should be estimated');
  // "matched" only where the match isn't the name as typed: champagne -> Sparkling wine, yes; rosé -> Rosé, no
  // the match shows inline only where it isn't the name as typed
  expectEqual('typed → matched, only when they differ', rows.map(r => r.as ? r.name + ' → ' + r.as : r.name),
    ['Champagne → Sparkling wine', 'Prosecco → Sparkling wine', 'Cava → Sparkling wine', 'Rosé', 'Rose wine → Rosé', 'Sweet vermouth → Vermouth', 'Sake', 'Soju']);
  rows.forEach(r => { if (/matched|estimated|needs the date/.test(r.details)) throw new Error('no source, estimate or sentence on a receipt line: ' + r.details); });
  rows.slice(0, 6).forEach(r => {
    if (!r.match.includes('opened or unopened?')) throw new Error(r.name + ' should ask opened: ' + r.match);
  });
  rows.slice(6).forEach(r => {
    if (r.match.includes('opened or unopened?') || r.match.includes('FoodKeeper')) throw new Error(r.name + ' asks nothing but the date: ' + r.match);
  });
  // Opened: the date field goes away and the line can go in.
  for (const i of [0, 3, 5]) {
    await page.check(`#receiptLines .entry-open[data-idx="${i}"][value="opened"]`);
    await page.waitForTimeout(60);
  }
  rows = await readReview(page, '#receiptLines');
  expectEqual('opened lines need nothing', [0, 3, 5].map(i => rows[i].flag), ['', '', '']);
  for (const i of [1, 2, 4, 6, 7]) {
    await page.fill(`#receiptLines .entry-date[data-idx="${i}"]`, await isoIn(page, 200));
    await page.dispatchEvent(`#receiptLines .entry-date[data-idx="${i}"]`, 'change');
    await page.waitForTimeout(40);
  }
  await page.click('#addbtn');
  await page.waitForTimeout(150);
  const recs = await page.evaluate(() => fridge.map(i => [i.key, !!i.opened, Math.round(left(i)), fridgeShapeOf(i)]));
  console.log(JSON.stringify(recs));
  expectEqual('records', recs, [
    ['sparklingwine', true, 3, 'sparklingOpen'], ['sparklingwine', false, 200, 'sparkling'], ['sparklingwine', false, 200, 'sparkling'],
    ['rose', true, 7, 'roseOpen'], ['rose', false, 200, 'rose'], ['vermouth', true, 28, 'vermouthOpen'],
    ['sake', false, 200, 'sake'], ['soju', false, 200, 'smallgreen']]);
  const src = await popoverText(page, 'vermouth');
  if (!src.includes('opened: estimated, 28 days after opening') || !src.includes('Iowa State Extension')) throw new Error('vermouth popover source: ' + src);
  // Refrigerated either way: none stands on the counter.
  expectEqual('none on the counter', await page.evaluate(() => fridge.filter(drinkOnCounter).length), 0);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Bottle labels are blank and pale. A printed date on the day of purchase
// (shelf 0) once gave decayFraction 0/0 = NaN, so the label fill read
// "#NaNNaNNaN" and SVG painted it black. Every drink in FOODS, each form,
// at shelf 0 and at 0/50/100% of a 10-day date, drawn in the real fridge:
// no NaN anywhere in the markup, no black fill. A mask or clipPath is
// never painted (the Tonight outline's mask cuts out in black), so not
// counted.
async function drinkLabelScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- DRINK LABELS: never black ---');
  const res = await page.evaluate(() => {
    const d = today();
    const keys = Object.keys(FOODS).filter(k => FOODS[k].cat === 'drinks');
    const out = [];
    keys.forEach(k => [[0, 0], [10, 0], [10, 5], [10, 10]].forEach(([shelf, ago]) => {
      for (const opened of [false, true]) {
        if (opened && FOODS[k].opens == null) continue;
        fridge = [{id: uid++, key: k, bought: d - ago, shelf, shelfFrom: 'date', opened: opened || undefined}];
        render();
        const html = document.getElementById('rfUnit').innerHTML + document.getElementById('panelKitchen').innerHTML;
        const black = [...document.querySelectorAll('#rfUnit svg :is(rect, path, ellipse, circle, polygon), #panelKitchen svg :is(rect, path, ellipse, circle, polygon)')]
          .filter(e => e.closest('[data-rf-item]') && getComputedStyle(e).fill === 'rgb(0, 0, 0)' && !e.closest('clipPath, mask')).length;
        if (html.includes('NaN') || black) out.push([k, shelf, ago, opened, html.includes('NaN'), black]);
      }
    }));
    return {n: keys.length, bad: out};
  });
  console.log('drinks checked:', res.n, 'bad:', JSON.stringify(res.bad));
  if (res.n < 20) throw new Error('expected every drink in FOODS, got ' + res.n);
  if (res.bad.length) throw new Error('drink drawn with NaN or a black fill: ' + JSON.stringify(res.bad));
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

/* ---------- dragging between fridge and freezer ---------- */

// Touch through the browser's own input pipeline (CDP), so pointer
// events, the long-press, scrolling and the swipe area behave as on a
// phone -- not synthetic DOM events.
async function touchPage(browser, phone) {
  const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 1300 }, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#headline');
  const cdp = await ctx.newCDPSession(page);
  return { page, errors, cdp };
}
const touch = (cdp, type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
async function touchPath(page, cdp, from, to, { hold = 0, steps = 8, stepMs = 16 } = {}) {
  await touch(cdp, 'touchStart', from[0], from[1]);
  if (hold) await page.waitForTimeout(hold);
  for (let k = 1; k <= steps; k++) {
    await touch(cdp, 'touchMove', from[0] + (to[0] - from[0]) * k / steps, from[1] + (to[1] - from[1]) * k / steps);
    await page.waitForTimeout(stepMs);
  }
  await touch(cdp, 'touchEnd');
}
const centerOf = (page, sel) => page.$eval(sel, el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
// A point in the drawing's own coordinates (360 x 640), in the page.
const rfPoint = (page, x, y) => page.evaluate(([x, y]) => { const r = document.getElementById('rfUnit').getBoundingClientRect(); return [r.left + x / RF.W * r.width, r.top + y / RF.H * r.height]; }, [x, y]);
async function seedDrag(page) {
  const ids = await page.evaluate(() => {
    const t = today();
    fridge = [
      {id: ++uid, key: 'chicken', bought: t},                 // freezes: 270 days (FoodKeeper #117)
      {id: ++uid, key: 'leaflettuce', bought: t},             // FoodKeeper: freezing not recommended
      {id: ++uid, key: 'steak', bought: t - 9},               // past date
      {id: ++uid, key: 'chicken', bought: t - 1, frozen: true, clockFrom: t - 1},     // thaws: The Big Thaw, 2 days
      {id: ++uid, key: 'broccoli', bought: t - 3, frozen: true, clockFrom: t - 3},    // thaws only with a date
    ];
    render();
    return fridge.map(i => i.id);
  });
  await page.waitForTimeout(1600); // the door's opening on load
  return ids;
}
const recOf = (page, id) => page.evaluate(id => { const it = fridge.find(i => i.id === id); return it && {frozen: !!it.frozen, thawed: !!it.thawed, left: it.frozen ? null : left(it)}; }, id);
const toastText = page => page.$eval('#toast', t => t.classList.contains('on') ? t.textContent : '');

// Mouse: press and drag a fridge item onto the closed freezer. While it's
// held there the freezer gets a quiet outline and its door opens a little;
// let go, it's frozen (freezeItem's rules), the toast offers Undo, and
// Undo puts the record back as it was. A plain click still opens the
// popover.
async function dragFreezeScenario(browser) {
  const { page, errors } = await touchPage(browser, false);
  console.log('\n--- DRAG: fridge item to the freezer (mouse) ---');
  const [chk] = await seedDrag(page);
  const fz = await rfPoint(page, 180, 66);
  const from = await centerOf(page, `[data-rf-item="${chk}"]`);
  await page.mouse.move(...from);
  await page.mouse.down();
  await page.mouse.move(from[0] + 20, from[1] - 20, { steps: 3 });
  await page.mouse.move(...fz, { steps: 8 });
  const mid = await page.evaluate(() => ({
    zone: !document.querySelector('.rf-drop[data-zone="freezer"]').hidden,
    over: document.querySelector('.rf-drop[data-zone="freezer"]').classList.contains('over'),
    fridgeZone: !document.querySelector('.rf-drop[data-zone="fridge"]').hidden,
    peek: document.getElementById('rfUnit').classList.contains('fz-peek'),
    open: document.getElementById('rfUnit').classList.contains('fz-open'),
    ghost: !!document.querySelector('.rf-drag-ghost')}));
  console.log('mid-drag:', JSON.stringify(mid));
  expectEqual('mid-drag over the closed freezer', mid, {zone: true, over: true, fridgeZone: false, peek: true, open: false, ghost: true});
  await page.waitForTimeout(450); // the door's quarter-turn settles before the picture
  await page.screenshot({ path: path.join(OUT, 'drag-freezer-desktop.png') });
  await page.mouse.up();
  await page.waitForTimeout(150);
  expectEqual('frozen by the drop', await recOf(page, chk), {frozen: true, thawed: false, left: null});
  const t = await toastText(page);
  if (!t.startsWith('Chicken breast frozen') || !t.includes('Undo')) throw new Error('toast: ' + t);
  expectEqual('in the freezer, door open, no ghost', await page.evaluate(id => [!!document.querySelector(`#rfFzShelf [data-rf-item="${id}"]`), document.getElementById('rfUnit').classList.contains('fz-open'), !document.querySelector('.rf-drag-ghost'), document.getElementById('rfPopover').hidden], chk), [true, true, true, true]);
  await page.click('#toast .toast-undo');
  await page.waitForTimeout(100);
  expectEqual('Undo: back in the fridge as it was', await recOf(page, chk), {frozen: false, thawed: false, left: 2});
  // a plain click still opens the popover
  await page.click(`[data-rf-item="${chk}"]`);
  await page.waitForTimeout(80);
  expectEqual('click opens the popover', await page.$eval('#rfPopover', p => !p.hidden && p.querySelector('.rf-pop-name').textContent), 'Chicken breast');
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Touch on a phone: hold about 400 ms, then drag a frozen item onto the
// fridge. With FoodKeeper's thaw figure (The Big Thaw for raw chicken) it
// thaws straight away with Undo; with none (broccoli) it goes back and the
// popover asks for the date, as the Thaw button does -- and that date's
// toast offers Undo too. Dropped on a closed fridge door, the door opens
// once the item is thawed, so it can be seen where it landed.
async function dragThawScenario(browser) {
  const { page, errors, cdp } = await touchPage(browser, true);
  console.log('\n--- DRAG: freezer item to the fridge (touch, phone) ---');
  const [, , , fzChk, fzBroc] = await seedDrag(page);
  await page.click('#rfFzHandle');
  await page.waitForTimeout(1100);
  const shelf = await rfPoint(page, 180, 330);
  const doorState = () => page.evaluate(() => [document.getElementById('rfUnit').classList.contains('open'), document.getElementById('rfHandle').getAttribute('aria-pressed')]);
  // by the handle from the keyboard: the open door's own edge sits over it
  const closeDoor = async () => {
    await page.focus('#rfHandle');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1100);
    expectEqual('fridge door closed before the drop', await doorState(), [false, 'false']);
  };
  await closeDoor();
  await touchPath(page, cdp, await centerOf(page, `[data-rf-item="${fzChk}"]`), shelf, { hold: 520 });
  await page.waitForTimeout(150);
  expectEqual('thawed by the drop', await recOf(page, fzChk), {frozen: false, thawed: true, left: 2});
  expectEqual('the closed fridge door opened on the drop', await doorState(), [true, 'true']);
  await page.waitForTimeout(1100);
  await page.screenshot({ path: path.join(OUT, 'drag-thaw-door-open-phone.png') });
  const t = await toastText(page);
  if (!t.startsWith('Chicken breast thawed') || !t.includes('Undo')) throw new Error('toast: ' + t);
  expectEqual('no popover after a drop', await page.$eval('#rfPopover', p => p.hidden), true);
  await page.click('#toast .toast-undo');
  await page.waitForTimeout(100);
  expectEqual('Undo: frozen again', await recOf(page, fzChk), {frozen: true, thawed: false, left: null});

  await closeDoor();
  await touchPath(page, cdp, await centerOf(page, `[data-rf-item="${fzBroc}"]`), shelf, { hold: 520 });
  await page.waitForTimeout(150);
  expectEqual('broccoli: still frozen, the date asked', await page.evaluate(id => [!!fridge.find(i => i.id === id).frozen, !document.getElementById('rfPopover').hidden, !document.querySelector('#rfPopover .rf-pop-thawask').hidden], fzBroc), [true, true, true]);
  await page.fill('#rfPopover .rf-pop-thawdate', await isoIn(page, 3));
  await page.dispatchEvent('#rfPopover .rf-pop-thawdate', 'change');
  await page.waitForTimeout(120);
  expectEqual('broccoli thawed by the date', await recOf(page, fzBroc), {frozen: false, thawed: true, left: 3});
  expectEqual('the fridge door opened once the date thawed it', await doorState(), [true, 'true']);
  if (!(await toastText(page)).includes('Undo')) throw new Error('date thaw after a drop should offer Undo');
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Something FoodKeeper says doesn't freeze well, or past date: the
// freezer shows no outline and its door stays shut; dropped there, the
// item goes back and a one-line note says why. Nothing changes.
async function dragRefusedScenario(browser) {
  const { page, errors } = await touchPage(browser, false);
  console.log('\n--- DRAG: can\'t go in the freezer ---');
  const [, lettuce, steak] = await seedDrag(page);
  const fz = await rfPoint(page, 180, 66);
  for (const [id, note] of [[lettuce, 'FoodKeeper says Leaf lettuce doesn\'t freeze well'], [steak, 'is past date — it stays out of the freezer']]) {
    const before = await recOf(page, id);
    const from = await centerOf(page, `[data-rf-item="${id}"]`);
    await page.mouse.move(...from);
    await page.mouse.down();
    await page.mouse.move(...fz, { steps: 10 });
    expectEqual('no outline, no peek', await page.evaluate(() => [document.querySelector('.rf-drop[data-zone="freezer"]').hidden, document.getElementById('rfUnit').classList.contains('fz-peek')]), [true, false]);
    await page.mouse.up();
    await page.waitForTimeout(300);
    expectEqual('unchanged', await recOf(page, id), before);
    const t = await toastText(page);
    console.log('note:', t);
    if (!t.includes(note) || t.includes('Undo')) throw new Error('note: ' + t);
    expectEqual('back in place, popover closed', await page.evaluate(id => [!document.querySelector(`[data-rf-item="${id}"]`).classList.contains('rf-lifted'), !document.querySelector('.rf-drag-ghost'), document.getElementById('rfPopover').hidden], id), [true, true, true]);
  }
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// On a phone a tap on food still opens the popover, a vertical swipe
// that starts on food still scrolls the page, and a sideways swipe across
// the fridge still switches to Kitchen -- none of them picks anything up.
async function dragTouchGesturesScenario(browser) {
  const { page, errors, cdp } = await touchPage(browser, true);
  console.log('\n--- DRAG: tap and swipes on a phone ---');
  const [chk] = await seedDrag(page);
  const from = await centerOf(page, `[data-rf-item="${chk}"]`);
  await touch(cdp, 'touchStart', ...from);
  await page.waitForTimeout(60);
  await touch(cdp, 'touchEnd');
  await page.waitForTimeout(150);
  expectEqual('tap opens the popover', await page.$eval('#rfPopover', p => !p.hidden && p.querySelector('.rf-pop-name').textContent), 'Chicken breast');
  await page.evaluate(() => rfHidePopover());

  const y0 = await page.evaluate(() => scrollY);
  await touchPath(page, cdp, from, [from[0], from[1] - 260], { steps: 10, stepMs: 12 });
  await page.waitForTimeout(500);
  const scroll = await page.evaluate(() => [scrollY, !!document.querySelector('.rf-drag-ghost'), document.querySelectorAll('.rf-lifted').length]);
  console.log('vertical swipe from food: scrollY', y0, '->', scroll[0]);
  if (!(scroll[0] > y0 + 50)) throw new Error('a vertical swipe on food should scroll the page');
  expectEqual('nothing picked up', scroll.slice(1), [false, 0]);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(150);

  const a = await rfPoint(page, 300, 250), b = await rfPoint(page, 10, 250);
  await touchPath(page, cdp, a, [a[0] - 300, a[1]], { steps: 10, stepMs: 12 });
  await page.waitForTimeout(900);
  const tab = await page.evaluate(() => [document.getElementById('tabKitchen').getAttribute('aria-selected'), document.getElementById('roomsTrack').scrollLeft > 100, !!document.querySelector('.rf-drag-ghost'), fridge.filter(i => i.frozen).length]);
  console.log('sideways swipe:', JSON.stringify(tab));
  expectEqual('swipe switched to Kitchen, nothing moved', tab, ['true', true, false, 2]);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// The phone picture of a drag held over the closed freezer.
async function dragPhoneShotScenario(browser) {
  const { page, errors } = await touchPage(browser, true);
  console.log('\n--- DRAG: mid-drag picture, phone ---');
  const [chk] = await seedDrag(page);
  const cdp = await page.context().newCDPSession(page);
  const from = await centerOf(page, `[data-rf-item="${chk}"]`);
  const fz = await rfPoint(page, 180, 66);
  await touch(cdp, 'touchStart', ...from);
  await page.waitForTimeout(520);
  for (let k = 1; k <= 8; k++) { await touch(cdp, 'touchMove', from[0] + (fz[0] - from[0]) * k / 8, from[1] + (fz[1] - from[1]) * k / 8); await page.waitForTimeout(16); }
  await page.waitForTimeout(450);
  expectEqual('held over the freezer', await page.evaluate(() => [document.getElementById('rfUnit').classList.contains('fz-peek'), document.querySelector('.rf-drop[data-zone="freezer"]').classList.contains('over')]), [true, true]);
  await page.screenshot({ path: path.join(OUT, 'drag-freezer-phone.png') });
  await touch(cdp, 'touchEnd');
  await page.waitForTimeout(150);
  expectEqual('frozen', (await recOf(page, chk)).frozen, true);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Reduced motion: the drop still works, with no fly animation.
async function dragReducedMotionScenario(browser) {
  const { page, errors } = await touchPage(browser, false);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  console.log('\n--- DRAG: reduced motion ---');
  const [chk] = await seedDrag(page);
  const from = await centerOf(page, `[data-rf-item="${chk}"]`), fz = await rfPoint(page, 180, 66);
  await page.mouse.move(...from); await page.mouse.down();
  await page.mouse.move(...fz, { steps: 8 });
  await page.mouse.up();
  const anims = await page.evaluate(() => document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.rf-foodshape, .rf-drag-ghost')).length);
  expectEqual('frozen, no fly', [(await recOf(page, chk)).frozen, anims], [true, 0]);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

/* ---------- the freezer ---------- */

// Opens an item's popover (wherever it's drawn) and leaves it open.
async function openPopover(page, id) {
  await page.$eval(`[data-rf-item="${id}"]`, el => el.click());
  await page.waitForTimeout(80);
}
const popButtons = page => page.$$eval('#rfPopover button', bs => bs.filter(b => !b.hidden).map(b => b.textContent.trim()));

// Freeze: closed freezer on load with its count; Freeze in the popover
// restarts the clock today on FoodKeeper's freezer value (chicken breast
// #117, 9 months = 270 days); the item leaves the fridge for the freezer,
// the headline, the decay line and the at-risk counts, shows in All items
// as "frozen" in plain ink, and nothing reaches the ledger. Used counts.
async function freezeScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- FREEZER: freeze ---');
  await page.evaluate(() => {
    const t = today();
    fridge = [{id: ++uid, key: 'chicken', bought: t - 1, custom: null}, {id: ++uid, key: 'spinach', bought: t - 5, custom: null}];
    render();
  });
  await page.waitForTimeout(700);
  expectEqual('freezer closed on load', await page.$eval('#rfUnit', u => u.classList.contains('fz-open')), false);
  expectEqual('count on the door, empty', await page.textContent('#rfFzCount'), 'empty');
  const id = await page.evaluate(() => fridge.find(i => i.key === 'chicken').id);
  const before = await page.evaluate(() => ({ledger: JSON.stringify(ledger), headline: document.getElementById('headline').textContent,
    dots: document.querySelectorAll('#chart .dot').length, atRisk: rfAtRiskCount(today())}));
  await openPopover(page, id);
  const btns = await popButtons(page);
  if (!btns.includes('Freeze') || btns.includes('Thaw')) throw new Error('chicken popover should offer Freeze, not Thaw: ' + btns);
  await page.click('#rfPopover .rf-pop-freeze');
  await page.waitForTimeout(150);
  const st = await page.evaluate(id => {
    const it = fridge.find(i => i.id === id);
    return {frozen: !!it.frozen, clockFrom: it.clockFrom - today(), shelf: shelfOf(it), bought: it.bought - today(), left: leftAt(it, today()),
      inFreezer: !!document.querySelector(`#rfFzShelf [data-rf-item="${id}"]`), inFridge: !!document.querySelector(`#rfShelfEye [data-rf-item="${id}"], #rfShelfUpper [data-rf-item="${id}"]`),
      count: document.getElementById('rfFzCount').textContent, ledger: JSON.stringify(ledger),
      headline: document.getElementById('headline').textContent, dots: document.querySelectorAll('#chart .dot').length, atRisk: rfAtRiskCount(today()),
      source: shelfSourceOf(it)};
  }, id);
  console.log(JSON.stringify(st));
  expectEqual('frozen, clock from today, 270 days, bought kept', [st.frozen, st.clockFrom, st.shelf, st.bought], [true, 0, 270, -1]);
  expectEqual('no countdown while frozen', st.left, null); // Infinity
  expectEqual('in the freezer, not on a fridge shelf', [st.inFreezer, st.inFridge], [true, false]);
  expectEqual('count on the door', st.count, '1 inside');
  expectEqual('ledger untouched by freezing', st.ledger, before.ledger);
  expectEqual('headline drops it (spinach still counts)', [before.headline, st.headline], ['2 things become waste within 72 hours.', '1 thing becomes waste within 72 hours.']);
  expectEqual('decay line drops it', [before.dots, st.dots], [2, 1]);
  expectEqual('at-risk count drops it', [before.atRisk, st.atRisk], [2, 1]);
  if (!st.source.startsWith('frozen: FoodKeeper #117, 270 days of best quality')) throw new Error('source: ' + st.source);
  const text = await popoverText(page, 'chicken');
  if (!text.includes('Frozen') || !text.includes('270 days of best quality left') || !text.includes('Thaw') || text.includes('Freeze')) throw new Error('frozen popover: ' + text);
  const inv = await readInventory(page);
  expectRow(inv, 'Chicken breast', 'frozen');
  const color = await page.evaluate(() => getComputedStyle([...document.querySelectorAll('#fridgeShelf .fridge-label')].find(l => l.textContent.startsWith('Chicken breast'))).color);
  expectEqual('frozen label in plain ink', color, 'rgb(92, 102, 100)');
  // The handle opens and closes it.
  await page.click('#rfFzHandle');
  await page.waitForTimeout(1200);
  expectEqual('handle opens it', await page.$eval('#rfUnit', u => u.classList.contains('fz-open')), true);
  expectEqual('pressed state', await page.getAttribute('#rfFzHandle', 'aria-pressed'), 'true');
  // Used from the freezer counts like any other.
  await openPopover(page, id);
  await page.click('#rfPopover .rf-pop-used');
  await page.waitForTimeout(100);
  expectEqual('Used counts as saved', await page.evaluate(() => ledger.savedG), 500);
  await page.evaluate(() => { document.getElementById('rfFzHandle').click(); });
  await page.waitForTimeout(100);
  expectEqual('handle closes it', await page.$eval('#rfUnit', u => u.classList.contains('fz-open')), false);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Thaw: with FoodKeeper's after-thawing value (#134 chicken nuggets, 2
// days) straight back to the fridge, the clock restarted today; without
// one or a Big Thaw figure (broccoli) a date is asked first. A spirit comes out with no
// clock change ("Take out").
async function thawScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- FREEZER: thaw ---');
  await page.evaluate(() => {
    const t = today();
    fridge = [
      {id: ++uid, key: '_fk_134', name: 'Chicken nuggets', bought: t - 40, custom: null, frozen: true},
      {id: ++uid, key: 'broccoli', bought: t - 30, custom: null, frozen: true, clockFrom: t - 20},
      {id: ++uid, key: 'vodka', bought: t - 10, custom: null, frozen: true},
    ];
    render();
  });
  const [nug, chk, vod] = await page.evaluate(() => fridge.map(i => i.id));
  await openPopover(page, nug);
  expectEqual('nuggets: Thaw, no Freeze', (await popButtons(page)).filter(b => /Freeze|Thaw|Take out/.test(b)), ['Thaw']);
  await page.click('#rfPopover .rf-pop-thaw');
  await page.waitForTimeout(120);
  let st = await page.evaluate(id => { const it = fridge.find(i => i.id === id); return [!!it.frozen, !!it.thawed, it.clockFrom - today(), left(it), shelfSourceOf(it)]; }, nug);
  console.log(JSON.stringify(st));
  expectEqual('nuggets thawed: fridge, 2 days from today', st.slice(0, 4), [false, true, 0, 2]);
  if (!st[4].startsWith('thawed: FoodKeeper #134, 2 days in the fridge after thawing')) throw new Error('source: ' + st[4]);
  expectEqual('back on a fridge shelf', await page.evaluate(id => !!document.querySelector(`#rfShelfEye [data-rf-item="${id}"]`), nug), true);

  await openPopover(page, chk);
  await page.click('#rfPopover .rf-pop-thaw');
  await page.waitForTimeout(80);
  expectEqual('broccoli: no thawed figure, still frozen until a date', await page.evaluate(id => [!fridge.find(i => i.id === id).frozen, !document.querySelector('#rfPopover .rf-pop-thawask').hidden], chk), [false, true]);
  await page.fill('#rfPopover .rf-pop-thawdate', await isoIn(page, 2));
  await page.dispatchEvent('#rfPopover .rf-pop-thawdate', 'change');
  await page.waitForTimeout(120);
  st = await page.evaluate(id => { const it = fridge.find(i => i.id === id); return [!!it.frozen, it.clockFrom - today(), left(it), it.shelfFrom]; }, chk);
  expectEqual('broccoli thawed by the date given', st, [false, 0, 2, 'date']);

  await openPopover(page, vod);
  expectEqual('a spirit: Take out', (await popButtons(page)).filter(b => /Freeze|Thaw|Take out/.test(b)), ['Take out']);
  await page.click('#rfPopover .rf-pop-thaw');
  await page.waitForTimeout(120);
  st = await page.evaluate(id => { const it = fridge.find(i => i.id === id); return [!!it.frozen, it.clockFrom == null, keeps(it), drinkOnCounter(it)]; }, vod);
  expectEqual('vodka out, no clock, back on the counter', st, [false, true, true, true]);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Foods FoodKeeper says not to freeze get no Freeze: lettuce, cucumber,
// eggs in shell; nor does a custom item or one past date. A spirit can go
// in, with no clock change.
async function cantFreezeScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- FREEZER: can\'t be frozen ---');
  await page.evaluate(() => {
    const t = today();
    fridge = ['leaflettuce', 'romaine', 'cucumber', 'egg', 'avocado'].map(key => ({id: ++uid, key, bought: t, custom: null}))
      .concat([{id: ++uid, key: '_c_dumplings', custom: {en: 'Dumplings', g: 300, usd: 4}, bought: t, shelf: 30, shelfFrom: 'date'},
               {id: ++uid, key: 'steak', bought: t - 9, custom: null},
               {id: ++uid, key: 'gin', bought: t - 3, custom: null}]);
    render();
  });
  const ids = await page.evaluate(() => fridge.map(i => [i.key, i.id]));
  const offered = {};
  for (const [key, id] of ids) {
    await openPopover(page, id);
    offered[key] = (await popButtons(page)).includes('Freeze');
    await page.click('#headline');
  }
  console.log(JSON.stringify(offered));
  expectEqual('Freeze offered', offered, {leaflettuce: false, romaine: false, cucumber: false, egg: false, avocado: false, _c_dumplings: false, steak: false, gin: true});
  const gin = ids.find(([k]) => k === 'gin')[1];
  await openPopover(page, gin);
  await page.click('#rfPopover .rf-pop-freeze');
  await page.waitForTimeout(100);
  expectEqual('gin frozen, no clock change, still keeps', await page.evaluate(id => { const it = fridge.find(i => i.id === id); return [!!it.frozen, it.clockFrom == null, keeps(it), drinkOnCounter(it)]; }, gin), [true, true, true, false]);
  // Typed "frozen cucumber" stops at the preview and says why it goes in
  // the fridge.
  await typeEntry(page, 'frozen cucumber');
  const rows = await readReview(page, '#receiptLines');
  console.log(JSON.stringify(rows));
  if (!rows[0].match.includes('freezing not recommended') || await page.$('#receiptLines .entry-frozen')) throw new Error('frozen cucumber, no freeze toggle: ' + rows[0].match);
  await page.click('#addbtn');
  await page.waitForTimeout(100);
  expectEqual('cucumber went in the fridge', await page.evaluate(() => fridge.filter(i => i.key === 'cucumber').map(i => !!i.frozen)), [false, false]);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Frozen food by typing: "frozen shrimp" goes straight into the freezer
// (FOODS shrimp, #151's freezer value counted from purchase); "chicken
// nuggets" is only ever kept frozen (#134) and defaults in; the preview's
// Frozen toggle puts salmon in too, and a frozen line with no freezer
// value (frozen peas: no match) asks for its date.
async function frozenEntryScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- FREEZER: frozen entry by typing ---');
  await typeEntry(page, 'frozen shrimp');
  expectEqual('frozen shrimp straight in', await previewOpen(page), false);
  let st = await page.evaluate(() => fridge.map(i => [i.key, !!i.frozen, shelfOf(i)]));
  expectEqual('shrimp frozen, 540 days', st, [['shrimp', true, 540]]);
  await typeEntry(page, 'salmon, chicken nuggets, frozen peas, frozen edamame');
  let rows = await readReview(page, '#receiptLines');
  console.log(JSON.stringify(rows.map(r => [r.name, r.flag, r.match])));
  const checked = await page.$$eval('#receiptLines .entry-frozen', bs => bs.map(b => b.getAttribute('aria-pressed') === 'true'));
  expectEqual('Frozen toggles: salmon off, nuggets, peas and edamame on', checked, [false, true, true, true]);
  expectEqual('only the peas need a date', rows.map(r => r.flag), ['', '', 'no match / choice', '']);
  if (!rows[3].match.includes('FoodKeeper #641')) throw new Error('frozen edamame should be #641: ' + rows[3].match);
  await page.click('#receiptLines .entry-frozen[data-idx="0"]');
  await page.waitForTimeout(60);
  await page.fill('#receiptLines .entry-date[data-idx="2"]', await isoIn(page, 120));
  await page.dispatchEvent('#receiptLines .entry-date[data-idx="2"]', 'change');
  await page.waitForTimeout(60);
  await page.click('#addbtn');
  await page.waitForTimeout(150);
  st = await page.evaluate(() => fridge.map(i => [food(i).en, !!i.frozen, shelfOf(i)]));
  console.log(JSON.stringify(st));
  expectEqual('all frozen, by their freezer values (peas by the date)', st,
    [['Shrimp', true, 540], ['Salmon', true, 90], ['Chicken nuggets', true, 90], ['Peas', true, 120], ['Frozen edamame', true, 730]]);
  expectEqual('remembered for restock', await page.evaluate(() => !!standing.salmon.frozen), true);
  expectEqual('count on the door', await page.textContent('#rfFzCount'), '5 inside');
  expectEqual('none counted', await page.evaluate(() => counted(fridge).length), 0);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Frozen food by receipt: a line containing "frozen" (in the scanned
// name or as printed) is ticked Frozen and goes straight into the
// freezer; the toggle takes another in; a plain line stays in the fridge.
async function frozenReceiptScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- FREEZER: frozen entry by receipt ---');
  await page.evaluate(() => {
    window.__receiptApiOverride = async () => ({
      date: null,
      items: [
        {raw: 'KS FROZEN SHRIMP 2LB', expanded: 'Frozen shrimp', quantity: 1, is_food: true},
        {raw: 'FROZEN BROCCOLI', expanded: 'Broccoli', quantity: 1, is_food: true},
        {raw: 'GROUND BEEF', expanded: 'Ground beef', quantity: 1, is_food: true},
        {raw: 'ROMAINE HEARTS', expanded: 'Romaine hearts', quantity: 1, is_food: true}
      ]
    });
  });
  const fixturePath = path.join(require('os').tmpdir(), 'perishable-receipt-fixture-frozen.jpg');
  fs.writeFileSync(fixturePath, FIXTURE_JPEG);
  await page.setInputFiles('#receiptFile', fixturePath);
  await page.waitForSelector('#receiptLines .receipt-row');
  const checked = await page.$$eval('#receiptLines .receipt-row', rs => rs.map(r => { const c = r.querySelector('.entry-frozen'); return c ? c.getAttribute('aria-pressed') === 'true' : null; }));
  expectEqual('Frozen: shrimp and broccoli ticked, beef not, romaine none', checked, [true, true, false, null]);
  await page.click('#receiptLines .entry-frozen[data-idx="2"]');
  await page.waitForTimeout(60);
  await page.click('#addbtn');
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => fridge.map(i => [i.key, !!i.frozen, shelfOf(i)]));
  console.log(JSON.stringify(st));
  expectEqual('in the freezer by their freezer values; romaine in the fridge', st,
    [['shrimp', true, 540], ['broccoli', true, 360], ['beef', true, 120], ['romaine', false, 14]]);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Frozen food never spoils (USDA FSIS "Freezing and Food Safety": kept at
// 0 °F it is always safe; storage times are for quality only). Chicken
// breast frozen 300 days ago, past its 270 days: never past date, not in
// the crisper or the gone drawer, not in Toss all or any count, still in
// the freezer after a reload; the popover says "Best quality passed" and
// the freezer burn is at its heaviest. Thaw still works.
async function frozenNeverSpoilsScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- FREEZER: frozen food never spoils ---');
  await page.evaluate(() => {
    const t = today();
    fridge = [{id: ++uid, key: 'chicken', bought: t - 310, custom: null, frozen: true, clockFrom: t - 300},
              {id: ++uid, key: 'milk', bought: t - 9, custom: null, shelf: 7, shelfFrom: 'date'}];
    lastVisit = t - 40; render(); saveState();
  });
  await page.reload();
  await page.waitForSelector('#headline');
  await page.waitForTimeout(200);
  const id = await page.evaluate(() => fridge.find(i => i.key === 'chicken').id);
  const st = await page.evaluate(id => {
    const it = fridge.find(i => i.id === id);
    return {left: leftAt(it, today()), crossed: !!it.crossed, burn: burnFraction(it, today()), frozen: !!it.frozen,
      inFreezer: !!document.querySelector(`#rfFzShelf [data-rf-item="${id}"]`),
      inCrisper: !!document.querySelector(`#rfCrisperItems [data-rf-item="${id}"]`),
      inDrawer: !!document.querySelector(`#fridgeDrawerItems [data-fridge-item="${id}"]`),
      crisperFront: (document.querySelector('.rf-crisper-front, #rfCrisperFront') || {}).textContent || '',
      atRisk: rfAtRiskCount(today()), counted: counted(fridge).map(i => i.key)};
  }, id);
  console.log(JSON.stringify(st));
  expectEqual('never past date', [st.left, st.crossed, st.frozen], [null, false, true]); // Infinity
  expectEqual('stays in the freezer, not the crisper or the gone drawer', [st.inFreezer, st.inCrisper, st.inDrawer], [true, false, false]);
  expectEqual('freezer burn at its heaviest', st.burn, 1);
  expectEqual('only the milk counts', st.counted, ['milk']);
  const text = await popoverText(page, 'chicken');
  if (!text.includes('Best quality passed') || !text.includes('Frozen') || !text.includes('Thaw') || text.includes('past date')) throw new Error('popover: ' + text);
  // Toss all takes the past-date milk only
  const tossAll = await page.evaluate(() => fridge.filter(i => left(i) < 0).map(i => i.key));
  expectEqual('Toss all: the milk only', tossAll, ['milk']);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Freezing pauses decay, it doesn't undo it. Chicken breast (2 days)
// bought yesterday is half decayed; frozen, it stays at 0.5 under the
// frost however long it's in; thawed (The Big Thaw, 2 days) it carries on
// from 0.5 and reaches 1 at its thawed use-by -- never back to fresh. The
// drawing follows the same number.
async function freezePausesDecayScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- FREEZER: freezing pauses decay ---');
  await page.evaluate(() => { fridge = [{id: ++uid, key: 'chicken', bought: today() - 1, custom: null}]; render(); });
  const id = await page.evaluate(() => fridge[0].id);
  // halfway through its shelf life; drawn at half the last-day level
  const before = await page.evaluate(() => [rawDecay(fridge[0], today()), decayFraction(fridge[0], today())]);
  expectEqual('half decayed before freezing', before, [0.5, 0.5 * 0.75]);
  await openPopover(page, id);
  await page.click('#rfPopover .rf-pop-freeze');
  await page.waitForTimeout(120);
  const frozen = await page.evaluate(() => { const it = fridge[0]; return [it.decayFrom, decayFraction(it, today()), decayFraction(it, today() + 200), decayFraction(it, today() + 400)]; });
  expectEqual('frozen at 0.5, held there', frozen, [0.5, 0.375, 0.375, 0.375]);
  // the freezer draws it as it was: the same colour the fridge drew it with
  const colours = await page.evaluate(() => [foodBodyColor(fridge[0], 0.375), document.querySelector('#rfFzShelf [data-rf-item] svg').outerHTML.includes(foodBodyColor(fridge[0], 0.375))]);
  expectEqual('drawn half decayed under the frost', colours[1], true);
  await openPopover(page, id);
  await page.click('#rfPopover .rf-pop-thaw');
  await page.waitForTimeout(120);
  const thawed = await page.evaluate(() => { const it = fridge[0]; return [!!it.thawed, left(it), decayFraction(it, today()), decayFraction(it, today() + 1), decayFraction(it, today() + 2), decayFraction(it, today() + 3)]; });
  console.log(JSON.stringify(thawed));
  expectEqual('thawed: continues from where it was, last-day level at the thawed use-by, 1 only past it', thawed, [true, 2, 0.375, 0.5625, 0.75, 1]);
  // frozen again: held at the level it had then
  await openPopover(page, id);
  await page.evaluate(() => { fridge[0].clockFrom = today() - 1; render(); });
  await openPopover(page, id);
  await page.click('#rfPopover .rf-pop-freeze');
  await page.waitForTimeout(120);
  expectEqual('frozen again at 0.75', await page.evaluate(() => [fridge[0].decayFrom, decayFraction(fridge[0], today() + 30)]), [0.75, 0.5625]);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Thaw with no FoodKeeper after-thawing value: USDA FSIS "The Big Thaw"
// (via MSU Extension E3259), upper end, from the thaw date -- poultry,
// ground meat (fresh raw sausage too: Italian #102, fresh chorizo #630,
// fresh bratwurst #638, uncooked links #322), stew meat and seafood 2
// days, red meat cuts 5. The popover says so before and after. Anything
// else (broccoli, cooked shellfish, smoked sausage) still asks for a date.
async function bigThawScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- FREEZER: The Big Thaw ---');
  await page.evaluate(() => {
    const t = today();
    const NAMES = {_fk_162: 'Cooked shellfish', _fk_41: 'Stew beef', _fk_630: 'Fresh chorizo', _fk_638: 'Fresh bratwurst', _fk_322: 'Uncooked sausages', _fk_639: 'Smoked bratwurst'};
    fridge = ['chicken', 'shrimp', 'steak', 'beef', 'salmon', 'broccoli', '_fk_162', '_fk_41', '_fk_630', '_fk_638', '_fk_322', '_fk_639'].map(key =>
      ({id: ++uid, key, bought: t - 20, custom: null, frozen: true, clockFrom: t - 10, ...(NAMES[key] ? {name: NAMES[key]} : {})}));
    render();
  });
  // Italian sausage typed frozen: #102 raw sausage, into the freezer
  await typeEntry(page, 'frozen italian sausage');
  expectEqual('frozen italian sausage straight in as #102', await page.evaluate(() => fridge.filter(i => i.key === '_fk_102').map(i => [!!i.frozen, shelfOf(i)])), [[true, 60]]);
  const ids = await page.evaluate(() => fridge.map(i => [i.key, i.id]));
  const result = {};
  for (const [key, id] of ids) {
    await openPopover(page, id);
    const note = await page.evaluate(() => { const n = document.querySelector('#rfPopover .rf-pop-thawnote'); return n ? [...n.children].map(c => c.textContent.trim()).join(' ') : null; });
    const asks = await page.evaluate(() => !!document.querySelector('#rfPopover .rf-pop-thawask'));
    if (asks) { result[key] = ['asks', note]; await page.click('#headline'); continue; }
    await page.click('#rfPopover .rf-pop-thaw');
    await page.waitForTimeout(80);
    const after = await page.evaluate(id => { const it = fridge.find(i => i.id === id); return [left(it), it.clockFrom - today(), shelfSourceOf(it)]; }, id);
    result[key] = [after[0], after[1], note, after[2]];
  }
  console.log(JSON.stringify(result, null, 1));
  const src = 'USDA FSIS “The Big Thaw” (via MSU Extension E3259)';
  for (const [key, days] of [['chicken', 2], ['shrimp', 2], ['steak', 5], ['beef', 2], ['salmon', 2], ['_fk_41', 2],
                             ['_fk_102', 2], ['_fk_630', 2], ['_fk_638', 2], ['_fk_322', 2]]) {
    const r = result[key];
    expectEqual(`${key}: ${days} days from the thaw date`, r.slice(0, 2), [days, 0]);
    expectEqual(`${key}: source before thawing`, r[2], `Thawed ${days} days in the fridge — ${src}`);
    if (!r[3].startsWith(`thawed: ${src}, ${days} days in the fridge after thawing`)) throw new Error(`${key} source after: ${r[3]}`);
  }
  expectEqual('broccoli, cooked shellfish and smoked bratwurst ask for a date', [result.broccoli, result._fk_162, result._fk_639], [['asks', null], ['asks', null], ['asks', null]]);
  // the source shows in the thawed item's popover too
  const text = await popoverText(page, 'steak');
  if (!text.includes('The Big Thaw')) throw new Error('thawed steak popover: ' + text);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Getting food out of the freezer, at desktop and phone: a frozen item's
// popover shows Thaw (a spirit "Take out") inside the window; All items
// has Thaw / Take out on each frozen item's row (with no thawed figure it
// opens the popover on its date); the count on the closed door opens the
// freezer.
async function thawReachScenario(browser) {
  console.log('\n--- FREEZER: Thaw is easy to find ---');
  for (const [name, vp] of [['desktop', { width: 1200, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://localhost:${PORT}/index.html`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#headline');
    await page.evaluate(() => {
      const t = today();
      fridge = [{id: ++uid, key: 'chicken', bought: t - 5, custom: null, frozen: true, clockFrom: t - 3},
                {id: ++uid, key: 'vodka', bought: t - 5, custom: null, frozen: true},
                {id: ++uid, key: 'broccoli', bought: t - 5, custom: null, frozen: true, clockFrom: t - 3},
                {id: ++uid, key: 'steak', bought: t - 1, custom: null}];
      render();
    });
    const [chk, vod, bro] = await page.evaluate(() => fridge.map(i => i.id));
    // the door count opens the freezer
    expectEqual(`${name}: closed on load`, await page.$eval('#rfUnit', u => u.classList.contains('fz-open')), false);
    expectEqual(`${name}: count`, await page.textContent('#rfFzCount'), '3 inside');
    await page.click('#rfFzCount');
    await page.waitForTimeout(150);
    expectEqual(`${name}: tapping the count opens it`, [await page.$eval('#rfUnit', u => u.classList.contains('fz-open')), await page.getAttribute('#rfFzHandle', 'aria-pressed')], [true, 'true']);
    // popover: Thaw / Take out, inside the window
    for (const [id, label] of [[chk, 'Thaw'], [vod, 'Take out']]) {
      await page.click(`#rfFzShelf [data-rf-item="${id}"]`);
      await page.waitForTimeout(120);
      const b = await page.evaluate(() => { const b = document.querySelector('#rfPopover .rf-pop-thaw'); const r = b.getBoundingClientRect(); return {text: b.textContent.trim(), inside: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, visible: r.width > 0 && r.height > 0}; });
      expectEqual(`${name}: popover shows ${label} in the window`, [b.text, b.inside, b.visible], [label, true, true]);
      await page.click('#headline');
    }
    // All items: Thaw on the frozen rows, none on the steak
    await page.evaluate(() => { document.getElementById('allItems').open = true; render(); });
    await page.waitForTimeout(150);
    const rowActs = await page.evaluate(() => fridge.map(it => { const b = document.querySelector(`[data-fridge-thaw="${it.id}"]`); return b ? b.textContent : null; }));
    expectEqual(`${name}: row Thaw / Take out`, rowActs, ['Thaw', 'Take out', 'Thaw', null]);
    const tap = await page.$eval(`[data-fridge-thaw="${chk}"]`, b => { const r = b.getBoundingClientRect(); return [Math.round(r.width) >= (innerWidth < 720 ? 44 : 1), Math.round(r.height) >= (innerWidth < 720 ? 44 : 1)]; });
    expectEqual(`${name}: row Thaw is a full tap target`, tap, [true, true]);
    await page.click(`[data-fridge-thaw="${chk}"]`);
    await page.waitForTimeout(150);
    expectEqual(`${name}: row Thaw thaws chicken (The Big Thaw, 2 days)`, await page.evaluate(id => { const it = fridge.find(i => i.id === id); return [!!it.frozen, !!it.thawed, left(it)]; }, chk), [false, true, 2]);
    await page.click(`[data-fridge-thaw="${bro}"]`);
    await page.waitForTimeout(150);
    const ask = await page.evaluate(() => { const p = document.getElementById('rfPopover'); const a = p.querySelector('.rf-pop-thawask'); return [!p.hidden, !!a && !a.hidden]; });
    expectEqual(`${name}: broccoli's row Thaw opens the popover on its date`, ask, [true, true]);
    await page.fill('#rfPopover .rf-pop-thawdate', await isoIn(page, 3));
    await page.dispatchEvent('#rfPopover .rf-pop-thawdate', 'change');
    await page.waitForTimeout(120);
    await page.click(`[data-fridge-thaw="${vod}"]`);
    await page.waitForTimeout(120);
    expectEqual(`${name}: broccoli thawed by its date, vodka taken out`, await page.evaluate(() => fridge.map(i => [i.key, !!i.frozen])), [['chicken', false], ['vodka', false], ['broccoli', false], ['steak', false]]);
    expectEqual(`${name}: freezer empty`, await page.textContent('#rfFzCount'), 'empty');
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    await ctx.close();
  }
}

// Saved data from before the freezer (the drinks commit, ad0d0c0) loads
// with nothing frozen: every item where it was, the freezer empty and
// closed, and every count as before.
async function freezerMigrationScenario(browser) {
  const oldHtml = execSync('git show ad0d0c0:index.html', { cwd: ROOT, maxBuffer: 1024 * 1024 * 20 });
  const oldServer = await new Promise(resolve => {
    const s = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); res.end(oldHtml); });
    s.listen(PORT_LIVE, () => resolve(s));
  });
  console.log('\n--- FREEZER: migration of pre-freezer saved data ---');
  const old = await (await browser.newContext()).newPage();
  await old.goto(`http://localhost:${PORT_LIVE}/`);
  await old.evaluate(() => localStorage.clear());
  await old.reload();
  await old.waitForSelector('#headline');
  await old.evaluate(() => {
    const t = today();
    fridge = [
      {id: ++uid, key: 'chicken', bought: t - 1, custom: null}, {id: ++uid, key: 'shrimp', bought: t, custom: null},
      {id: ++uid, key: 'vodka', bought: t, custom: null}, {id: ++uid, key: 'milk', bought: t - 2, custom: null, shelf: 7, shelfFrom: 'date'},
      {id: ++uid, key: 'tomato', bought: t - 10, custom: null}, {id: ++uid, key: 'banana', bought: t, custom: null, ripening: true},
    ];
    render(); saveState();
  });
  const oldView = await old.evaluate(() => ({headline: document.getElementById('headline').textContent, atRisk: rfAtRiskCount(today()),
    left: fridge.map(i => left(i))}));
  const saved = await old.evaluate(() => localStorage.getItem('perishable.v1'));
  await old.context().close();
  oldServer.close();
  if (saved.includes('frozen')) throw new Error('pre-freezer state already mentions frozen');

  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(st => localStorage.setItem('perishable.v1', st), saved);
  await page.reload();
  await page.waitForSelector('#headline');
  await page.waitForTimeout(200);
  const now = await page.evaluate(() => ({headline: document.getElementById('headline').textContent, atRisk: rfAtRiskCount(today()),
    left: fridge.map(i => left(i)), frozen: fridge.filter(i => i.frozen).length, count: document.getElementById('rfFzCount').textContent,
    inFreezer: document.querySelectorAll('#rfFzShelf [data-rf-item]').length, open: document.getElementById('rfUnit').classList.contains('fz-open')}));
  console.log(JSON.stringify({oldView, now}));
  expectEqual('nothing frozen', [now.frozen, now.inFreezer, now.count, now.open], [0, 0, 'empty', false]);
  expectEqual('same headline', now.headline, oldView.headline);
  expectEqual('same at-risk count', now.atRisk, oldView.atRisk);
  expectEqual('same days left', now.left, oldView.left);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// The top bar's Add: scrolls to Add food and puts the cursor in the
// entry field. On a phone the bar is a thin sticky strip, so Add stays
// one tap away from anywhere on the page.
async function addButtonScenario(browser) {
  console.log('\n--- ADD BUTTON: top bar jumps to Add food and focuses entry ---');
  for (const [name, vp] of [['desktop', { width: 1200, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://localhost:${PORT}/index.html`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#headline');
    await page.fill('#entry', 'spinach, chicken 1d, onion, carrot 10d, potato, apple, yogurt, tofu 3d');
    await page.click('#addbtn');
    await answerPreview(page);
    await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
    const order = await page.$eval('.bar', b => [...b.querySelectorAll('button')].map(x => x.id));
    expectEqual(`${name}: Add sits next to Settings`, order, ['addJumpBtn', 'settingsBtn']);
    if (name === 'phone') {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(100);
      const bar = await page.$eval('.bar', b => { const r = b.getBoundingClientRect(); return { top: Math.round(r.top), h: Math.round(r.height) }; });
      console.log(`${name}: bar at the bottom of the page`, JSON.stringify(bar));
      if (bar.top !== 0) throw new Error(`phone: the bar should stick to the top, got top ${bar.top}`);
      if (bar.h > 64) throw new Error(`phone: the bar should be thin, got ${bar.h}px`);
      const tap = await page.$eval('#addJumpBtn', b => b.getBoundingClientRect().height);
      if (tap < 44) throw new Error(`phone: Add should be a 44px tap target, got ${tap}`);
    }
    await page.click('#addJumpBtn');
    await page.waitForTimeout(200);
    const st = await page.evaluate(() => ({
      focused: document.activeElement && document.activeElement.id,
      headTop: Math.round(document.getElementById('addFood').getBoundingClientRect().top),
      barBottom: Math.round(document.querySelector('.bar').getBoundingClientRect().bottom),
      atEnd: Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 1,
      entryVisible: (r => r.top >= 0 && r.bottom <= innerHeight)(document.getElementById('entry').getBoundingClientRect()),
    }));
    console.log(`${name}: after Add`, JSON.stringify(st));
    expectEqual(`${name}: entry focused`, st.focused, 'entry');
    // Add food lands at the top, unless the page ends first.
    if (st.headTop < 0 || (st.headTop > 120 && !st.atEnd)) throw new Error(`${name}: Add food should be near the top of the view, got ${st.headTop}`);
    if (!st.entryVisible) throw new Error(`${name}: the entry field should be on screen`);
    if (name === 'phone' && st.headTop < st.barBottom) throw new Error('phone: Add food hidden under the sticky bar');
    await page.screenshot({ path: path.join(OUT, `add-button-${name}.png`) });
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    await ctx.close();
  }
}

// The last day is not past date. The 18-item fixture plus a watermelon
// and a canned beer on their last day (0 days left, "today" on the decay
// line) and mushrooms past date: the crisper holds only what's below 0
// days (the fixture's spinach and the mushrooms), and its front, the
// headline and the decay line's past stub all agree on that; the two last-
// day items are on the eye-level shelf, one of them front and center;
// they're drawn visibly short of gone (decay at LAST_DAY_DECAY, not 1).
// The next day (?day=1) they've crossed: crisper, fully decayed.
const LAST_DAY_21 = [...MIXED_18, ['watermelon', 4], ['cannedbeer', 3, 3], ['mushroom', 12]];
async function lastDayScenario(browser) {
  console.log('\n--- LAST DAY: 0 days left is eye level, not the crisper ---');
  for (const [w, tag] of [[1280, 'desktop'], [390, 'phone']]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: 1000 } })).newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await seedMixed18(page, LAST_DAY_21);
    await page.waitForSelector('#headline');
    await page.waitForTimeout(1300);
    const st = await page.evaluate(() => {
      const where = it => { const el = document.querySelector(`#rfUnit [data-rf-item="${it.id}"]`); return el ? el.closest('[id]').id : null; };
      const byKey = k => fridge.find(it => it.key === k);
      const eye = [...document.querySelectorAll('#rfShelfEye .rf-item')];
      const row = document.getElementById('rfShelfEye').getBoundingClientRect(), mid = (row.left + row.right) / 2;
      const centre = eye.map(e => { const r = e.getBoundingClientRect(); return [Math.abs((r.left + r.right) / 2 - mid), +e.querySelector('[data-rf-item]').dataset.rfItem]; }).sort((a, b) => a[0] - b[0])[0][1];
      const svgOf = it => document.querySelector(`#rfUnit [data-rf-item="${it.id}"] svg`).outerHTML;
      const wm = byKey('watermelon');
      return {
        left: ['watermelon', 'cannedbeer', 'mushroom', 'spinach'].map(k => left(byKey(k))),
        place: ['watermelon', 'cannedbeer', 'mushroom', 'spinach'].map(k => where(byKey(k))),
        crisper: [...document.querySelectorAll('#rfCrisperItems [data-rf-item]')].map(b => food(fridge.find(i => i.id === +b.dataset.rfItem)).en).sort(),
        front: document.getElementById('rfCrisperLabel').textContent.replace(/\s+/g, ' ').trim(),
        headline: document.getElementById('headline').textContent.trim(),
        centre: food(fridge.find(i => i.id === centre)).en,
        decay: ['watermelon', 'cannedbeer', 'mushroom'].map(k => decayFraction(byKey(k), today())),
        drawnShort: svgOf(wm).includes(foodBodyColor(wm, LAST_DAY_DECAY)) && !svgOf(wm).includes(foodBodyColor(wm, 1)),
      };
    });
    console.log(`${tag}:`, JSON.stringify(st));
    expectEqual(`${tag}: days left`, st.left, [0, 0, -5, -2]);
    expectEqual(`${tag}: last day on the eye-level shelf, past date in the crisper`, st.place, ['rfShelfEye', 'rfShelfEye', 'rfCrisperItems', 'rfCrisperItems']);
    expectEqual(`${tag}: the crisper holds only past date`, st.crisper, ['Mushrooms', 'Spinach']);
    expectEqual(`${tag}: drawer front`, st.front, '2 past date · Toss all');
    if (!/^2 things are past date/.test(st.headline)) throw new Error(`${tag}: headline should count 2 past date, got "${st.headline}"`);
    if (!['Watermelon', 'Canned beer'].includes(st.centre)) throw new Error(`${tag}: a last-day item should be front and center, got ${st.centre}`);
    expectEqual(`${tag}: last day short of gone, past date gone`, st.decay, [0.75, 0.75, 1]);
    expectEqual(`${tag}: the watermelon is drawn at its last-day level`, st.drawnShort, true);
    await (await page.$('#rfUnit')).screenshot({ path: path.join(OUT, `last-day-${tag}.png`) });

    // The next day the date has passed: the crisper, fully decayed.
    await page.goto(`http://localhost:${PORT}/index.html?day=1`);
    await page.waitForSelector('#headline');
    const next = await page.evaluate(() => ['watermelon', 'cannedbeer'].map(k => {
      const it = fridge.find(i => i.key === k);
      return [left(it), document.querySelector(`#rfUnit [data-rf-item="${it.id}"]`).closest('[id]').id, decayFraction(it, today())];
    }));
    expectEqual(`${tag}: a day later they're past date`, next, [[-1, 'rfCrisperItems', 1], [-1, 'rfCrisperItems', 1]]);
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    await page.context().close();
  }
}

// Fridge and Kitchen: two panels in one snap-scrolled swipe area, tabs in
// sync both ways. The 18-item fixture plus bananas and an unripe avocado:
// what's kept out of the fridge (onion, bread, bananas) and the unripe
// avocado sit in the kitchen's bowl, not on the fridge shelves; the ripe
// avocado is in the fridge; tonight's dish is drawn on the cutting board,
// and counter food it uses (the onion) is on the board, not also in the
// bowl; the dish says what it saves; the Kitchen tab carries
// the count of counter items within 72 hours; All items still has all 20.
const KITCHEN_20 = [...MIXED_18, ['banana', 1], ['avocado', 0, null, null, null, { ripening: true }]];
async function kitchenScenario(browser) {
  console.log('\n--- KITCHEN: Fridge and Kitchen tabs, counter food, desktop and phone ---');
  for (const [tag, vp] of [['desktop', { width: 1280, height: 1000 }], ['phone', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await seedMixed18(page, KITCHEN_20);
    await page.waitForSelector('#headline');
    await page.waitForTimeout(1300); // the door's load animation
    const sel = () => page.$$eval('#roomTabs [role=tab]', ts => ts.map(t => t.getAttribute('aria-selected')));
    const tabText = () => page.$eval('#tabKitchen', t => t.textContent.trim());

    const st = await page.evaluate(() => {
      const tr = document.getElementById('roomsTrack'), cs = getComputedStyle(tr);
      const ids = sel => [...document.querySelectorAll(sel)].map(e => +(e.dataset.rfItem || e.dataset.boardItem));
      const name = id => food(fridge.find(i => i.id === id)).en + (fridge.find(i => i.id === id).ripening ? ' (not ripe)' : '');
      return {
        scrollLeft: tr.scrollLeft, snap: cs.scrollSnapType, overscroll: cs.overscrollBehaviorX,
        fridgeIds: ids('#rfUnit [data-rf-item]'), bowl: ids('#kcBowlItems [data-rf-item], #kcBowlBack [data-rf-item]').map(name),
        board: ids('#kcBoardItems [data-board-item]').map(name),
        saves: (document.querySelector('#tonight .dish-saves') || {}).textContent || '',
        allItems: +document.getElementById('fridgeCount').textContent,
        countColor: getComputedStyle(document.getElementById('kitchenCount')).color,
        crit: getComputedStyle(document.documentElement).getPropertyValue('--crit').trim(),
        touch: getComputedStyle(document.querySelector('.rf-fooditem')).touchAction,
        counterIds: fridge.filter(it => onCounter(it) && left(it) >= 0).map(it => it.id),
        headline: document.getElementById('headline').textContent,
        chartDots: fridge.length,
        trackH: tr.offsetHeight, fridgeH: document.getElementById('panelFridge').offsetHeight,
      };
    });
    console.log(`${tag}:`, JSON.stringify({ ...st, fridgeIds: st.fridgeIds.length }));
    expectEqual(`${tag}: opens on Fridge`, [await sel(), st.scrollLeft], [['true', 'false'], 0]);
    expectEqual(`${tag}: native snapping`, st.snap, 'x mandatory');
    expectEqual(`${tag}: no back/forward from the swipe`, st.overscroll, 'contain');
    expectEqual(`${tag}: food taps never swipe`, st.touch, 'pan-y');
    expectEqual(`${tag}: in the bowl`, st.bowl.slice().sort(), ['Avocados (not ripe)', 'Banana', 'Bread']);
    expectEqual(`${tag}: the onion is on the board, drawn once`, [st.board.includes('Onion'), st.bowl.includes('Onion')], [true, false]);
    expectEqual(`${tag}: the ripe avocado is in the fridge`, st.fridgeIds.includes(2), true);
    if (!/^Saves about \d+\.\d kg · \$\d+\.\d\d$/.test(st.saves)) throw new Error(`${tag}: "Saves about … kg · $…" under the dish name, got "${st.saves}"`);
    const onShelves = st.fridgeIds.filter(id => st.counterIds.includes(id));
    if (onShelves.length) throw new Error(`${tag}: counter food still on the fridge shelves: ${onShelves}`);
    expectEqual(`${tag}: board`, st.board[0] !== undefined, true);
    expectEqual(`${tag}: All items still counts everything`, st.allItems, 20);
    expectEqual(`${tag}: Kitchen tab`, await tabText(), 'Kitchen · 2');
    if (st.crit.toLowerCase() !== '#6e3448' || st.countColor !== 'rgb(110, 52, 72)') throw new Error(`${tag}: the count should be in --crit, got ${st.countColor}`);
    expectEqual(`${tag}: area height is the fridge's`, st.trackH, st.fridgeH);
    if (tag === 'phone') {
      const peek = await page.$eval('#panelKitchen', p => Math.round(innerWidth - p.getBoundingClientRect().left - 16));
      console.log('phone: kitchen panel showing at the right edge (px):', peek);
      if (peek < 12 || peek > 20) throw new Error(`phone: about 16px of Kitchen should peek, got ${peek}`);
      // what peeks is the counter's edge, not cut-off words
      const pk = await page.evaluate(() => ({
        counterAtEdge: Math.round(document.getElementById('kcUnit').getBoundingClientRect().left - document.getElementById('panelKitchen').getBoundingClientRect().left),
        textOpacity: getComputedStyle(document.querySelector('#panelKitchen .kc-captions')).opacity,
      }));
      expectEqual('phone: the peek shows the counter, no text', pk, { counterAtEdge: 0, textOpacity: '0' });
    }
    await page.screenshot({ path: path.join(OUT, `kitchen-${tag}-fridge.png`) });

    // A tab scrolls to its panel; the height follows.
    await page.click('#tabKitchen');
    await page.waitForTimeout(900);
    const k = await page.evaluate(() => ({
      left: document.getElementById('roomsTrack').scrollLeft,
      trackH: document.getElementById('roomsTrack').offsetHeight,
      kitchenH: document.getElementById('panelKitchen').offsetHeight,
      inView: Math.round(document.getElementById('kcUnit').getBoundingClientRect().left),
    }));
    console.log(`${tag}: after the Kitchen tab`, JSON.stringify(k));
    expectEqual(`${tag}: Kitchen selected`, await sel(), ['false', 'true']);
    if (k.left < 50) throw new Error(`${tag}: the Kitchen tab didn't scroll to its panel`);
    expectEqual(`${tag}: area height is the kitchen's`, k.trackH, k.kitchenH);
    if (k.inView < 0 || k.inView > vp.width / 2) throw new Error(`${tag}: kitchen counter not in view (left ${k.inView})`);
    await page.screenshot({ path: path.join(OUT, `kitchen-${tag}-kitchen.png`) });
    await page.screenshot({ path: path.join(OUT, `kitchen-${tag}-kitchen-full.png`), fullPage: true });

    // Arrow keys switch tabs, and move focus with them.
    await page.focus('#tabKitchen');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(900);
    expectEqual(`${tag}: ArrowLeft`, [await sel(), await page.evaluate(() => document.activeElement.id)], [['true', 'false'], 'tabFridge']);
    expectEqual(`${tag}: back at Fridge`, await page.$eval('#roomsTrack', t => t.scrollLeft), 0);

    // A swipe (the area scrolled directly) moves the underline.
    await page.$eval('#roomsTrack', t => t.scrollTo({ left: t.scrollWidth, behavior: 'instant' }));
    await page.waitForTimeout(300);
    expectEqual(`${tag}: swipe to Kitchen moves the underline`, await sel(), ['false', 'true']);
    await page.$eval('#roomsTrack', t => t.scrollTo({ left: 0, behavior: 'instant' }));
    await page.waitForTimeout(300);
    expectEqual(`${tag}: swipe back`, await sel(), ['true', 'false']);

    // Counter food opens the same popover.
    await page.click('#tabKitchen');
    await page.waitForTimeout(900);
    await page.click('#kcBowlItems [data-rf-item]');
    await page.waitForTimeout(100);
    if (await page.$eval('#rfPopover', p => p.hidden)) throw new Error(`${tag}: tapping bowl food should open the popover`);
    expectEqual(`${tag}: popover doesn't pull back to Fridge`, await sel(), ['false', 'true']);
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    await ctx.close();
  }

  // Reduced motion: the tab switches without the smooth scroll.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await seedMixed18(page, KITCHEN_20);
  await page.waitForSelector('#headline');
  const jump = await page.evaluate(() => {
    const tr = document.getElementById('roomsTrack');
    document.getElementById('tabKitchen').click();
    return tr.scrollLeft;
  });
  console.log('reduced motion: scrollLeft right after the click', jump);
  if (jump < 50) throw new Error('with reduced motion the switch should be immediate, not a smooth scroll');
  await ctx.close();
}

// The Fridge panel's layout, at every size: each panel the swipe area's
// width (less the 16px peek on a phone); on desktop two top-aligned columns, the fridge about 60% (never
// stretched, the whole of it inside the window, even on a short laptop
// screen) and the Add column beside it; on a phone the Add column under
// the fridge, the Tonight line between them. Usuals: six, "+N more" with
// the real count, expanding in short rows inside the column (Edit only
// there), collapsing again, remembered on reload -- and still working when
// storage throws. The Tonight line opens Kitchen; the fridge items the
// dish uses are outlined; with no dish, no line. The top bar's Add
// switches back to Fridge and focuses the field.
async function panelsScenario(browser) {
  console.log('\n--- PANELS: the Fridge panel\'s columns, usuals, Tonight line, top bar Add ---');
  const geo = () => {
    const r = el => (typeof el === 'string' ? document.querySelector(el) : el).getBoundingClientRect();
    const u = r('#rfUnit'), door = r('#rfDoor'), add = r('#addFood'), stage = r('#rf .rf-stage'), panel = r('#panelFridge');
    const bag = r('#addFood .bag-body');
    return {
      fridge: [Math.round(u.top), Math.round(u.bottom), Math.round(Math.max(u.right, door.right))],
      inWindow: u.top >= 0 && u.bottom <= innerHeight,
      ratio: +(u.width / u.height).toFixed(3),
      rfShare: +(r('#rf').width / panel.width).toFixed(2),
      // a phone keeps its 16px peek of the other panel
      panelIsArea: Math.round(panel.width) === document.getElementById('roomsTrack').clientWidth - (innerWidth <= 720 ? 16 : 0),
      add: [Math.round(add.top), Math.round(add.left), Math.round(add.bottom)],
      bag: [Math.round(bag.top), Math.round(bag.left), Math.round(bag.bottom)],
      bagShare: +(add.width / panel.width).toFixed(2),
      stageTop: Math.round(stage.top),
      tonight: (t => [Math.round(t.top), Math.round(t.bottom)])(r('#tonightLine')),
    };
  };
  for (const vp of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1280, height: 680 }, { width: 390, height: 844 }]) {
    const tag = `${vp.width}x${vp.height}`, phone = vp.width < 720;
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await seedMixed18(page, KITCHEN_20);
    await page.evaluate(() => localStorage.removeItem('perishable.usualsOpen'));
    await page.reload();
    await page.waitForSelector('#headline');
    await page.waitForTimeout(1300);
    const g = await page.evaluate(geo);
    console.log(`${tag}:`, JSON.stringify(g));
    expectEqual(`${tag}: each panel is the swipe area's width`, g.panelIsArea, true);
    expectEqual(`${tag}: the fridge keeps its aspect ratio`, g.ratio, +(360 / 640).toFixed(3));
    if (!phone) {
      expectEqual(`${tag}: the whole fridge is inside the window`, g.inWindow, true);
      const tall = (g.fridge[1] - g.fridge[0]) / vp.height;
      if (tall > 0.9 + 1 / vp.height) throw new Error(`${tag}: the fridge is taller than 90% of the window`);
      // Over 80% where the height binds (1280 x 800: 0.86); at 1440 x 900
      // the width binds instead -- the fully open door takes 1.86 x the
      // unit beside the bag in the page's width -- so the fridge is 76%.
      if (tall < 0.75) throw new Error(`${tag}: the fridge should be at least 75% of the window, got ${tall.toFixed(2)}`);
      if (g.bagShare > 0.36) throw new Error(`${tag}: the bag column should be narrower than the old Add column (about 37%), got ${g.bagShare}`);
      if (g.bag[1] < g.fridge[2]) throw new Error(`${tag}: the bag should stand beside the fridge, right of its door`);
      if (Math.abs(g.bag[2] - g.fridge[1]) > 2) throw new Error(`${tag}: the bag should stand on the fridge's floor line: ${g.bag[2]} vs ${g.fridge[1]}`);
      if (g.tonight[0] < g.bag[2]) throw new Error(`${tag}: the Tonight line should be under the bag`);
    } else {
      if (g.add[0] < g.fridge[1]) throw new Error(`${tag}: the bag should be under the fridge`);
      if (g.tonight[0] < g.bag[2]) throw new Error(`${tag}: the Tonight line should sit under the bag: ${JSON.stringify(g)}`);
    }

    // Usuals: six, then "+N more" with the real count.
    const usuals = () => page.evaluate(() => {
      const box = document.getElementById('addFood'), col = box.getBoundingClientRect(), heap = document.getElementById('restockMore');
      const chips = [...box.querySelectorAll('[data-restock]')];
      const more = document.getElementById('usualsMore');
      return {
        chips: chips.length, total: Object.keys(standing).length,
        more: more && more.textContent, expanded: more && more.getAttribute('aria-expanded'),
        edit: !document.getElementById('restockEdit').hidden,
        inside: chips.every(c => { const r = c.getBoundingClientRect(); return r.left >= col.left && r.right <= col.right; }),
        sideways: heap.scrollWidth > heap.clientWidth,
        rows: new Set(chips.map(c => Math.round(c.getBoundingClientRect().top))).size,
      };
    });
    let u = await usuals();
    expectEqual(`${tag}: six usuals and the rest behind +N more`, [u.chips, u.more, u.expanded, u.edit], [6, `+${u.total - 6} more`, 'false', false]);
    await page.click('#usualsMore');
    u = await usuals();
    console.log(`${tag}: usuals open`, JSON.stringify(u));
    expectEqual(`${tag}: expanded, Edit inside it`, [u.chips, u.more, u.expanded, u.edit], [u.total, 'Show fewer', 'true', true]);
    expectEqual(`${tag}: the rest open as drawings inside the column, never sideways`, [u.inside, u.sideways, u.rows > 1], [true, false, true]);
    if (!phone) await page.screenshot({ path: path.join(OUT, `panels-${vp.width}-usuals-open.png`) });
    await page.reload();
    await page.waitForSelector('#headline');
    expectEqual(`${tag}: remembered open`, (await usuals()).chips, u.total);
    await page.click('#usualsMore');
    u = await usuals();
    expectEqual(`${tag}: collapsed again`, [u.chips, u.expanded, u.edit], [6, 'false', false]);
    await page.reload();
    await page.waitForSelector('#headline');
    expectEqual(`${tag}: remembered closed`, (await usuals()).chips, 6);
    // storage that throws: the toggle still works, no error
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('quota'); }; });
    await page.click('#usualsMore');
    expectEqual(`${tag}: toggles with storage failing`, (await usuals()).chips, u.total);
    await page.click('#usualsMore');

    // The line under the bag (the suite's clock says Dinner), and the
    // outline on what the dish uses.
    const t = await page.evaluate(() => ({
      line: document.getElementById('tonightLine').textContent.replace(/\s+/g, ' ').trim(),
      dish: document.querySelector('#tonight h2').textContent.trim(),
      outlined: [...document.querySelectorAll('#rfUnit .rf-tonight')].map(b => +b.dataset.rfItem).sort(),
      uses: nextMealItems.filter(it => document.querySelector(`#rfUnit [data-rf-item="${it.id}"]`)).map(it => it.id).sort(),
      shown: [...document.querySelectorAll('#rfUnit .rf-tn')].filter(g => getComputedStyle(g).display !== 'none').length,
    }));
    console.log(`${tag}: tonight`, JSON.stringify(t));
    expectEqual(`${tag}: the line names Dinner`, t.line, `Dinner:${t.dish} →`);
    if (!t.uses.length) throw new Error(`${tag}: the fixture's dish should use something in the fridge`);
    expectEqual(`${tag}: the fridge items the dish uses are marked`, t.outlined, t.uses);
    expectEqual(`${tag}: no outline shown by default`, t.shown, 0);
    await page.click('#tonightLine');
    await page.waitForTimeout(900);
    const k = await page.evaluate(() => [[...document.querySelectorAll('#roomTabs [role=tab]')].map(x => x.getAttribute('aria-selected')), document.getElementById('roomsTrack').scrollLeft > 50]);
    expectEqual(`${tag}: the Tonight line opens Kitchen`, k, [['false', 'true'], true]);
    await page.screenshot({ path: path.join(OUT, `panels-${tag}-kitchen.png`) });

    // From Kitchen, the top bar's Add: back to Fridge, the field focused.
    await page.click('#addJumpBtn');
    await page.waitForTimeout(900);
    const a = await page.evaluate(() => ({
      sel: [...document.querySelectorAll('#roomTabs [role=tab]')].map(x => x.getAttribute('aria-selected')),
      left: document.getElementById('roomsTrack').scrollLeft, focused: document.activeElement.id,
      visible: (r => r.top >= 0 && r.bottom <= innerHeight)(document.getElementById('entry').getBoundingClientRect()),
    }));
    expectEqual(`${tag}: top bar Add switches to Fridge and focuses the field`, a, { sel: ['true', 'false'], left: 0, focused: 'entry', visible: true });
    await page.evaluate(() => { document.activeElement.blur(); scrollTo(0, 0); });
    await page.screenshot({ path: path.join(OUT, `panels-${tag}-fridge.png`) });
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    await ctx.close();
  }
  // With no dish there's no Tonight line.
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await seedMixed18(page, [['beets', 0], ['carrot', 0]]);
  await page.waitForSelector('#headline');
  const none = await page.evaluate(() => [nextMealDish, document.getElementById('tonightLine').hidden, document.querySelectorAll('.rf-tonight').length]);
  expectEqual('no dish, no Tonight line, nothing outlined', none, [null, true, 0]);
  await page.context().close();
}

// Used some: a popover action beside Used and Tossed. The item stays,
// half its weight to the used ledger and half its price off it; drawn cut
// and wrapped (whole food) or opened (packages), and a cut counter food
// (onion, melon) moves into the fridge. FoodKeeper's after-opening figure,
// where there is one, restarts its clock today (hard cheese #3, 28 days;
// jam #347, 360); otherwise the date stays (onion, milk's printed date).
// Undo puts the record and the ledger back; a second Used some halves
// again; a toss loses only what was left. Persists across a reload.
async function usedSomeScenario(browser) {
  console.log('\n--- USED SOME: half to the ledger, drawn cut and wrapped or opened, FoodKeeper after-opening clock, Undo ---');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#headline');
  const ids = await page.evaluate(() => {
    const t = today(), out = {};
    const add = (key, age, o = {}) => { const it = {id: ++uid, key, bought: t - age, custom: null, ...o}; fridge.push(it); out[key] = it.id; };
    add('onion', 5); add('avocado', 1); add('milk', 2, {shelf: 9, shelfFrom: 'date'}); add('jam', 20);
    add('hardcheese', 30); add('watermelon', 1); add('ketchup', 10, {opened: true});
    render();
    return out;
  });
  await page.waitForTimeout(400);
  const rec = key => page.evaluate(id => { const it = fridge.find(i => i.id === id); return it && {...it, g: food(it).g, usd: food(it).usd, exp: expiryOf(it),
    counter: onCounter(it), inFridge: !!document.querySelector(`#rfUnit [data-rf-item="${id}"]`),
    film: !!document.querySelector(`[data-rf-item="${id}"] .rf-film`), svg: (document.querySelector(`[data-rf-item="${id}"] svg`) || {}).outerHTML || ''}; }, ids[key]);
  const ledger = () => page.evaluate(() => ({...ledger}));
  const useSomeOf = async key => {
    await page.$eval(`[data-rf-item="${ids[key]}"]`, el => el.click());
    const acts = await page.$$eval('#rfPopover .rf-pop-acts button', bs => bs.map(b => b.textContent.trim()));
    expectEqual(`${key}: Used some sits between Used and Tossed`, acts.slice(0, 3), ['Used', 'Used some', 'Tossed']);
    await page.click('#rfPopover .rf-pop-some');
    await page.waitForTimeout(150);
    return page.textContent('#toast');
  };
  const t = await page.evaluate(() => today());

  // Onion: no after-cutting figure, so its date stays; out of the bowl
  // into the fridge, cut and wrapped.
  const on0 = await rec('onion'), l0 = await ledger();
  expectEqual('a whole onion is in the bowl', [on0.counter, on0.inFridge], [true, false]);
  let toast = await useSomeOf('onion');
  const on1 = await rec('onion'), l1 = await ledger();
  console.log(JSON.stringify({toast, part: on1.part, g: on1.g, usd: on1.usd, savedG: l1.savedG - l0.savedG}));
  if (!/^Used some Onion · about 75 g/.test(toast) || /now that/.test(toast) || !/Undo/.test(toast)) throw new Error('onion toast: ' + toast);
  expectEqual('onion: half left, half its weight used', [on1.part, on1.g, Math.round(on1.usd * 100), l1.savedG - l0.savedG, l1.wasteG], [0.5, 75, 40, 75, 0]);
  expectEqual('onion: date unchanged, not opened', [on1.exp, !!on1.opened, on1.clockFrom], [on0.exp, false, undefined]);
  expectEqual('onion: into the fridge, wrapped', [on1.counter, on1.inFridge, on1.film], [false, true, true]);

  // Hard cheese: FoodKeeper #3 gives 28 days after opening; restarts today,
  // and its rot carries on (decayFrom), it doesn't go back to fresh.
  const ch0 = await rec('hardcheese');
  toast = await useSomeOf('hardcheese');
  const ch1 = await rec('hardcheese');
  const src = await page.evaluate(id => shelfSourceOf(fridge.find(i => i.id === id)), ids.hardcheese);
  console.log(JSON.stringify({toast, exp: ch1.exp - t, src, decayFrom: ch1.decayFrom}));
  if (!/28 days now that it's cut/.test(toast)) throw new Error('cheese toast: ' + toast);
  expectEqual('cheese: 28 days from today, cut and wrapped', [ch1.exp - t, ch1.opened, ch1.clockFrom === t, ch1.film], [28, true, true, true]);
  if (!/^cut .*FoodKeeper #3, 28 days after opening/.test(src)) throw new Error('cheese source: ' + src);
  if (!(ch1.decayFrom > 0)) throw new Error('cheese should keep the decay it had');

  // Milk: a package, so opened (the carton's spout), never wrapped; no
  // after-opening figure for #27, so the printed date stands.
  const mk0 = await rec('milk');
  toast = await useSomeOf('milk');
  const mk1 = await rec('milk');
  expectEqual('milk: printed date kept, half left, opened not wrapped', [mk1.exp, mk1.shelf, mk1.part, mk1.film, /now that/.test(toast)], [mk0.exp, 9, 0.5, false, false]);

  // Jam, unopened (pantry figure): opened now, 360 days from today, its
  // lid ajar; then Undo puts it all back.
  const jm0 = await rec('jam'), lj = await ledger();
  toast = await useSomeOf('jam');
  const jm1 = await rec('jam');
  if (!/360 days now that it's open/.test(toast)) throw new Error('jam toast: ' + toast);
  expectEqual('jam: opened, 360 days, drawn open, no wrap', [jm1.opened, jm1.exp - t, /rotate\(-16/.test(jm1.svg), jm1.film], [true, 360, true, false]);
  await page.click('#toast .toast-undo');
  await page.waitForTimeout(150);
  const jm2 = await rec('jam');
  expectEqual('Undo: the jam as it was', [jm2.opened, jm2.part, jm2.exp, jm2.clockFrom], [jm0.opened, jm0.part, jm0.exp, jm0.clockFrom]);
  expectEqual('Undo: the ledger as it was', await ledger(), lj);

  // Watermelon from the bowl: a wedge, in the fridge.
  await useSomeOf('watermelon');
  const wm = await rec('watermelon');
  expectEqual('watermelon: into the fridge, wrapped', [wm.counter, wm.inFridge, wm.film], [false, true, true]);
  // Avocado, ripe in the fridge: cut, pit showing, wrapped; date stays.
  const av0 = await rec('avocado');
  await useSomeOf('avocado');
  const av1 = await rec('avocado');
  expectEqual('avocado: date unchanged, wrapped', [av1.exp, av1.film], [av0.exp, true]);
  // Ketchup already open: its clock doesn't move again.
  const kt0 = await rec('ketchup');
  toast = await useSomeOf('ketchup');
  const kt1 = await rec('ketchup');
  expectEqual('ketchup, already open: date unchanged', [kt1.exp, /now that/.test(toast)], [kt0.exp, false]);
  await page.screenshot({ path: path.join(OUT, 'used-some-fridge.png') });

  // Onion again: a quarter left; then Tossed loses only that quarter.
  const l2 = await ledger();
  await useSomeOf('onion');
  const on2 = await rec('onion'), l3 = await ledger();
  expectEqual('onion again: a quarter left', [on2.part, on2.g, l3.savedG - l2.savedG], [0.25, 37.5, 37.5]);
  await page.$eval(`[data-rf-item="${ids.onion}"]`, el => el.click());
  await page.click('#rfPopover .rf-pop-tossed');
  await page.waitForTimeout(150);
  const l4 = await ledger();
  expectEqual('Tossed: only the quarter left is waste', [l4.wasteG - l3.wasteG, Math.round((l4.wasteUSD - l3.wasteUSD) * 100)], [37.5, 20]);

  // Saved: a reload keeps what's left and how it's drawn.
  await page.reload();
  await page.waitForSelector('#headline');
  await page.waitForTimeout(400);
  const after = await rec('hardcheese');
  expectEqual('reload keeps it', [after.part, after.exp - t, after.film], [0.5, 28, true]);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await ctx.close();

  // Phone: the action is a 44px tap target like its neighbours.
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const pp = await pctx.newPage();
  await pp.goto(`http://localhost:${PORT}/index.html`);
  await pp.evaluate(() => localStorage.clear());
  await pp.reload();
  await pp.waitForSelector('#headline');
  const pid = await pp.evaluate(() => { const it = {id: ++uid, key: 'avocado', bought: today(), custom: null}; fridge.push(it); render(); return it.id; });
  await pp.waitForTimeout(300);
  await pp.$eval(`[data-rf-item="${pid}"]`, el => el.click());
  const hgt = await pp.$eval('#rfPopover .rf-pop-some', b => b.getBoundingClientRect().height);
  if (hgt < 44) throw new Error('Used some on a phone is ' + hgt + 'px tall');
  await pctx.close();
}

// Tonight's outline: nothing by default. While the Tonight line is
// hovered or focused, a dashed ink line around exactly the fridge items
// the dish uses -- wherever they stand, door bins included (the egg
// carton in a bin once had no outline: the old traced-ring filter didn't
// paint on the door's turned face) -- and around the whole carton, not
// just the eggs. Off again when it leaves; no outline on a phone.
async function tonightOutlineScenario(browser) {
  console.log('\n--- TONIGHT OUTLINE: dashed, only while the line is hovered or focused ---');
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const phone = vp.width < 720;
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://localhost:${PORT}/index.html`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#headline');
    await page.evaluate(() => {
      const t = today(), add = (key, age) => fridge.push({id: ++uid, key, bought: t - age, custom: null});
      add('ketchup', 0); add('milk', 0); add('tomato', 5); add('egg', 30); add('scallion', 5); add('spinach', 1); add('carrot', 2);
      render();
    });
    await page.waitForTimeout(500);
    const shown = () => page.evaluate(() => [...document.querySelectorAll('#rfUnit .rf-tn')]
      .filter(g => getComputedStyle(g).display !== 'none').map(g => fridge.find(i => i.id === +g.closest('[data-rf-item]').dataset.rfItem).key).sort());
    const st = await page.evaluate(() => ({dish: nextMealDish && nextMealDish.name, uses: nextMealItems.map(i => i.key).sort(),
      eggWhere: (e => e.closest('[id^="rfDoorBin"], #rfShelfEye, #rfShelfUpper').id)(document.querySelector(`[data-rf-item="${fridge.find(i => i.key === 'egg').id}"]`)),
      dashed: (g => g && g.querySelector('path[stroke-dasharray]') && g.querySelectorAll('path[stroke-dasharray]').length)(document.querySelector(`[data-rf-item="${fridge.find(i => i.key === 'egg').id}"] .rf-tn`))}));
    console.log(JSON.stringify(st));
    expectEqual('tonight', [st.dish, st.uses], ['Tomato egg stir-fry', ['egg', 'scallion', 'tomato']]);
    if (!phone) expectEqual('the eggs are in a door bin', /^rfDoorBin/.test(st.eggWhere), true);
    expectEqual('the eggs are traced with their carton (eggs, lid, cups)', st.dashed, 3);
    expectEqual('nothing outlined by default', await shown(), []);
    await page.hover('#tonightLine');
    await page.waitForTimeout(80);
    expectEqual(`hovered (${phone ? 'phone' : 'desktop'})`, await shown(), phone ? [] : ['egg', 'scallion', 'tomato']);
    if (!phone) await page.screenshot({ path: path.join(OUT, 'tonight-hover.png') });
    await page.mouse.move(2, 2);
    await page.waitForTimeout(80);
    expectEqual('off when the pointer leaves', await shown(), []);
    await page.focus('#tonightLine');
    await page.waitForTimeout(80);
    expectEqual('focused', await shown(), phone ? [] : ['egg', 'scallion', 'tomato']);
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(80);
    expectEqual('off when focus leaves', await shown(), []);
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    await ctx.close();
  }
}

// The page in three parts -- Fridge / Kitchen (Add food inside the Fridge
// panel), What's turning, So far -- each titled in Caslonian (the tabs
// are the first part's title; Add food's own heading too), never in the
// mono caps that label data. What's turning and So far are outside the
// swipe area. Food names keep their
// own capitals in labels: "Chinese broccoli", never "chinese broccoli".
async function pageStructureScenario(browser) {
  console.log('\n--- PAGE: three parts in order, the bag in the Fridge panel, no voice entry, titles in Caslonian, food names capitalized ---');
  const items = [...KITCHEN_20, ['gailan', 2]];
  for (const [tag, vp] of [['desktop', { width: 1280, height: 1000 }], ['phone', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await seedMixed18(page, items);
    await page.waitForSelector('#headline');
    await page.waitForTimeout(1300);
    const st = await page.evaluate(() => {
      const parts = [...document.querySelectorAll('.wrap > .part')];
      const titleOf = p => p.querySelector('.part-title') || p.querySelector('[role=tab]');
      const track = document.getElementById('roomsTrack');
      return {
        titles: parts.map(p => titleOf(p).textContent.trim()),
        fonts: parts.map(titleOf).map(t => { const cs = getComputedStyle(t); return [cs.fontFamily.split(',')[0].replace(/['"]/g, ''), cs.fontSize, cs.textTransform]; }),
        addTitle: !!document.getElementById('addTitle') || !!document.querySelector('#addFood h2, #addFood h3') || /Add food/.test(document.getElementById('addFood').textContent),
        addInFridge: !!document.querySelector('#panelFridge #addFood'),
        outside: ['headline', 'chart', 'wasteG', 'allItems'].map(id => track.contains(document.getElementById(id))),
        gaps: parts.slice(1).map((p, i) => Math.round(p.getBoundingClientRect().top - parts[i].getBoundingClientRect().bottom)),
        scanTop: (r => r.firstElementChild.firstElementChild.id)(document.getElementById('receipt')),
        entryInAdd: !!document.querySelector('#addFood #entry') && !!document.querySelector('#addFood #restock'),
        chart: document.getElementById('chart').textContent,
        speak: !!document.getElementById('voicebtn') || [...document.querySelectorAll('button')].some(b => /speak/i.test(b.textContent)),
        hint: !!document.querySelector('#addFood .hint') || /Type a list|joins your usuals/.test(document.getElementById('addFood').textContent),
        placeholder: document.getElementById('entry').placeholder,
        buttons: [document.getElementById('scanReceiptBtn'), document.getElementById('addbtn')].map(b => b.textContent.trim()),
        topAdd: document.getElementById('addJumpBtn').textContent.trim(),
      };
    });
    console.log(`${tag}:`, JSON.stringify({ ...st, chart: undefined }));
    expectEqual(`${tag}: three parts`, st.titles.map(t => t.replace(/ · \d+$/, '')), ['Fridge', "What's turning", 'So far']);
    expectEqual(`${tag}: the bag in the Fridge panel, no "Add food" heading`, [st.addTitle, st.addInFridge], [false, true]);
    expectEqual(`${tag}: What's turning, So far and All items outside the swipe area`, st.outside, [false, false, false, false]);
    expectEqual(`${tag}: no Speak button`, st.speak, false);
    expectEqual(`${tag}: no hint under the entry field`, st.hint, false);
    expectEqual(`${tag}: placeholder`, st.placeholder, 'what did you buy?');
    expectEqual(`${tag}: Scan receipt and Put away; the top bar keeps Add`, [st.buttons, st.topAdd], [['Scan receipt', 'Put away'], 'Add']);
    expectEqual(`${tag}: Scan receipt is the receipt's top line`, st.scanTop, 'scanReceiptBtn');
    for (const [fam, size, tt] of st.fonts) {
      if (fam !== 'caslonian-std-l' || tt !== 'none' || parseFloat(size) < 19) throw new Error(`${tag}: a part title is ${fam} ${size} ${tt}`);
    }
    if (st.gaps.some(g => g < 50)) throw new Error(`${tag}: parts should sit well apart, got ${st.gaps}`);
    expectEqual(`${tag}: usuals and the receipt in the bag`, st.entryInAdd, true);
    // (a phone shortens a crowded day to "+N", so the full names are checked on desktop)
    if (tag === 'desktop' && !/Chinese broccoli/.test(st.chart) || /chinese broccoli/.test(st.chart)) throw new Error(`${tag}: decay line should say "Chinese broccoli": ${st.chart}`);
    // The top bar's Add still lands on the bag, cursor on the receipt.
    await page.click('#addJumpBtn');
    await page.waitForTimeout(900);
    const jump = await page.evaluate(() => ({
      focused: document.activeElement && document.activeElement.id,
      top: Math.round(document.getElementById('addFood').getBoundingClientRect().top),
    }));
    expectEqual(`${tag}: top bar Add focuses the entry field`, jump.focused, 'entry');
    if (jump.top < 0 || jump.top > 120) throw new Error(`${tag}: top bar Add should scroll the bag to the top, got ${jump.top}`);
    // "2d" after an item still dates it two days back.
    await page.fill('#entry', 'spinach 2d');
    await page.click('#addbtn');
    await page.waitForTimeout(200);
    if (await page.$('#receiptLines .receipt-row')) await page.click('#addbtn');
    await page.waitForTimeout(200);
    const ages = await page.evaluate(() => fridge.filter(it => it.key === 'spinach').map(it => today() - it.bought));
    if (!ages.includes(2)) throw new Error(`${tag}: "spinach 2d" should be bought two days ago, got ages ${ages}`);
    await page.screenshot({ path: path.join(OUT, `page-${tag}.png`), fullPage: true });
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    await ctx.close();
  }
}


/* ---------- the grocery bag: entry through the receipt, usuals, Put away ---------- */

// Where a record landed: the freezer, the fridge (shelves, crisper or door
// bins), or the kitchen's bowl -- read from the drawings, not the data.
function placeOf(id) {
  const el = document.querySelector(`#rfUnit [data-rf-item="${id}"], #kcUnit [data-rf-item="${id}"]`);
  if (!el) return 'nowhere';
  if (el.closest('#rfFzShelf')) return 'freezer';
  if (el.closest('#kcBowlItems, #kcBowlBack')) return 'bowl';
  if (el.closest('#kcCounterBack')) return 'counter';
  if (el.closest('#rfUnit')) return 'fridge';
  return 'elsewhere';
}
const receiptRows = page => page.$$eval('#receiptLines .receipt-row', els => els.map(el => ({
  name: el.querySelector('.receipt-name').value,
  days: el.querySelector('.rl-days').textContent.trim(),
  void: el.classList.contains('void'),
})));

// Typed names print as receipt lines (Enter), a usual tapped in the bag
// prints too, and nothing reaches the fridge until Put away. Each line
// says on the right what it keeps, or the question it needs answered;
// Put away waits for a date. Then every item lands where it belongs --
// fridge, freezer, kitchen bowl -- flying from the bag one after another,
// and one Undo takes the whole batch back, lines onto the receipt.
async function putAwayScenario(browser) {
  console.log('\n--- PUT AWAY: the receipt, a usual, every item to its place, one Undo ---');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await seedMixed18(page, KITCHEN_20);
  await page.waitForSelector('#headline');
  await page.waitForTimeout(1300);
  const snap = () => page.evaluate(() => JSON.stringify({fridge, standing}));
  const before = await snap();
  const n0 = await page.evaluate(() => fridge.length);

  // typed: Enter prints, the field empties, nothing is put away yet
  await page.fill('#entry', 'spinach, milk');
  await page.press('#entry', 'Enter');
  await page.waitForTimeout(80);
  let rows = await receiptRows(page);
  console.log('after Enter:', JSON.stringify(rows));
  expectEqual('two lines printed', rows.map(r => r.name), ['Spinach', 'Milk']);
  expectEqual('the field is the next line, empty', await page.inputValue('#entry'), '');
  if (!/^\d+ days?$/.test(rows[0].days)) throw new Error('spinach should say the days it keeps: ' + rows[0].days);
  expectEqual('milk asks for its date', rows[1].days, 'date?');
  expectEqual('nothing in the fridge yet', await page.evaluate(() => fridge.length), n0);
  expectEqual('Put away waits for the date', await page.$eval('#addbtn', b => [b.disabled, b.textContent]), [true, 'Put away']);
  if (!/needs a date/.test(await page.textContent('#putAwayNote'))) throw new Error('the bag should say what Put away waits for');
  await page.screenshot({ path: path.join(OUT, 'putaway-receipt-asks.png') });

  // a usual: its drawing in the bag, tapped, prints a line
  const usual = await page.$eval('#restock [data-restock]', b => ({key: b.dataset.restock, label: b.querySelector('.usual-name').textContent, svg: !!b.querySelector('svg path')}));
  if (!usual.svg) throw new Error('a usual should be its food drawing');
  await page.click(`#restock [data-restock="${usual.key}"]`);
  await page.waitForTimeout(80);
  rows = await receiptRows(page);
  expectEqual('the usual prints on the receipt', rows[2].name, usual.label);
  expectEqual('still nothing in the fridge', await page.evaluate(() => fridge.length), n0);

  // more typed into the field, Put away: printed, but milk still waits
  await page.fill('#entry', 'frozen shrimp, potatoes');
  await page.click('#addbtn');
  await page.waitForTimeout(80);
  rows = await receiptRows(page);
  expectEqual('Put away prints the field first', rows.map(r => r.name).slice(3), ['Shrimp', 'Potato']);
  expectEqual('nothing put away while milk asks', await page.evaluate(() => fridge.length), n0);
  if (!/^frozen · \d+ days$/.test(rows[3].days)) throw new Error('frozen shrimp should say its freezer days: ' + rows[3].days);
  const iso = await isoIn(page, 6);
  await page.fill('#receiptLines .entry-date[data-idx="1"]', iso);
  await page.dispatchEvent('#receiptLines .entry-date[data-idx="1"]', 'change');
  await page.waitForTimeout(50);
  rows = await receiptRows(page);
  expectEqual('milk keeps to its printed date', rows[1].days, '6 days');
  await page.screenshot({ path: path.join(OUT, 'putaway-receipt-five.png') });

  // Put away: every record in at once, each flying in turn
  const ids0 = await page.evaluate(() => fridge.map(it => it.id));
  await page.click('#addbtn');
  await page.waitForTimeout(260);
  const mid = await page.evaluate(() => ({
    flying: document.querySelectorAll('.bag-flying').length,
    hidden: [...document.querySelectorAll('#rfUnit .rf-foodshape')].filter(s => s.style.visibility === 'hidden').length,
  }));
  await page.screenshot({ path: path.join(OUT, 'putaway-mid-flight.png') });
  console.log('mid-flight:', JSON.stringify(mid));
  if (!mid.flying || !mid.hidden) throw new Error('mid-flight, items should be in the air and their places still empty: ' + JSON.stringify(mid));
  // placeOf runs in the page
  const where = await page.evaluate(`(() => { ${placeOf.toString()}; const ids0 = ${JSON.stringify(ids0)};
    return fridge.filter(it => !ids0.includes(it.id) || it.bought === today() && it.key === ${JSON.stringify(usual.key)})
      .map(it => [food(it).en, placeOf(it.id), !!it.frozen]); })()`);
  console.log('landed:', JSON.stringify(where));
  const placeFor = name => (where.find(w => w[0] === name) || [])[1];
  expectEqual('spinach and milk in the fridge', [placeFor('Spinach'), placeFor('Milk')], ['fridge', 'fridge']);
  expectEqual('frozen shrimp in the freezer', [placeFor('Shrimp'), (where.find(w => w[0] === 'Shrimp') || [])[2]], ['freezer', true]);
  expectEqual('potatoes in the kitchen bowl', placeFor('Potato'), 'bowl');
  if (!where.some(w => w[0] === usual.label)) throw new Error('the usual should be put away too');
  expectEqual('the receipt is empty', (await receiptRows(page)).length, 0);
  expectEqual('the freezer opened for the shrimp', await page.$eval('#rfUnit', u => u.classList.contains('fz-open')), true);
  const t = await page.textContent('#toast');
  if (!/^\d+ put away/.test(t) || !/Undo/.test(t)) throw new Error('one toast with Undo for the batch: ' + t);
  await page.waitForTimeout(2200);
  const after = await page.evaluate(() => ({
    flying: document.querySelectorAll('.bag-flying').length,
    hidden: [...document.querySelectorAll('.rf-foodshape')].filter(s => s.style.visibility === 'hidden').length,
  }));
  expectEqual('every flight has landed', after, {flying: 0, hidden: 0});

  // one Undo: the whole batch out, the usual's record as it was, the
  // lines back on the receipt
  await page.click('#toast .toast-undo');
  await page.waitForTimeout(100);
  expectEqual('Undo takes the whole batch back', await snap(), before);
  expectEqual('Undo puts the lines back on the receipt', (await receiptRows(page)).map(r => r.name),
    ['Spinach', 'Milk', usual.label, 'Shrimp', 'Potato']);
  // and they can go again
  await page.click('#addbtn');
  await page.waitForTimeout(100);
  // five records: the usual is a new one beside the one already there,
  // never a refresh of it
  expectEqual('put away again', await page.evaluate(n => fridge.length - n, n0), 5);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await ctx.close();
}

// Reduced motion: Put away puts everything in place with no flight.
async function putAwayReducedMotionScenario(browser) {
  console.log('\n--- PUT AWAY: reduced motion skips the flight ---');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await seedMixed18(page, KITCHEN_20);
  await page.waitForSelector('#headline');
  const n0 = await page.evaluate(() => fridge.length);
  await page.fill('#entry', 'spinach, carrots, frozen shrimp');
  await page.click('#addbtn');
  const seen = await page.evaluate(() => new Promise(res => {
    let flying = 0, hidden = 0, n = 0;
    const tick = () => {
      flying = Math.max(flying, document.querySelectorAll('.bag-flying').length);
      hidden = Math.max(hidden, [...document.querySelectorAll('.rf-foodshape')].filter(s => s.style.visibility === 'hidden').length);
      if (++n < 30) requestAnimationFrame(tick); else res({flying, hidden});
    };
    tick();
  }));
  expectEqual('no flight, nothing hidden', seen, {flying: 0, hidden: 0});
  expectEqual('all three put away, the receipt empty', await page.evaluate(n => [fridge.length - n, pendingItems.length], n0), [3, 0]);
  await ctx.close();
}

// Phone: the bag stands under the fridge, the receipt rises out of it;
// usuals, the receipt's field, its × and Put away are 44px tap targets.
async function bagPhoneScenario(browser) {
  console.log('\n--- PUT AWAY: the bag on a phone ---');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await seedMixed18(page, KITCHEN_20);
  await page.waitForSelector('#headline');
  await page.waitForTimeout(1300);
  await page.fill('#entry', 'spinach, milk, salmon');
  await page.press('#entry', 'Enter');
  await page.waitForTimeout(80);
  const g = await page.evaluate(() => {
    const r = el => el.getBoundingClientRect();
    const size = el => { const b = r(el); return [Math.round(b.width), Math.round(b.height)]; };
    return {
      fridgeBottom: r(document.getElementById('rfUnit')).bottom, receiptTop: r(document.getElementById('receipt')).top,
      bagTop: r(document.querySelector('#addFood .bag-body')).top, receiptBottom: r(document.getElementById('receipt')).bottom,
      usuals: [...document.querySelectorAll('#restock .usual')].map(size),
      field: size(document.getElementById('entry')), voids: [...document.querySelectorAll('.rl-void, .rl-freeze')].map(size),
      putAway: size(document.getElementById('addbtn')), scan: size(document.getElementById('scanReceiptBtn')),
      more: (m => m ? size(m) : null)(document.getElementById('usualsMore')),
      inside: [...document.querySelectorAll('#addFood *')].every(el => { const b = r(el); return !b.width || b.right <= innerWidth - 16 + 1; }),
    };
  });
  console.log('phone bag:', JSON.stringify(g));
  if (g.receiptTop < g.fridgeBottom) throw new Error('the bag and its receipt should sit under the fridge');
  if (g.receiptBottom <= g.bagTop) throw new Error('the receipt should rise out of the bag');
  expectEqual('six usuals', g.usuals.length, 6);
  expectEqual('× on each line, freeze on milk and salmon (FoodKeeper: spinach not recommended)', g.voids.length, 5);
  const small = [...g.usuals, g.field, ...g.voids, g.putAway, g.scan, ...(g.more ? [g.more] : [])].filter(([w, h]) => w < 44 || h < 44);
  if (small.length) throw new Error('every bag control should be a 44px tap target: ' + JSON.stringify(small));
  expectEqual('nothing hangs out of the panel', g.inside, true);
  await page.$eval('#addFood', el => el.scrollIntoView({block: 'center'}));
  await page.screenshot({ path: path.join(OUT, 'putaway-phone.png') });
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await ctx.close();
}

// ---------- Duplicates: a second of anything is its own record ----------
// One fridge record per thing bought. A repeat on the receipt is one line
// with a count ("Milk ×2", with − and +); Put away makes each its own
// record with its own purchase date and clock. A new one never replaces,
// refreshes or merges with one already there: the older keeps its date and
// its cut or opened state, and stands further forward.

// A clean page; seed(list) puts records in as if bought `age` days ago
// and makes each key a usual. Returns {page, errors, ctx}.
async function dupPage(browser, vp = { width: 1280, height: 800 }, opts = {}) {
  const ctx = await browser.newContext({ viewport: vp, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => localStorage.setItem('perishable.key', 'test-key'));
  await page.reload();
  await page.waitForSelector('#headline');
  return { ctx, page, errors };
}
const dupSeed = (page, list) => page.evaluate(list => {
  const t = today(), ids = [];
  list.forEach(([key, age, o]) => {
    const it = {id: ++uid, key, bought: t - age, custom: null, ...(o || {})};
    fridge.push(it); ids.push(it.id);
    if (!standing[key]) standing[key] = {count: 0, lastBought: t - age, custom: null};
    standing[key].count++;
  });
  render();
  return ids;
}, list);
const dupRecs = (page, key) => page.evaluate(key => fridge.filter(i => i.key === key).map(i => ({
  id: i.id, bought: today() - i.bought, part: i.part == null ? 1 : i.part, opened: !!i.opened, cut: !!i.cut, frozen: !!i.frozen,
  left: leftAt(i, today()), exp: expiryOf(i) == null ? null : expiryOf(i) - today()})), key);
const dupLines = page => page.$$eval('#receiptLines .receipt-row', els => els.map(el => ({
  name: el.querySelector('.receipt-name').value,
  n: (el.querySelector('.rl-n') || {textContent: ''}).textContent.trim(),
  less: !!el.querySelector('.rl-less'), more: !!el.querySelector('.rl-more'),
  q: pendingItems[+el.dataset.idx].quantity || 1
})));
async function dupPutAway(page) {
  await page.click('#addbtn');
  await page.waitForTimeout(150);
}
// The line-art row's order (urgency): the ids, left to right, shelf by shelf.
const dupRowOrder = async page => {
  await page.$eval('#allItems', d => { d.open = true; });
  await page.waitForTimeout(150);
  return page.$$eval('#fridgeShelf [data-fridge-item]', els => els.map(e => +e.dataset.fridgeItem));
};

// The same usual tapped twice: one line, "Milk ×2"; two new cartons,
// each its own record, the one already in the fridge left as it was.
async function dupUsualTwiceScenario(browser) {
  console.log('\n--- DUPLICATES: the same usual tapped twice ---');
  const { ctx, page, errors } = await dupPage(browser);
  const [old] = await dupSeed(page, [['yogurt', 4]]);
  const before = await dupRecs(page, 'yogurt');
  await page.click('[data-restock="yogurt"]');
  await page.click('[data-restock="yogurt"]');
  await page.waitForTimeout(80);
  const lines = await dupLines(page);
  console.log('receipt:', JSON.stringify(lines));
  expectEqual('one line, ×2, with − and +', lines.map(l => [l.name, l.n, l.less, l.more]), [['Yogurt', '×2', true, true]]);
  await dupPutAway(page);
  const recs = await dupRecs(page, 'yogurt');
  console.log('yogurt:', JSON.stringify(recs));
  expectEqual('three yogurts: the old one and two new', recs.length, 3);
  expectEqual('the old one as it was', recs.find(r => r.id === old), before[0]);
  expectEqual('two new ones bought today, 14 days each', recs.filter(r => r.id !== old).map(r => [r.bought, r.left]), [[0, 14], [0, 14]]);
  expectEqual('the usual counted twice more', await page.evaluate(() => standing.yogurt.count), 3);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await ctx.close();
}

// "milk, milk" typed: one line, "Milk ×2"; its printed date is asked once
// and goes on both.
async function dupTypedRepeatScenario(browser) {
  console.log('\n--- DUPLICATES: "milk, milk" typed ---');
  const { ctx, page, errors } = await dupPage(browser);
  await page.fill('#entry', 'milk, milk');
  await page.press('#entry', 'Enter');
  await page.waitForTimeout(80);
  let lines = await dupLines(page);
  expectEqual('one line, ×2', lines.map(l => [l.name, l.n]), [['Milk', '×2']]);
  // "champagne, prosecco": the same food under two names stays two lines
  await page.fill('#entry', 'champagne, prosecco');
  await page.press('#entry', 'Enter');
  await page.waitForTimeout(80);
  lines = await dupLines(page);
  expectEqual('two names, two lines', lines.map(l => l.name), ['Milk', 'Champagne', 'Prosecco']);
  await page.click('#receiptLines .rl-void[data-idx="2"]');
  await page.click('#receiptLines .rl-void[data-idx="1"]');
  await page.fill('#receiptLines .entry-date[data-idx="0"]', await isoIn(page, 8));
  await dupPutAway(page);
  const recs = await dupRecs(page, 'milk');
  console.log('milk:', JSON.stringify(recs));
  expectEqual('two cartons, the printed date on each', recs.map(r => [r.bought, r.left]), [[0, 8], [0, 8]]);
  expectEqual('two records, two ids', new Set(recs.map(r => r.id)).size, 2);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await ctx.close();
}

// A count before the name. "×N"/"xN" is always N; a bare number is one
// pack when it's a common pack size for that food (eggs 6, 12, 18; canned
// drinks 6, 12, 24), otherwise 2-9 is a count and 10 or more one pack.
// "2% milk" has no count.
async function dupCountBeforeScenario(browser) {
  console.log('\n--- DUPLICATES: "3 milk", "12 eggs", a number before the name ---');
  const { ctx, page, errors } = await dupPage(browser);
  const cases = [
    ['3 milk', 'Milk', 3], ['2x milk', 'Milk', 2], ['2% milk', 'Milk', 1],
    ['12 eggs', 'Eggs', 1], ['6 eggs', 'Eggs', 1], ['18 eggs', 'Eggs', 1], ['4 eggs', 'Eggs', 4], ['12x eggs', 'Eggs', 12],
    // beer is the bottle; canned beer and hard seltzer come in packs
    ['6 beer', 'Beer', 6], ['6 canned beer', 'Canned beer', 1], ['24 hard seltzer', 'Hard seltzer', 1], ['3 hard seltzer', 'Hard seltzer', 3],
    ['10 lemons', 'Lemon', 1], ['9 lemons', 'Lemon', 9]
  ];
  const got = [];
  for (const [text] of cases) {
    await page.fill('#entry', text);
    await page.press('#entry', 'Enter');
    await page.waitForTimeout(40);
    const l = (await dupLines(page)).pop();
    got.push([text, l.name, l.q, l.n]);
    await takeOffReceipt(page);
  }
  console.log(JSON.stringify(got));
  expectEqual('names and counts', got.map(g => [g[0], g[1], g[2]]), cases);
  expectEqual('a count shows ×N, one pack shows none', got.map(g => g[3]), cases.map(c => c[2] > 1 ? '×' + c[2] : ''));
  // put away: "12 eggs" is one carton, "3 milk" three cartons
  await page.fill('#entry', '12 eggs, 3 milk');
  await page.press('#entry', 'Enter');
  await page.fill('#receiptLines .entry-date[data-idx="1"]', await isoIn(page, 7));
  await dupPutAway(page);
  expectEqual('"12 eggs": one carton; "3 milk": three', [(await dupRecs(page, 'egg')).length, (await dupRecs(page, 'milk')).length], [1, 3]);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await ctx.close();
}

// "milk x2", "eggs x2": a count after the name, always that many (x2 is
// two cartons of eggs); "2d" still dates it.
async function dupCountAfterScenario(browser) {
  console.log('\n--- DUPLICATES: "milk x2", a count after the name ---');
  const { ctx, page, errors } = await dupPage(browser);
  for (const [text, name] of [['spinach x2', 'Spinach'], ['spinach ×2', 'Spinach'], ['spinach x 2', 'Spinach'], ['eggs x2', 'Eggs'], ['eggs ×12', 'Eggs']]) {
    await page.fill('#entry', text);
    await page.press('#entry', 'Enter');
    await page.waitForTimeout(60);
    const l = (await dupLines(page)).pop();
    expectEqual(`"${text}"`, [l.name, l.n], [name, '×' + text.match(/(\d+)$/)[1]]);
    await takeOffReceipt(page);
  }
  await page.fill('#entry', 'spinach x2 2d');
  await dupPutAway(page);
  const recs = await dupRecs(page, 'spinach');
  console.log('spinach:', JSON.stringify(recs));
  expectEqual('"spinach x2 2d": two bags, bought two days ago', recs.map(r => [r.bought, r.left]), [[2, 5], [2, 5]]);
  await page.fill('#entry', 'eggs x2');
  await dupPutAway(page);
  expectEqual('"eggs x2": two cartons', (await dupRecs(page, 'egg')).length, 2);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await ctx.close();
}

// Milk typed while milk is already in the fridge (used some: opened, half
// left) and in the freezer: a new carton beside them; the old one keeps
// its date, its half and its opened state, and stands further forward;
// the frozen one is untouched.
async function dupAlreadyThereScenario(browser) {
  console.log('\n--- DUPLICATES: adding milk while milk is in the fridge and the freezer ---');
  const { ctx, page, errors } = await dupPage(browser);
  const [oldId, frozenId] = await dupSeed(page, [['milk', 3, {shelf: 9, shelfFrom: 'date'}], ['milk', 20, {frozen: true, clockFrom: 0}]]);
  await page.evaluate(() => { const t = today(); fridge[1].clockFrom = t - 10; render(); });
  await page.$eval(`[data-rf-item="${oldId}"]`, el => el.click());
  await page.click('#rfPopover .rf-pop-some');
  await page.waitForTimeout(150);
  const before = await dupRecs(page, 'milk');
  await page.fill('#entry', 'milk');
  await page.press('#entry', 'Enter');
  await page.fill('#receiptLines .entry-date[data-idx="0"]', await isoIn(page, 10));
  await dupPutAway(page);
  const recs = await dupRecs(page, 'milk');
  console.log('milk:', JSON.stringify(recs));
  expectEqual('three cartons', recs.length, 3);
  expectEqual('the old one: its date, half left, as it was', recs.find(r => r.id === oldId), before.find(r => r.id === oldId));
  expectEqual('the old one is still half', recs.find(r => r.id === oldId).part, 0.5);
  expectEqual('the frozen one untouched', recs.find(r => r.id === frozenId), before.find(r => r.id === frozenId));
  const fresh = recs.find(r => r.id !== oldId && r.id !== frozenId);
  expectEqual('the new one: today, whole, its own date', [fresh.bought, fresh.part, fresh.left], [0, 1, 10]);
  const order = await dupRowOrder(page);
  if (!(order.indexOf(oldId) >= 0 && order.indexOf(oldId) < order.indexOf(fresh.id))) throw new Error('the old carton should stand ahead of the new: ' + JSON.stringify(order));
  // the same date on both: the older still first
  await page.evaluate(([a, b]) => { const A = fridge.find(i => i.id === a), B = fridge.find(i => i.id === b); B.shelf = A.shelf - (B.bought - A.bought); render(); }, [oldId, fresh.id]);
  const order2 = await dupRowOrder(page);
  expectEqual('same days left: the older first', order2.indexOf(oldId) < order2.indexOf(fresh.id), true);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await ctx.close();
}

// A scanned receipt with the same item on two lines: one line, "Milk ×2",
// whose − and + change the count (44px on a phone); Put away makes that
// many records.
async function dupScanTwoLinesScenario(browser) {
  console.log('\n--- DUPLICATES: a scanned receipt with the same item on two lines ---');
  for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    const phone = vp.width < 720;
    const { ctx, page, errors } = await dupPage(browser, vp, phone ? { hasTouch: true, isMobile: true } : {});
    await page.evaluate(() => {
      window.__receiptApiOverride = async () => ({ date: null, items: [
        {raw: 'BNLS CHKN BRST', expanded: 'Chicken breast', quantity: 1, is_food: true},
        {raw: 'SPINACH', expanded: 'Spinach', quantity: 1, is_food: true},
        {raw: 'BNLS CHKN BRST', expanded: 'Chicken breast', quantity: 1, is_food: true},
        {raw: 'BAGS', expanded: 'Bags', quantity: 1, is_food: false},
        {raw: 'BAGS', expanded: 'Bags', quantity: 1, is_food: false}
      ]});
    });
    const fixturePath = path.join(os.tmpdir(), 'perishable-receipt-dup.jpg');
    fs.writeFileSync(fixturePath, FIXTURE_JPEG);
    await page.setInputFiles('#receiptFile', fixturePath);
    await page.waitForSelector('#receiptLines .receipt-row');
    fs.unlinkSync(fixturePath);
    let lines = await dupLines(page);
    console.log(phone ? 'phone' : 'desktop', 'receipt:', JSON.stringify(lines.map(l => l.name + ' ' + l.n)));
    expectEqual('chicken on one line ×2; void lines left alone', lines.map(l => [l.name, l.n]),
      [['Chicken breast', '×2'], ['Spinach', ''], ['Bags', ''], ['Bags', '']]);
    if (phone) {
      const sz = await page.$$eval('#receiptLines .rl-less, #receiptLines .rl-more', bs => bs.map(b => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); }));
      if (sz.some(s => s < 44)) throw new Error('− and + should be 44px on a phone: ' + sz);
    }
    await page.click('#receiptLines .rl-more[data-idx="0"]');
    expectEqual('+ makes it ×3', (await dupLines(page))[0].n, '×3');
    await page.click('#receiptLines .rl-less[data-idx="0"]');
    await page.click('#receiptLines .rl-less[data-idx="0"]');
    lines = await dupLines(page);
    expectEqual('− down to one: no count, − off, + still there', [lines[0].n, lines[0].q, await page.$eval('#receiptLines .rl-less[data-idx="0"]', b => b.disabled), lines[0].more], ['', 1, true, true]);
    await page.click('#receiptLines .rl-more[data-idx="0"]');
    await dupPutAway(page);
    const recs = await dupRecs(page, 'chicken');
    expectEqual('two chicken breasts, each its own record', recs.map(r => [r.bought, r.left]), [[0, 2], [0, 2]]);
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    await ctx.close();
  }
}

// Restocking something cut by Used some: the cut one stays cut, with its
// date (an onion's doesn't move; an apple's is FoodKeeper's cut-fruit
// clock), and a whole new one goes in beside it. Undo takes only the new
// one out.
async function dupRestockCutScenario(browser) {
  console.log('\n--- DUPLICATES: restocking a cut ("used some") item ---');
  const { ctx, page, errors } = await dupPage(browser);
  const [onionId, appleId] = await dupSeed(page, [['onion', 6], ['apple', 10]]);
  for (const id of [onionId, appleId]) {
    await page.$eval(`[data-rf-item="${id}"]`, el => el.click());
    await page.click('#rfPopover .rf-pop-some');
    await page.waitForTimeout(150);
  }
  const before = {onion: await dupRecs(page, 'onion'), apple: await dupRecs(page, 'apple')};
  console.log('cut:', JSON.stringify(before));
  expectEqual('cut apple on FoodKeeper #179, 4 days', [before.apple[0].cut, before.apple[0].exp], [true, 4]);
  await page.click('[data-restock="onion"]');
  await page.click('[data-restock="apple"]');
  await dupPutAway(page);
  for (const [key, id, whole] of [['onion', onionId, 30], ['apple', appleId, 42]]) {
    const recs = await dupRecs(page, key);
    console.log(key + ':', JSON.stringify(recs));
    expectEqual(`${key}: the cut one as it was`, recs.find(r => r.id === id), before[key][0]);
    expectEqual(`${key}: a whole new one beside it`, recs.filter(r => r.id !== id).map(r => [r.bought, r.part, r.cut, r.left]), [[0, 1, false, whole]]);
  }
  await page.click('#toast .toast-undo');
  await page.waitForTimeout(100);
  expectEqual('Undo: only the new ones out', [await dupRecs(page, 'onion'), await dupRecs(page, 'apple')], [before.onion, before.apple]);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await ctx.close();
}

// Used some on fruit and vegetables with no after-opening figure of their
// own: FoodKeeper's entry for them cut (FK_CUT), counted from the day it's
// cut -- fruit #179 "Fruit, cut", 4 days; whole spaghetti squash #597, 5.
// Never past the date it had whole. Onion and tomato have no cut entry:
// their dates stay. A melon keeps its own #264 after-opening figure;
// berries and grapes lose pieces, they aren't cut.
async function cutFruitScenario(browser) {
  console.log('\n--- CUT FRUIT: FoodKeeper #179 "Fruit, cut", and #597 for spaghetti squash ---');
  const { ctx, page, errors } = await dupPage(browser, { width: 1440, height: 900 });
  const keys = await page.evaluate(() => ({squash: fkKey(596), melon: fkKey(264)}));
  const list = [['apple', 3], ['cantaloupe', 1], ['lemon', 2], ['pineapple', 0], [keys.squash, 2, {name: 'Spaghetti squash'}],
    ['strawberry', 2], ['onion', 5], ['tomato', 1], ['blueberry', 1], ['grapes', 1], [keys.melon, 1, {name: 'Melon'}], ['avocado', 0, {ripening: true}]];
  const ids = await dupSeed(page, list);
  await page.waitForTimeout(300);
  const out = {};
  for (let i = 0; i < list.length; i++) {
    const id = ids[i];
    const exp0 = await page.evaluate(id => expiryOf(fridge.find(x => x.id === id)) - today(), id);
    await page.$eval(`[data-rf-item="${id}"]`, el => el.click());
    await page.click('#rfPopover .rf-pop-some');
    await page.waitForTimeout(120);
    const toast = await page.textContent('#toast');
    const r = await page.evaluate(id => { const it = fridge.find(x => x.id === id); return {exp: expiryOf(it) - today(), cut: !!it.cut, src: shelfSourceOf(it)}; }, id);
    out[list[i][0]] = {exp0, ...r, note: (toast.match(/· (\d+ days?) now that it's cut/) || [])[1] || ''};
  }
  console.log(JSON.stringify(out, null, 1));
  const want = {
    apple: [4, true, '4 days', /^cut .*FoodKeeper #179 “Fruit, cut”, 4 days$/],
    // 4 days whole (its pantry figure): 3 left, cutting doesn't give it more
    cantaloupe: [3, false, '', /#496/], lemon: [4, true, '4 days', /#179/], pineapple: [4, true, '4 days', /#179/],
    [keys.squash]: [5, true, '5 days', /^cut .*FoodKeeper #597 “Spaghetti squash \(cut\)”, 5 days$/],
    // 1 day left whole: cutting doesn't give it more
    strawberry: [1, false, '', /#481/],
    onion: [out.onion.exp0, false, '', /#294/], tomato: [out.tomato.exp0, false, '', /estimated/],
    blueberry: [out.blueberry.exp0, false, '', /#254/], grapes: [out.grapes.exp0, false, '', /#261/],
    // its own entry has an after-opening figure: that, not #179
    [keys.melon]: [4, false, '4 days', /#264, 4 days after opening/],
    // not ripe yet: cut now, its clock starts on #179
    avocado: [4, true, '4 days', /#179/]
  };
  for (const [k, [exp, cut, note, src]] of Object.entries(want)) {
    expectEqual(`${k}: days, cut, toast`, [out[k].exp, out[k].cut, out[k].note], [exp, cut, note]);
    if (!src.test(out[k].src)) throw new Error(`${k} source: ${out[k].src}`);
  }
  // a second Used some leaves the cut clock alone; a reload keeps it
  await page.$eval(`[data-rf-item="${ids[0]}"]`, el => el.click());
  await page.click('#rfPopover .rf-pop-some');
  await page.waitForTimeout(120);
  expectEqual('apple, cut again: date unchanged', await page.evaluate(id => expiryOf(fridge.find(x => x.id === id)) - today(), ids[0]), 4);
  await page.reload();
  await page.waitForSelector('#headline');
  expectEqual('reload keeps the cut clock', await page.evaluate(id => { const it = fridge.find(x => x.id === id); return [it.cut, expiryOf(it) - today()]; }, ids[0]), [true, 4]);
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await ctx.close();
}

// The pictures: a receipt with "Milk ×2" on it, and the fridge holding an
// old and a new milk and a half onion, the whole new onion in the bowl
// (onions are kept out of the fridge; the All items row shows them side
// by side). Desktop and phone.
async function dupRenderScenario(browser) {
  console.log('\n--- DUPLICATES: the receipt and the fridge, desktop and phone ---');
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const phone = vp.width < 720;
    const { ctx, page, errors } = await dupPage(browser, vp, phone ? { hasTouch: true, isMobile: true } : {});
    const [, , oldOnion] = await dupSeed(page, [['milk', 5, {shelf: 8, shelfFrom: 'date'}], ['spinach', 1], ['onion', 9], ['carrot', 3]]);
    // the whole onion may be on Tonight's board: Used some straight from the record
    await page.evaluate(id => useSome(id), oldOnion);
    await page.waitForTimeout(150);
    await page.fill('#entry', 'milk, onion');
    await page.press('#entry', 'Enter');
    await page.fill('#receiptLines .entry-date[data-idx="0"]', await isoIn(page, 9));
    await dupPutAway(page);
    await page.waitForTimeout(6400); // every flight landed, the toast gone
    // and a receipt with the next shop on it
    await page.fill('#entry', 'milk, milk, spinach');
    await page.press('#entry', 'Enter');
    await page.waitForTimeout(100);
    const lines = await dupLines(page);
    expectEqual('the receipt', lines.map(l => l.name + (l.n ? ' ' + l.n : '')), ['Milk ×2', 'Spinach']);
    const st = await page.evaluate(() => fridge.map(it => [it.key, it.part || 1, !!document.querySelector(`#rfUnit [data-rf-item="${it.id}"]`), !!document.querySelector(`#kcUnit [data-rf-item="${it.id}"]`)]));
    console.log(phone ? 'phone' : 'desktop', JSON.stringify(st));
    expectEqual('two milks in the fridge', st.filter(s => s[0] === 'milk' && s[2]).length, 2);
    expectEqual('the half onion in the fridge, the whole one in the bowl',
      st.filter(s => s[0] === 'onion').map(s => [s[1], s[2], s[3]]), [[0.5, true, false], [1, false, true]]);
    if (!phone) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(OUT, 'dup-desktop.png') });
    } else {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(OUT, 'dup-phone-fridge.png') });
      await page.$eval('#addFood', el => el.scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: path.join(OUT, 'dup-phone-receipt.png') });
    }
    await page.$eval('#allItems', d => { d.open = true; });
    await page.waitForTimeout(200);
    await page.$eval('#allItems', el => el.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(OUT, `dup-${phone ? 'phone' : 'desktop'}-allitems.png`) });
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    await ctx.close();
  }
}

// ---- Meals. The Kitchen's "Tonight" is Breakfast / Lunch / Dinner /
// Snack. Every context in this suite runs on a mocked clock (the
// browser.newContext wrapper at the bottom pins it at 18:00 today, so the
// older scenarios, written for "tonight", see Dinner); these set their own.
async function mealContext(browser, hh, mm = 0, vp = { width: 1280, height: 1000 }) {
  const ctx = await browser.newContext({ viewport: vp });
  const d = new Date(); d.setHours(hh, mm, 0, 0);
  await ctx.clock.setFixedTime(d);
  return ctx;
}
// Bananas, eggs, milk, spinach and chicken, with an onion, strawberries,
// yogurt, a tomato and scallions so every meal has something to choose.
const MEALS_FIXTURE = [['banana', 1], ['egg', 10], ['milk', 2, 6], ['spinach', 4], ['chicken', 1],
  ['onion', 5], ['strawberry', 0], ['yogurt', 3], ['tomato', 3], ['scallion', 3], ['apple', 20], ['grapes', 2]];
const mealState = page => page.evaluate(() => ({
  pressed: [...document.querySelectorAll('#tonight .meal-tab')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.meal),
  h2: (document.querySelector('#tonight h2') || {textContent: ''}).textContent.trim(),
  line: document.getElementById('tonightLine').hidden ? null : document.getElementById('tonightLine').textContent.replace(/\s+/g, ' ').trim(),
  plates: [...document.querySelectorAll('#tonight .meal-plate')].map(b => b.dataset.meal),
  board: [...document.querySelectorAll('#kcBoardItems [data-board-item]')].map(e => +e.dataset.boardItem).sort((a, b) => a - b),
  dish: !!document.querySelector('#kcDish svg') && !document.getElementById('kcDish').hidden
}));

// The default meal by the clock: before 10:30 Breakfast, until 15:00
// Lunch, until 21:00 Dinner, then Snack -- on both sides of each line. The
// line under the bag names the default meal.
async function mealDefaultScenario(browser) {
  console.log('\n--- MEALS: the default meal by the (mocked) clock ---');
  const cases = [[0, 5, 'breakfast'], [7, 0, 'breakfast'], [10, 29, 'breakfast'], [10, 30, 'lunch'], [14, 59, 'lunch'],
    [15, 0, 'dinner'], [20, 59, 'dinner'], [21, 0, 'snack'], [23, 30, 'snack']];
  for (const [hh, mm, want] of cases) {
    const ctx = await mealContext(browser, hh, mm);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await seedMixed18(page, MEALS_FIXTURE);
    await page.waitForSelector('#tonight .meal-tab');
    const st = await mealState(page);
    const fn = await page.evaluate(() => [defaultMeal(), selectedMeal(), nextMealDish && nextMealDish.name]);
    const tag = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    console.log(tag, JSON.stringify({pressed: st.pressed, line: st.line}));
    expectEqual(`${tag}: default meal`, [fn[0], fn[1], st.pressed], [want, want, [want]]);
    const label = {breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack'}[want];
    if (fn[2]) expectEqual(`${tag}: the line names the default meal`, st.line, `${label}:${fn[2]} →`);
    else expectEqual(`${tag}: no dish for the default meal, no line`, st.line, null);
    expectEqual(`${tag}: the other three meals beside it`, st.plates, ['breakfast', 'lunch', 'dinner', 'snack'].filter(m => m !== want));
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    await ctx.close();
  }
}

// Switching meals: the switcher and the small plates select a meal; the
// board, its dish drawing and the card follow it; the line under the bag
// stays on the default meal, and so does the fridge's outline; nothing is
// saved, so a reload opens on the default meal again. The line opens the
// Kitchen on the meal it names.
async function mealSwitchScenario(browser) {
  console.log('\n--- MEALS: switching, not remembered ---');
  const ctx = await mealContext(browser, 8, 0);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await seedMixed18(page, MEALS_FIXTURE);
  await page.waitForSelector('#tonight .meal-tab');
  const plan = () => page.evaluate(() => {
    const p = planDay(fridge, today());
    return Object.fromEntries(MEALS.map(m => [m, p.meals[m].result ? {name: p.meals[m].result.dish.name, ids: p.meals[m].result.matched.map(k => p.meals[m].result.have[k].id).sort((a, b) => a - b)} : null]));
  });
  const P = await plan();
  console.log('plan at 08:00', JSON.stringify(P));
  const before = await mealState(page);
  expectEqual('opens on Breakfast', [before.pressed, before.h2], [['breakfast'], P.breakfast.name]);
  const outlined = () => page.evaluate(() => [...document.querySelectorAll('#rfUnit .rf-tonight')].map(b => +b.dataset.rfItem).sort((a, b) => a - b));
  // what the breakfast dish uses that stands in the fridge (not the bowl)
  const inFridge = await page.evaluate(ids => ids.filter(id => document.querySelector(`#rfUnit .rf-cavity [data-rf-item="${id}"], #rfUnit .rf-door [data-rf-item="${id}"]`)), P.breakfast.ids);
  expectEqual('the fridge outlines the breakfast dish', await outlined(), inFridge);

  for (const m of ['lunch', 'dinner', 'snack', 'breakfast']) {
    await page.click(`#tonight .meal-tab[data-meal="${m}"]`);
    const st = await mealState(page);
    const want = P[m];
    expectEqual(`switched to ${m}`, st.pressed, [m]);
    if (want) {
      expectEqual(`${m}: its dish on the card`, st.h2, want.name);
      expectEqual(`${m}: its ingredients on the board`, st.board, want.ids);
      expectEqual(`${m}: its dish drawn on the board`, st.dish, true);
    } else expectEqual(`${m}: no dish, nothing drawn`, st.dish, false);
    expectEqual(`${m}: the line still names Breakfast`, st.line.startsWith('Breakfast:'), true);
  }
  // a small plate selects its meal too
  await page.click('#tonight .meal-plate[data-meal="lunch"]');
  expectEqual('a small plate selects its meal', (await mealState(page)).pressed, ['lunch']);
  expectEqual('the outline stays on Breakfast', await outlined(), inFridge);
  // the line opens the Kitchen on the meal it names -- from the Fridge
  // panel, where the line is
  await page.click('#tabFridge');
  await page.waitForTimeout(600);
  await page.click('#tonightLine');
  await page.waitForTimeout(400);
  expectEqual('the line opens Kitchen on Breakfast', [(await mealState(page)).pressed,
    await page.$eval('#tabKitchen', t => t.getAttribute('aria-selected'))], [['breakfast'], 'true']);
  // not remembered
  await page.click('#tonight .meal-tab[data-meal="dinner"]');
  const saved = await page.evaluate(() => Object.keys(localStorage).join(' ') + ' ' + localStorage.getItem('perishable.v1'));
  expectEqual('the switch is not saved', /dinner/i.test(saved), false);
  await page.reload();
  await page.waitForSelector('#tonight .meal-tab');
  expectEqual('a reload opens on the default meal again', (await mealState(page)).pressed, ['breakfast']);
  console.log('switched through every meal and back; the line and outline stayed on Breakfast; not saved');
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await ctx.close();
}

// No ingredient reused within a day: at every time of day, the fridge
// records the four meals use are all different -- through the drawn
// boards, each meal selected in turn, not just the plan's own numbers.
async function mealNoReuseScenario(browser) {
  console.log('\n--- MEALS: no ingredient used twice in a day ---');
  for (const hh of [8, 12, 18, 22]) {
    const ctx = await mealContext(browser, hh);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await seedMixed18(page, [...MEALS_FIXTURE, ['egg', 12], ['tomato', 2], ['mango', 1], ['bread', 2], ['broccoli', 3], ['garlic', 6]]);
    await page.waitForSelector('#tonight .meal-tab');
    const used = {};
    for (const m of ['breakfast', 'lunch', 'dinner', 'snack']) {
      await page.click(`#tonight .meal-tab[data-meal="${m}"]`);
      const st = await mealState(page);
      used[m] = st.h2 && st.board.length ? {dish: st.h2, ids: st.board} : null;
    }
    console.log(`${hh}:00`, JSON.stringify(used));
    const all = Object.values(used).filter(Boolean).flatMap(u => u.ids);
    expectEqual(`${hh}:00: at least three meals have a dish`, Object.values(used).filter(Boolean).length >= 3, true);
    expectEqual(`${hh}:00: no record on two boards`, all.length, new Set(all).size);
    const names = Object.values(used).filter(Boolean).map(u => u.dish);
    expectEqual(`${hh}:00: no dish twice`, names.length, new Set(names).size);
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    await ctx.close();
  }
}

// The most urgent ingredient goes to the earliest meal still ahead: at
// 08:00 strawberries on their last day go to Breakfast (not the snack, the
// other meal that has a strawberry dish); at 12:00 chicken on its last day
// goes to Lunch, though Dinner has a chicken dish too; at 18:00 it goes to
// Dinner. With another fridge, a dish that scores higher without it loses.
async function mealUrgentFirstScenario(browser) {
  console.log('\n--- MEALS: the most urgent ingredient in the earliest meal ahead ---');
  const FIX = [['strawberry', 3], ['banana', 0], ['yogurt', 10], ['kiwi', 0], ['chicken', 2], ['spinach', 2], ['milk', 2, 6],
    ['onion', 4], ['broccoli', 2], ['garlic', 6], ['ginger', 3], ['egg', 10], ['tomato', 1], ['scallion', 2]];
  for (const [hh, meal, key] of [[8, 'breakfast', 'strawberry'], [12, 'lunch', 'chicken'], [18, 'dinner', 'chicken']]) {
    const ctx = await mealContext(browser, hh);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await seedMixed18(page, FIX);
    await page.waitForSelector('#tonight .meal-tab');
    const st = await page.evaluate(([meal, key]) => {
      const it = fridge.find(i => i.key === key);
      // nothing this meal could cook is sooner to turn
      const usable = fridge.filter(i => leftAt(i, today()) >= 0 && DISHES.some(d => d.meals.includes(meal) && d.needs.includes(i.key)));
      return {soonest: Math.min(...usable.map(i => left(i))), left: left(it), id: it.id,
        board: boardItems.map(i => i.key), selected: selectedMeal(), dish: (document.querySelector('#tonight h2') || {}).textContent};
    }, [meal, key]);
    console.log(`${hh}:00`, JSON.stringify(st));
    expectEqual(`${hh}:00: opens on ${meal}`, st.selected, meal);
    expectEqual(`${hh}:00: ${key} is the soonest ${meal} can use`, st.left, st.soonest);
    expectEqual(`${hh}:00: ${meal} uses the ${key}`, st.board.includes(key), true);
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    await ctx.close();
  }
  // The rule, on its own: a dish with a higher score (three things a day
  // or two from turning) loses to one that uses the single soonest item.
  const ctx = await mealContext(browser, 12);
  const page = await ctx.newPage();
  await seedMixed18(page, [['chicken', 2], ['spinach', 0], ['milk', 0, 10], ['onion', 0], ['tomato', 6], ['egg', 34], ['scallion', 6], ['garlic', 0]]);
  await page.waitForSelector('#tonight .meal-tab');
  const r = await page.evaluate(() => {
    const t = today(), plain = recommendAt(fridge, t, new Set()), lunch = planDay(fridge, t, 'lunch').meals.lunch.result;
    return {plain: plain.dish.name, lunch: lunch.dish.name, lunchUses: lunch.matched, chickenLeft: left(fridge.find(i => i.key === 'chicken'))};
  });
  console.log('urgent vs score:', JSON.stringify(r));
  expectEqual('by score alone, the three things a day from turning', r.plain, 'Tomato egg stir-fry');
  expectEqual('lunch takes the chicken on its last day', [r.chickenLeft, r.lunch, r.lunchUses.includes('chicken')], [0, 'Creamy chicken spinach rice', true]);
  await ctx.close();
}

// Each meal selected, desktop and phone, with bananas, eggs, milk,
// spinach and chicken: the Kitchen (switcher, the dish large on the board
// with what it uses beside it, the other meals small beside the card) and
// the Fridge panel's line under the bag with its small dish.
async function mealRenderScenario(browser) {
  console.log('\n--- MEALS: each meal selected, desktop and phone ---');
  for (const [tag, vp] of [['desktop', { width: 1280, height: 1000 }], ['phone', { width: 390, height: 844 }]]) {
    const ctx = await mealContext(browser, 8, 0, vp);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await seedMixed18(page, MEALS_FIXTURE);
    await page.waitForSelector('#tonight .meal-tab');
    await page.waitForTimeout(1300); // the door's load animation
    await page.$eval('#tonightLine', el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - (innerHeight - 200)));
    await page.screenshot({ path: path.join(OUT, `meals-${tag}-fridge-line.png`) });
    await page.click('#tabKitchen');
    await page.waitForTimeout(600);
    for (const m of ['breakfast', 'lunch', 'dinner', 'snack']) {
      await page.click(`#tonight .meal-tab[data-meal="${m}"]`);
      await page.waitForTimeout(150);
      const st = await mealState(page);
      console.log(`${tag} ${m}:`, JSON.stringify({h2: st.h2, board: st.board.length, dish: st.dish}));
      await page.$eval('#roomTabs', el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 8));
      await page.screenshot({ path: path.join(OUT, `meals-${tag}-${m}.png`) });
      const art = await page.evaluate(() => document.querySelector('#tonight').innerHTML.includes('NaN') || (document.getElementById('kcDish').innerHTML.includes('NaN')));
      expectEqual(`${tag} ${m}: no NaN in the drawings`, art, false);
      // a drink (glass, mug) draws nothing on or in it: its ingredients
      // are beside it on the board
      const drink = await page.evaluate(() => boardDish && ['glass', 'mug'].includes(boardDish.vessel)
        ? [document.querySelectorAll('#kcDish svg svg, #kcDish svg ellipse[fill="#F7F3E8"]').length, boardItems.length > 0] : null);
      if (drink) expectEqual(`${tag} ${m}: the drink's ingredients beside it, none on it`, drink, [0, true]);
    }
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    await ctx.close();
  }
}

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  // Every context runs on a mocked clock, 18:00 today unless a scenario
  // sets its own (mealContext): the Kitchen opens on the meal the clock
  // says, so without this a scenario would see a different meal depending
  // on when the suite runs.
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (opts) => {
    const ctx = await newContext(opts);
    const d = new Date(); d.setHours(18, 0, 0, 0);
    await ctx.clock.setFixedTime(d);
    return ctx;
  };
  // ONLY=decayLineScenario node tools/scenarios.js runs just that one.
  if (process.env.ONLY){
    try { await eval(process.env.ONLY)(browser); } catch (e) { console.log('\nFAILED:', e.message); process.exitCode = 1; }
    await browser.close(); server.close();
    return;
  }

  const RUNS = [
    () => scenario(browser, 'ALL FRESH', 'spinach, milk, chicken, onion', 'scn-fresh.png'),
    () => scenario(browser, 'ALL PAST DATE', 'spinach 10d, milk 12d, chicken 10d', 'scn-gone.png'),
    () => scenario(browser, 'MIXED', 'chicken 10d, spinach, milk, onion', 'scn-mixed.png'),
    () => receiptScenario(browser),
    () => recommendationScenario(browser),
    () => noRiskScenario(browser),
    () => fridgeGradientScenario(browser),
    () => fridgeHaulScenario(browser),
    () => fridgeFactBugScenario(browser),
    () => pluralAgreementScenario(browser),
    () => dishRepeatScenario(browser),
    () => migrationScenario(browser),
    () => legacyMapScenario(browser),
    () => legacyLinkScenario(browser),
    () => legacyOnceScenario(browser),
    () => legacyUnmappedScenario(browser),
    () => splitEntriesScenario(browser),
    () => realFridgeDoorLoadScenario(browser),
    () => realFridgeHandleToggleScenario(browser),
    () => realFridgeReducedMotionScenario(browser),
    () => realFridgeClosedCountScenario(browser),
    () => realFridgeItemTapScenario(browser),
    () => fkOnlyScenario(browser),
    () => aliasScenario(browser),
    () => noFalseMatchScenario(browser),
    () => ambiguousScenario(browser),
    () => noMatchScenario(browser),
    () => receiptNewItemsScenario(browser),
    () => restockNoWasteScenario(browser),
    () => mixedFridgeScenario(browser),
    () => rowFixtureScenario(browser),
    () => dishFixtureScenario(browser),
    () => editDateScenario(browser),
    () => ripenessScenario(browser),
    () => handAliasScenario(browser),
    () => decayLineScenario(browser),
    () => editBoughtScenario(browser),
    () => goneTossScenario(browser),
    () => popoverUseScenario(browser),
    () => popoverDetailsScenario(browser),
    () => allItemsScenario(browser),
    () => projectionHeadlineScenario(browser),
    () => phoneDataScenario(browser),
    () => addButtonScenario(browser),
    () => kitchenScenario(browser),
    () => lastDayScenario(browser),
    () => panelsScenario(browser),
    () => tonightOutlineScenario(browser),
    () => usedSomeScenario(browser),
    () => pageStructureScenario(browser),
    () => drinksScenario(browser),
    () => moreDrinksScenario(browser),
    () => drinkLabelScenario(browser),
    () => condimentsScenario(browser),
    () => frozenFoodsScenario(browser),
    () => leftoversScenario(browser),
    () => freezeScenario(browser),
    () => thawScenario(browser),
    () => cantFreezeScenario(browser),
    () => frozenEntryScenario(browser),
    () => frozenReceiptScenario(browser),
    () => freezerMigrationScenario(browser),
    () => frozenNeverSpoilsScenario(browser),
    () => freezePausesDecayScenario(browser),
    () => bigThawScenario(browser),
    () => thawReachScenario(browser),
    () => dragFreezeScenario(browser),
    () => dragThawScenario(browser),
    () => dragRefusedScenario(browser),
    () => dragTouchGesturesScenario(browser),
    () => dragPhoneShotScenario(browser),
    () => dragReducedMotionScenario(browser),
    () => putAwayScenario(browser),
    () => putAwayReducedMotionScenario(browser),
    () => bagPhoneScenario(browser),
    () => dupUsualTwiceScenario(browser),
    () => dupTypedRepeatScenario(browser),
    () => dupCountBeforeScenario(browser),
    () => dupCountAfterScenario(browser),
    () => dupAlreadyThereScenario(browser),
    () => dupScanTwoLinesScenario(browser),
    () => dupRestockCutScenario(browser),
    () => cutFruitScenario(browser),
    () => dupRenderScenario(browser),
    () => mealDefaultScenario(browser),
    () => mealSwitchScenario(browser),
    () => mealNoReuseScenario(browser),
    () => mealUrgentFirstScenario(browser),
    () => mealRenderScenario(browser),
  ];
  let passed = 0;
  const failed = [];
  for (const run of RUNS) {
    try { await run(); passed++; }
    catch (e) { failed.push(run.toString().replace(/^\(\) => /, '')); console.log('\nFAILED:', e.message); }
  }
  console.log(`\n${passed} of ${RUNS.length} scenarios passed`);
  if (failed.length) { console.log('Failed:\n  ' + failed.join('\n  ')); process.exitCode = 1; }

  await browser.close();
  server.close();
  console.log(`\nScreenshots written to ${OUT}`);
})();
