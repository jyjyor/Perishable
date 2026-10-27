#!/usr/bin/env node
// Font-pairing study: five candidate headline/body pairings from the
// han2bam Typekit project, rendered with the same real page content
// (header, big headline, Tonight card, list rows) at the same real sizes
// index.html's own CSS uses -- not a toy mockup. Loads the real
// index.html (so the Typekit <link> is live and every @font-face is
// actually available) and injects the comparison as an overlay, same
// pattern as decay-study.js/mushroom-study.js.
//
// Only the weights the project actually has are used anywhere (no
// synthetic bold/italic): caslonian-std-l 400/700 (+ italics), tonos-
// mono-vf 300-700 variable (+ italic), keedy-sans 400/700, hayate 400
// only, damson 900 only, zingiber-std 400 only.
//
// Run: node tools/font-study.js
// Output: tools/screenshots/font-study.png

const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
const PORT = 8971;
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
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`http://localhost:${PORT}/index.html?v=${Date.now()}`);
  await page.waitForSelector('#headline');
  // Let the Typekit stylesheet's @font-face rules finish loading before
  // screenshotting, or every row would silently render in fallback fonts.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    const MONO = `'tonos-mono-vf', ui-monospace, 'SF Mono', Menlo, monospace`;
    const CASLONIAN = `'caslonian-std-l', Georgia, 'Times New Roman', serif`;
    // Only the weight(s) each project family actually ships are ever used
    // below -- hayate and zingiber-std are 400-only, damson is 900-only,
    // so their headlines render at those weights, not a bolded fake of them.
    const ROWS = [
      { label: '1 — caslonian-std-l (headline + text)', display: CASLONIAN, displayW: 700, body: CASLONIAN, bodyW: 400 },
      { label: '2 — keedy-sans (headline), caslonian-std-l (text)', display: `'keedy-sans', system-ui, sans-serif`, displayW: 700, body: CASLONIAN, bodyW: 400 },
      { label: '3 — hayate (headline, 400 only), caslonian-std-l (text)', display: `'hayate', system-ui, sans-serif`, displayW: 400, body: CASLONIAN, bodyW: 400 },
      { label: '4 — damson (headline, 900 only), caslonian-std-l (text)', display: `'damson', system-ui, sans-serif`, displayW: 900, body: CASLONIAN, bodyW: 400 },
      { label: '5 — zingiber-std (headline, 400 only), caslonian-std-l (text)', display: `'zingiber-std', Georgia, serif`, displayW: 400, body: CASLONIAN, bodyW: 400 }
    ];

    function rowMarkup(cfg, idx){
      // Logo, headline, and dish name are all the row's display family at
      // its one chosen weight -- capping any of them at 700 independently
      // would ask damson (900 only) for a weight it doesn't have, exactly
      // the synthetic-weight problem to avoid.
      const logoW = cfg.displayW;
      const h1W = cfg.displayW;
      const h2W = cfg.displayW;
      return `
      <div style="border:1px solid #B5BFBB;background:#E6EAE8;padding:24px 28px;margin-bottom:22px">
        <div style="font-family:${MONO};font-weight:500;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8B9491;margin-bottom:14px">
          ${cfg.label}</div>

        <div style="display:flex;align-items:center;gap:20px;border-bottom:1px solid #B5BFBB;padding-bottom:10px;margin-bottom:18px">
          <div style="font-family:${cfg.display};font-weight:${logoW};font-size:15px;letter-spacing:.18em;text-transform:uppercase;color:#141817">Perishable</div>
          <div style="font-family:${MONO};font-weight:500;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5C6664">Tue, 10/27</div>
        </div>

        <h1 style="font-family:${cfg.display};font-weight:${h1W};font-size:46px;line-height:1.03;letter-spacing:-.015em;text-transform:uppercase;color:#141817;max-width:16ch">
          <span style="color:#6E3448">1</span> thing becomes waste within 72 hours.</h1>
        <p style="font-family:${cfg.body};font-weight:${cfg.bodyW};font-size:16px;color:#5C6664;max-width:46ch;margin-top:12px">
          Not a shopping list. A list of what you already own and are about to lose.</p>

        <div style="border-top:1px solid #141817;margin-top:24px;padding-top:16px">
          <div style="font-family:${MONO};font-weight:500;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5C6664;margin-bottom:8px">
            Tonight · rescues 3 items</div>
          <div style="font-family:${cfg.display};font-weight:${h2W};font-size:28px;line-height:1.08;letter-spacing:-.01em;color:#141817">
            Creamy chicken spinach rice</div>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
            ${['Chicken breast · 2d', 'Spinach · 7d', 'Milk · 7d', 'Onion, cut · 10d', 'rice'].map(c =>
              `<span style="font-family:${MONO};font-weight:500;font-size:11.5px;letter-spacing:.04em;border:1px solid #B5BFBB;padding:4px 9px;color:#5C6664">${c}</span>`).join('')}
          </div>
        </div>

        <div style="border-top:1px solid #141817;margin-top:24px;padding-top:16px">
          ${[['Chicken breast', '500 g', '2 days'], ['Spinach', '200 g', '7 days'], ['Milk', '900 g', '7 days']].map(([name, g, d]) => `
            <div style="display:flex;align-items:center;gap:16px;padding:9px 0;border-bottom:1px solid #B5BFBB">
              <div style="font-family:${cfg.body};font-weight:${cfg.bodyW};font-size:15px;color:#141817;width:160px">${name}</div>
              <div style="font-family:${MONO};font-weight:500;font-size:11.5px;letter-spacing:.04em;color:#8B9491;width:60px">${g}</div>
              <div style="font-family:${MONO};font-weight:500;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#5C6664">${d}</div>
            </div>`).join('')}
        </div>
      </div>`;
    }

    const container = document.createElement('div');
    container.id = 'fontStudy';
    container.style.cssText = 'position:fixed;top:0;left:0;background:#DCE1DF;padding:28px;z-index:9999;width:900px';
    container.innerHTML =
      `<div style="font-family:${MONO};font-weight:500;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#141817;margin-bottom:18px">
        Font-pairing study -- han2bam Typekit project, real page content and sizes</div>` +
      ROWS.map(rowMarkup).join('');
    document.body.appendChild(container);
  });

  const el = await page.$('#fontStudy');
  await el.screenshot({ path: path.join(OUT, 'font-study.png') });

  if (errors.length) console.log('console errors:', errors);
  console.log('Font study written to', path.join(OUT, 'font-study.png'));

  await browser.close();
  server.close();
})();
