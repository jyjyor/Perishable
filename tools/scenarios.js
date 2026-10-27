#!/usr/bin/env node
// Three-fridge sanity check for index.html: all fresh, all past date,
// and mixed. Confirms Tonight never builds a recommendation around a
// past-date item, and that the past-date-only state gets its own honest
// copy instead of the generic "doesn't add up to a meal" message.
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

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
const PORT = 8934;
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

  // Stub the network call: canned items cover a FOODS match (milk), an
  // unrecognised item that should fall back to the 7-day estimate
  // (bananas, quantity 2 -> two fridge rows), and a non-food line that
  // must land unchecked. The date is legible, so age is receipt-derived.
  await page.evaluate(() => {
    window.__receiptApiOverride = async () => ({
      date: '2026-10-20',
      items: [
        {raw: 'ORG BANANA', expanded: 'organic bananas', quantity: 2, is_food: true},
        {raw: 'MILK 2% GAL', expanded: 'Milk', quantity: 1, is_food: true},
        {raw: 'PAPER TOWEL 12CT', expanded: 'Paper towels', quantity: 3, is_food: false}
      ]
    });
  });

  const fixturePath = path.join(require('os').tmpdir(), 'perishable-receipt-fixture.jpg');
  fs.writeFileSync(fixturePath, FIXTURE_JPEG);
  await page.setInputFiles('#receiptFile', fixturePath);
  await page.waitForSelector('.receipt-row');

  console.log('\n--- RECEIPT SCAN ---');
  const rows = await page.$$eval('.receipt-row', els => els.map(el => ({
    checked: el.querySelector('input[type=checkbox]').checked,
    name: el.querySelector('input[type=text]').value,
    unresolved: el.classList.contains('unresolved'),
    qty: el.querySelector('.qty').textContent.trim()
  })));
  console.log('review rows:', JSON.stringify(rows));
  const dateLine = await page.textContent('#receiptPreview > div:first-child');
  console.log('date line:', dateLine);

  const expectChecked = [true, true, false];
  rows.forEach((r, i) => {
    if (r.checked !== expectChecked[i]) throw new Error(`row ${i} checked=${r.checked}, expected ${expectChecked[i]}`);
  });
  if (!rows[0].unresolved) throw new Error('bananas should be flagged unresolved');
  if (rows[1].unresolved) throw new Error('milk should resolve against FOODS, not be flagged');

  await page.click('#receiptConfirm');
  await page.waitForTimeout(150);

  const rowNames = await page.$$eval('#rows .row .name', els => els.map(e => e.childNodes[0].textContent.trim()));
  console.log('fridge rows after confirm:', JSON.stringify(rowNames));
  if (rowNames.length !== 3) throw new Error(`expected 3 fridge rows (2 bananas + 1 milk), got ${rowNames.length}`);
  if (rowNames.filter(n => n === 'Organic bananas').length !== 2) throw new Error('expected two banana rows from quantity 2');
  if (!rowNames.includes('Milk')) throw new Error('expected milk to resolve and commit');
  if (rowNames.includes('Paper towels')) throw new Error('unchecked paper towels should not have been added');

  if (errors.length) console.log('console errors:', errors);
  await page.screenshot({ path: path.join(OUT, 'scn-receipt.png'), fullPage: true });
  await page.context().close();
  fs.unlinkSync(fixturePath);
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
  await page.fill('#entry', 'carrot 7d, yogurt 7d, mushrooms 5d, cheese 40d');
  await page.click('#addbtn');
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

// Phase 3: a realistic ~25-item haul (22 savable across every category,
// 3 already gone) -- the point of this one is volume: does the shelf
// actually wrap into a front row plus rows behind it, and does tapping a
// covered (behind-row) item reveal its label the way a shelf item that
// never had a row-mate covering it should not need to.
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
  await page.waitForTimeout(150);

  console.log('\n--- FRIDGE HAUL: ~25 items ---');
  const fridgeCount = await page.textContent('#fridgeCount');
  console.log('fridge count:', fridgeCount);
  if (fridgeCount.trim() !== '25 items') throw new Error(`expected "25 items", got "${fridgeCount.trim()}"`);

  const covered = await page.$$('#fridgeShelf .fridge-item.covered');
  console.log('covered (behind-row) items:', covered.length);
  if (!covered.length) throw new Error('a 25-item haul should overflow into a second row, producing covered items');

  const firstCovered = covered[0];
  const labelBefore = await firstCovered.evaluate(el => getComputedStyle(el.querySelector('.fridge-label')).opacity);
  await firstCovered.click();
  await page.waitForTimeout(250); // let the .15s opacity transition finish before reading it
  const labelAfter = await firstCovered.evaluate(el => getComputedStyle(el.querySelector('.fridge-label')).opacity);
  console.log('covered item label opacity before/after tap:', labelBefore, '->', labelAfter);
  if (labelBefore !== '0' || labelAfter !== '1') throw new Error(`tap-to-reveal didn't toggle label opacity (${labelBefore} -> ${labelAfter})`);

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

  await browser.close();
  server.close();
  console.log(`\nScreenshots written to ${OUT}`);
})();
