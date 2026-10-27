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

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });

  await scenario(browser, 'ALL FRESH', 'spinach, milk, chicken, onion', 'scn-fresh.png');
  await scenario(browser, 'ALL PAST DATE', 'spinach 10d, milk 12d, chicken 10d', 'scn-gone.png');
  await scenario(browser, 'MIXED', 'chicken 10d, spinach, milk, onion', 'scn-mixed.png');
  await receiptScenario(browser);

  await browser.close();
  server.close();
  console.log(`\nScreenshots written to ${OUT}`);
})();
