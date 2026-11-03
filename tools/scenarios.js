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
  // its package date (milk), a FoodKeeper-only match (dragonfruit ->
  // Pitaya/dragon fruit #480, 21 days, quantity 2 -> two fridge rows), a
  // name that must match nothing (potato chips: never Potato) and a
  // non-food line that must land unchecked. The date is legible, so age
  // is receipt-derived. (Dragonfruit was the no-match fixture until the
  // FoodKeeper fallback table arrived and recognised it; potato chips took
  // that role.)
  await page.evaluate(() => {
    window.__receiptApiOverride = async () => ({
      date: '2026-10-20',
      items: [
        {raw: 'ORG DRAGONFRUIT', expanded: 'organic dragonfruit', quantity: 2, is_food: true},
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
  const readRows = () => page.$$eval('#receiptPreview .receipt-row', els => els.map(el => ({
    checked: el.querySelector('input[type=checkbox]').checked,
    name: el.querySelector('input[type=text]').value,
    flag: el.classList.contains('unresolved') ? 'no match' : el.classList.contains('needs-date') ? 'needs date' : '',
    match: (el.querySelector('.match') || {textContent: ''}).textContent.trim(),
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
  expectEqual('dragonfruit label (the scanned name, cleaned)', rows[0].name, 'Dragonfruit');
  if (rows[0].flag || !rows[0].match.includes('FoodKeeper #480')) throw new Error('dragonfruit should match FoodKeeper #480: ' + JSON.stringify(rows[0]));
  if (rows[1].flag !== 'needs date' || !rows[1].match.includes('FOODS')) throw new Error('milk should match FOODS and ask for its package date: ' + JSON.stringify(rows[1]));
  if (rows[2].flag !== 'no match' || !rows[2].match.includes('no shelf-life data')) throw new Error('potato chips should match nothing: ' + JSON.stringify(rows[2]));
  if (!(await page.$eval('#receiptConfirm', b => b.disabled))) throw new Error('confirm should be blocked while lines need answers');

  // Answer through the real controls: milk's printed date 7 days after
  // purchase, the chips' use-by 60 days after.
  const purchase = await page.evaluate(() => receiptPending.age);
  const isoAfter = n => page.evaluate(([a, d]) => new Date((today() - a + d - DAY_OFFSET) * 86400000).toISOString().slice(0, 10), [purchase, n]);
  await page.fill('#receiptPreview .entry-date[data-idx="1"]', await isoAfter(7));
  await page.fill('#receiptPreview .entry-date[data-idx="2"]', await isoAfter(60));
  if (await page.$eval('#receiptConfirm', b => b.disabled)) throw new Error('confirm still blocked after every line was answered');
  await page.click('#receiptConfirm');
  await page.waitForTimeout(150);

  const fridgeRows = await page.$$eval('#rows .row', els => els.map(e => ({
    name: e.querySelector('.name').childNodes[0].textContent.trim(), left: e.querySelector('.left').textContent.trim()
  })));
  console.log('fridge rows after confirm:', JSON.stringify(fridgeRows));
  const rowNames = fridgeRows.map(r => r.name);
  if (rowNames.length !== 4) throw new Error(`expected 4 fridge rows (2 dragonfruit + milk + chips), got ${rowNames.length}`);
  if (rowNames.filter(n => n === 'Dragonfruit').length !== 2) throw new Error('expected two dragonfruit rows from quantity 2');
  const leftOf = n => fridgeRows.find(r => r.name === n).left;
  expectEqual('dragonfruit days left (21 - age)', leftOf('Dragonfruit'), (21 - purchase) + ' days');
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
  if (!(await page.$('#voicePreview .receipt-row'))) return;
  for (;;) {
    const pick = await page.$('#voicePreview .receipt-row.unresolved .entry-pick');
    if (!pick) break;
    const first = await pick.$eval('option:nth-child(2)', o => o.value);
    await pick.selectOption(first);
  }
  for (;;) {
    const input = await page.$('#voicePreview .entry-date:not([data-done])');
    if (!input) break;
    const idx = await input.getAttribute('data-idx');
    const iso = await page.evaluate(i => new Date((today() - pendingItems[i].age + 7 - DAY_OFFSET) * 86400000)
      .toISOString().slice(0, 10), +idx);
    await input.fill(iso);
    await page.$eval(`#voicePreview .entry-date[data-idx="${idx}"]`, el => el.setAttribute('data-done', ''));
  }
  await page.click('#voiceAdd');
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
  const chips = await page.$$eval('#tonight .chip', els => els.map(e => e.textContent.trim()));
  console.log('tonight chips:', JSON.stringify(chips));
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

  const chipColors = await page.$$eval('#tonight .chip.use', els => els.map(e => ({
    text: e.textContent.trim(),
    style: e.getAttribute('style') || ''
  })));
  console.log('chip styles:', JSON.stringify(chipColors));
  const chicken = chipColors.find(c => c.text.startsWith('Chicken'));
  const spinach = chipColors.find(c => c.text.startsWith('Spinach'));
  const milk = chipColors.find(c => c.text.startsWith('Milk'));
  const onion = chipColors.find(c => c.text.startsWith('Onion'));
  if (!chicken.style.includes('--crit')) throw new Error('chicken (2d, crit) chip should be colored --crit');
  if (!spinach.style.includes('--turn')) throw new Error('spinach (7d, turn) chip should be colored --turn');
  if (!milk.style.includes('--turn')) throw new Error('milk (7d, turn) chip should be colored --turn');
  if (onion.style.trim()) throw new Error(`onion (10d, fresh) chip should carry no color override, got "${onion.style}"`);

  const eyebrow = await page.textContent('.tonight .eyebrow');
  console.log('eyebrow:', eyebrow);
  if (eyebrow.trim() !== 'Tonight · rescues 3 items') throw new Error(`eyebrow was "${eyebrow.trim()}", expected "Tonight · rescues 3 items" (onion isn't at risk)`);

  await page.click('.js-cook');
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
  const tonightChips = await page.$$eval('#tonight .chip', els => els.length);
  if (tonightChips !== 0) throw new Error(`expected no dish chips on a noRisk tonight, found ${tonightChips}`);
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
  const res = await page.evaluate(() => {
    const box = el => { const r = el.getBoundingClientRect(); return {left: r.left, right: r.right, top: r.top, bottom: r.bottom, text: el.textContent.trim().slice(0, 30)}; };
    const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const pairs = list => { for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (hit(list[i], list[j])) return [list[i], list[j]]; return null; };
    const labels = [...document.querySelectorAll('#fridgeShelf .fridge-label')].map(box);
    const shapes = [...document.querySelectorAll('#fridgeShelf .fridge-shape svg > path:first-of-type')].map(box);
    const tags = [...document.querySelectorAll('#rfUnit .rf-tag')].filter(t => t.offsetParent).map(box);
    const head = document.querySelector('.fridgeview-head').getBoundingClientRect().bottom;
    const items = [...document.querySelectorAll('#fridgeShelf .fridge-item')].map(box);
    const headBox = box(document.querySelector('.fridgeview-head'));
    const tagOnHeading = tags.find(t => hit(t, headBox)) || null;
    return {
      labels: labels.length, tags: tags.length, rows: document.querySelectorAll('#fridgeShelf .fridge-row').length,
      lineArtLabels: pairs(labels), labelOnFood: labels.flatMap(l => shapes.filter(s => hit(l, s)).map(s => [l, s]))[0] || null,
      illustratedTags: pairs(tags), aboveHeading: items.filter(i => i.top < head - 0.5)[0] || tagOnHeading
    };
  });
  console.log(`${where}: line-art ${res.labels} labels on ${res.rows} shelves, illustrated ${res.tags} tags`);
  if (res.lineArtLabels) throw new Error(`${where}: line-art labels overlap: ${JSON.stringify(res.lineArtLabels)}`);
  if (res.labelOnFood) throw new Error(`${where}: a line-art label sits on a food: ${JSON.stringify(res.labelOnFood)}`);
  if (res.illustratedTags) throw new Error(`${where}: illustrated tags overlap: ${JSON.stringify(res.illustratedTags)}`);
  if (res.aboveHeading) throw new Error(`${where}: an item is drawn above the fridge heading: ${JSON.stringify(res.aboveHeading)}`);
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
  if (fridgeCount.trim() !== '25 items') throw new Error(`expected "25 items", got "${fridgeCount.trim()}"`);

  await page.waitForTimeout(900);
  const layout = await assertFridgeLayout(page, 'haul at 390px');
  if (layout.rows < 2) throw new Error('a 25-item haul at phone width should need more than one shelf');
  expectEqual('every savable item labelled', layout.labels, 22);

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
  // emptied (every item in it was part of tonight's dish), factAt()
  // legitimately returns null -- confirm the fallback copy renders
  // instead of the template printing the literal word "null".
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
  const emptyFact = await page2.textContent('#tomorrow .daily-fact');
  console.log('Tomorrow fact when the projection is fully emptied:', emptyFact.trim());
  if (emptyFact.trim() === 'null') throw new Error('factAt() returning null leaked the literal word "null" into the page');
  if (!emptyFact.trim()) throw new Error('expected fallback copy for an emptied projection, got nothing');
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
  await page.fill('#entry', 'chicken, spinach, milk, onion, egg 34d');
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
  const tonightH2 = await page.textContent('#tonight h2');
  const tomorrowDishName = await page.textContent('#tomorrow .dish-name');
  console.log('Tonight:', tonightH2.trim());
  console.log('Tomorrow dish-sub:', tomorrowDishName.trim());
  if (tonightH2.trim() !== 'Yogurt bowl with mango') throw new Error(`expected tonight's near-miss to be "Yogurt bowl with mango", got "${tonightH2.trim()}"`);
  const expected = 'Same dish as tonight: Yogurt bowl with mango.';
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
  const tossBtn = await livePage.$('[data-toss]');
  if (tossBtn) await tossBtn.click();
  await livePage.waitForTimeout(100);
  const cookBtn = await livePage.$('.js-cook');
  if (cookBtn) await cookBtn.click();
  await livePage.waitForTimeout(100);

  const savedState = await livePage.evaluate(() => localStorage.getItem('perishable.v1'));
  if (!savedState) throw new Error('origin/main produced no saved state to migrate -- nothing to test');
  const parsed = JSON.parse(savedState);
  const expectedCount = parsed.fridge.length;
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

  const newCount = await page.textContent('#count');
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
  const shelfItems = await page.$$eval('#fridgeShelf .fridge-item', els => els.length);
  const drawerItems = await page.$$eval('#fridgeDrawerItems .fridge-item', els => els.length);
  console.log('fridge view: shelf =', shelfItems, ', drawer =', drawerItems);
  if (shelfItems + drawerItems !== expectedCount) throw new Error(`fridge view shows ${shelfItems + drawerItems} items total, expected ${expectedCount}`);

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
  await page.click('.rf-head');
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
  const shown = await page.$$eval('#rows .row', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
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
const previewOpen = page => page.$eval('#voicePreview', el => el.style.display !== 'none' && !!el.querySelector('.receipt-row'));
function readReview(page, box) {
  return page.$$eval(`${box} .receipt-row`, els => els.map(el => ({
    name: (el.querySelector('.entry-name') || el.querySelector('input[type=text]')).textContent.trim() ||
          (el.querySelector('input[type=text]') || {}).value,
    flag: el.classList.contains('unresolved') ? 'no match / choice' : el.classList.contains('needs-date') ? 'needs date' : '',
    match: (el.querySelector('.match') || { textContent: '' }).textContent.replace(/\s+/g, ' ').trim(),
    options: [...el.querySelectorAll('.entry-pick option')].slice(1).map(o => o.textContent)
  })));
}
function readInventory(page) {
  return page.$$eval('#rows .row', els => els.map(e => ({
    name: e.querySelector('.name').childNodes[0].textContent.trim(),
    left: e.querySelector('.left').textContent.trim(),
    g: e.querySelector('.meta').textContent.trim()
  })));
}
const isoIn = (page, n) => page.evaluate(n => new Date((today() + n - DAY_OFFSET) * 86400000).toISOString().slice(0, 10), n);
async function popoverText(page, key) {
  const id = await page.evaluate(k => fridge.find(i => i.key === k).id, key);
  await page.$eval(`[data-rf-item="${id}"]`, el => el.click());
  await page.waitForTimeout(80);
  const text = (await page.textContent('#rfPopover')).replace(/\s+/g, ' ').trim();
  await page.click('.rf-head');
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
  await typeEntry(page, 'blackberries, chicken salad 1d');
  if (await previewOpen(page)) throw new Error('both match one FoodKeeper item with days; nothing should be asked');
  const rows = await readInventory(page);
  console.log('inventory:', JSON.stringify(rows));
  const med = await page.evaluate(() => [CAT_MEDIANS.soft.g, CAT_MEDIANS.cooked.g]);
  expectRow(rows, 'Blackberries', '6 days', `≈${med[0]} g`);   // #253, 6
  expectRow(rows, 'Chicken salad', '3 days', `≈${med[1]} g`);                               // #418, 4, bought 1 day ago
  await page.waitForTimeout(900);
  const pop = await popoverText(page, '_fk_253');
  console.log('popover:', pop);
  if (!/^× Blackberries/.test(pop)) throw new Error('popover title should be the typed name');
  if (!pop.includes('FoodKeeper #253 “Berries (blackberries, boysenberries, currant)”')) throw new Error('popover source should name #253 and its title');
  // A FoodKeeper-only food counted from ripeness offers Ripe / Not ripe yet.
  await typeEntry(page, 'kiwi fruit');
  const [kiwi] = await readReview(page, '#voicePreview');
  console.log(' ', kiwi.name, '|', kiwi.flag || 'ok', '|', kiwi.match);
  if (!kiwi.match.includes('Ripe') || !kiwi.match.includes('Not ripe yet')) throw new Error('kiwi should offer the ripeness choice');
  await page.click('#voiceDiscard');
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
  const rows = await readReview(page, '#voicePreview');
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
  await page.click('#voiceDiscard');
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

// Equal matches ask; nothing goes in until the person picks.
async function ambiguousScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- AMBIGUOUS: "cheese" and "tortillas" ask which one ---');
  await typeEntry(page, 'cheese, tortillas');
  const rows = await readReview(page, '#voicePreview');
  rows.forEach(r => console.log(' ', r.name, '|', r.flag, '|', r.options.join(' / ')));
  expectEqual('cheese options', rows[0].options, ['Hard cheese (FOODS)', 'Shredded cheese (FOODS)', 'Soft cheese (FOODS)']);
  expectEqual('tortilla options', rows[1].options, ['Flour tortillas (FOODS)', 'Corn tortillas (FOODS)']);
  if (!(await page.$eval('#voiceAdd', b => b.disabled))) throw new Error('Add should be blocked while a choice is open');
  await page.click('#addbtn');   // the other Add path refuses too
  if ((await readInventory(page)).length) throw new Error('nothing should be added before the choices are made');
  await page.selectOption('#voicePreview .entry-pick[data-idx="0"]', 'softcheese');
  await page.selectOption('#voicePreview .entry-pick[data-idx="1"]', 'corntortilla');
  await page.click('#voiceAdd');
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
  const [row] = await readReview(page, '#voicePreview');
  console.log(' ', row.name, '|', row.flag, '|', row.match);
  if (!(await page.$eval('#voiceAdd', b => b.disabled))) throw new Error('Add should be blocked with no date');
  await page.click('#addbtn');
  await page.waitForTimeout(80);
  expectEqual('fridge after refused add', (await readInventory(page)).length, 0);
  await page.fill('#voicePreview .entry-date[data-idx="0"]', await isoIn(page, 28));
  await page.click('#voiceAdd');
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
// item asks again.
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
  await page.waitForSelector('#receiptPreview .receipt-row');
  const rows = await readReview(page, '#receiptPreview');
  rows.forEach(r => console.log(' ', r.name, '|', r.flag || 'ok', '|', r.match));
  expectEqual('flags', rows.map(r => r.flag), ['', '', '', 'needs date', 'no match / choice', '', '']);
  expectEqual('scanned names, cleaned', rows.map(r => r.name),
    ['Strawberries', 'Rotisserie chicken', 'Avocados', 'Sour cream', 'Tortillas', 'Plums', 'Salmon']);
  if (!rows[0].match.includes('FOODS, FoodKeeper #481')) throw new Error('strawberries should match FOODS (#481)');
  if (!rows[2].match.includes('Not ripe yet')) throw new Error('avocados should offer the ripeness choice');
  if (!rows[5].match.includes('FoodKeeper #266') || !rows[5].match.includes('Not ripe yet')) throw new Error('plums should match FoodKeeper #266 and offer the ripeness choice');
  if (!(await page.$eval('#receiptConfirm', b => b.disabled))) throw new Error('confirm should be blocked');

  await page.check('#receiptPreview .entry-ripe[data-idx="2"][value="unripe"]');
  await page.fill('#receiptPreview .entry-date[data-idx="3"]', await isoIn(page, 21));
  await page.selectOption('#receiptPreview .entry-pick[data-idx="4"]', 'flourtortilla');
  await page.fill('#receiptPreview .entry-date[data-idx="4"]', await isoIn(page, 30));
  await page.click('#receiptConfirm');
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
  const heading = await page.textContent('#voicePreview > div:first-child');
  console.log('restock sour cream:', heading.trim());
  if (!/needs the date/.test(heading)) throw new Error('restocking sour cream should ask for the date');
  await page.fill('#voicePreview .entry-date[data-idx="0"]', await isoIn(page, 25));
  await page.click('#voiceAdd');
  await page.waitForTimeout(100);
  const after = await readInventory(page);
  expectEqual('sour cream rows after restock', after.filter(r => r.name === 'Sour cream').length, 1);
  expectRow(after, 'Sour cream', '25 days');
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
async function seedMixed18(page) {
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(items => {
    const d = new Date(), T = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
    const fridge = [], standing = {};
    items.forEach(([key, ago, shelf, custom, name], i) => {
      const it = {id: i + 1, key, bought: T - ago, custom: custom || null};
      if (name) it.name = name;
      if (shelf != null){ it.shelf = shelf; it.shelfFrom = 'date'; }
      fridge.push(it);
      standing[key] = {count: 1, lastBought: T - ago, custom: custom || null, ...(name ? {name} : {})};
    });
    localStorage.setItem('perishable.v1', JSON.stringify({schema: 3, fridge, standing,
      ledger: {wasteG: 0, wasteUSD: 0, savedG: 0}, uid: items.length, startedAt: T - 15, lastVisit: T}));
  }, MIXED_18);
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
  const chips = await page.$$eval('#tonight .chip', els => els.map(e => e.textContent.trim()));
  console.log('tonight:', h2, JSON.stringify(chips));
  expectEqual('tonight dish', h2, 'Creamy chicken spinach rice');
  if (!chips.some(c => /^(Rotisserie chicken|Chicken thighs) · \d+d$/.test(c))) throw new Error('chicken should be filled by the thighs or the rotisserie chicken');
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
    const names = await page.$$eval('#fridgeShelf .fridge-label', els => els.map(e => e.childNodes[0].textContent.trim()));
    if (names.some(n => /nectarines|sapote|\(/.test(n))) throw new Error('a label shows a FoodKeeper title: ' + JSON.stringify(names));
    await assertFridgeLayout(page, `mixed 18 at ${w}px`);
    await (await page.$('#rfUnit')).screenshot({ path: path.join(OUT, `mixed18-illustrated-${tag}.png`) });
    await (await page.$('.fridgeview')).screenshot({ path: path.join(OUT, `mixed18-lineart-${tag}.png`) });
    if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
    await page.context().close();
  }
}

// A date set by hand (list Edit mode or the popover) is stored on the
// item: changing the FOODS value and reloading leaves it alone, while an
// unedited item follows the new value.
async function editDateScenario(browser) {
  const { page, errors } = await freshPage(browser);
  console.log('\n--- EDIT DATES: a date I set survives a FOODS change ---');
  await typeEntry(page, 'spinach, yogurt, tofu');
  await page.click('#rowsEdit');
  await page.fill('.row-date[data-date="1"]', await isoIn(page, 10));
  await page.waitForTimeout(100);
  await page.click('#rowsEdit');
  await page.waitForTimeout(900);
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
      .replace("spinach:    {en:'Spinach',        shelf:7,", "spinach:    {en:'Spinach',        shelf:3,")
      .replace("yogurt:     {en:'Yogurt',         shelf:14,", "yogurt:     {en:'Yogurt',         shelf:30,")
      .replace("tofu:       {en:'Tofu',           shelf:7,", "tofu:       {en:'Tofu',           shelf:2,");
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
  expectEqual('first-time default', await page.$eval('#voicePreview .entry-ripe:checked', r => r.value), 'ripe');
  expectEqual('pineapple asks nothing', await page.$$eval('#voicePreview .entry-ripe[data-idx="1"]', r => r.length), 0);
  if (await page.$eval('#voiceAdd', b => b.disabled)) throw new Error('a ripeness choice has a default; Add should be enabled');
  await page.check('#voicePreview .entry-ripe[data-idx="0"][value="unripe"]');
  await page.click('#voiceAdd');
  await page.waitForTimeout(100);
  let inv = await readInventory(page);
  console.log('after adding:', JSON.stringify(inv.map(r => r.name + ' ' + r.left)));
  expectRow(inv, 'Banana', 'ripening');
  expectRow(inv, 'Pineapple', '7 days');
  const later = await page.evaluate(() => { const b = fridge.find(i => i.key === 'banana'); return [leftAt(b, today() + 10), decayFraction(b, today() + 10)]; });
  expectEqual('ten days on, still no countdown or decay', later, [3, 0]);

  await typeEntry(page, 'bananas');
  expectEqual('remembered default', await page.$eval('#voicePreview .entry-ripe:checked', r => r.value), 'unripe');
  await page.click('#voiceDiscard');
  await page.click('[data-restock="banana"]');
  await page.waitForTimeout(100);
  expectEqual('restock uses the remembered choice', await page.evaluate(() => fridge.find(i => i.key === 'banana').ripening), true);

  await page.click('[data-ripe]');
  await page.waitForTimeout(100);
  inv = await readInventory(page);
  console.log('after It\'s ripe:', JSON.stringify(inv.map(r => r.name + ' ' + r.left)));
  expectRow(inv, 'Banana', '3 days');
  if (errors.length) throw new Error(`console errors: ${JSON.stringify(errors)}`);
  await page.context().close();
}

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });

  await scenario(browser, 'ALL FRESH', 'spinach, milk, chicken, onion', 'scn-fresh.png');
  await scenario(browser, 'ALL PAST DATE', 'spinach 10d, milk 12d, chicken 10d', 'scn-gone.png');
  await scenario(browser, 'MIXED', 'chicken 10d, spinach, milk, onion', 'scn-mixed.png');
  await receiptScenario(browser);
  await recommendationScenario(browser);
  await noRiskScenario(browser);
  await fridgeGradientScenario(browser);
  await fridgeHaulScenario(browser);
  await fridgeFactBugScenario(browser);
  await pluralAgreementScenario(browser);
  await dishRepeatScenario(browser);
  await migrationScenario(browser);
  await legacyMapScenario(browser);
  await legacyLinkScenario(browser);
  await legacyOnceScenario(browser);
  await legacyUnmappedScenario(browser);
  await splitEntriesScenario(browser);
  await realFridgeDoorLoadScenario(browser);
  await realFridgeHandleToggleScenario(browser);
  await realFridgeReducedMotionScenario(browser);
  await realFridgeClosedCountScenario(browser);
  await realFridgeItemTapScenario(browser);
  await fkOnlyScenario(browser);
  await aliasScenario(browser);
  await noFalseMatchScenario(browser);
  await ambiguousScenario(browser);
  await noMatchScenario(browser);
  await receiptNewItemsScenario(browser);
  await restockNoWasteScenario(browser);
  await mixedFridgeScenario(browser);
  await dishFixtureScenario(browser);
  await editDateScenario(browser);
  await ripenessScenario(browser);

  await browser.close();
  server.close();
  console.log(`\nScreenshots written to ${OUT}`);
})();
