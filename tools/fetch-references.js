#!/usr/bin/env node
// Reference photos for drawing: for each food, a few photographs from
// Wikimedia Commons (bitmap photos only, free licences only), saved under
// tools/references/web/<key>/ with a sources.json naming each file's page,
// author and licence. tools/references/web/ is gitignored: these are for
// looking at shape, proportion and identifying features before drawing,
// never for tracing, and never committed. Photos the person puts in
// tools/references/ itself come first.
//
// Run: node tools/fetch-references.js [key,key,...]   (default: all in QUERIES)
// Then: node tools/fetch-references.js --sheet <key,key,...> writes
//   tools/references/web/_sheet.html, every candidate side by side.

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT = path.join(__dirname, 'references', 'web');
const UA = 'PerishableDrawingRefs/0.1 (reference fetcher; no bulk use)';
const FREE = /^(cc0|cc[ -]by(-sa)?[ -]?\d|public domain|pd)/i;

// What to search Commons for, per FOODS key: the food as bought, alone.
const QUERIES = {
  arugula: 'Eruca vesicaria leaves', basil: 'basil leaves', bokchoy: 'bok choy',
  cabbage: 'green cabbage head', celery: 'celery stalks bunch', choysum: 'choy sum', cilantro: 'coriander leaves',
  gailan: 'gai lan Chinese broccoli', garlicchives: 'Allium tuberosum', kale: 'curly kale leaves',
  leaflettuce: 'leaf lettuce', leek: 'leeks vegetable', napacabbage: 'napa cabbage', parsley: 'parsley',
  romaine: 'romaine lettuce head', scallion: 'scallions', waterspinach: 'Ipomoea aquatica',
  spinach: 'spinach bunch',
  asparagus: 'asparagus bunch', bambooshoots: 'bamboo shoots vegetable', beansprouts: 'mung bean sprouts', beets: 'beetroot with leaves',
  broccoli: 'broccoli head', brussels: 'brussels sprouts', butternut: 'butternut squash', cauliflower: 'cauliflower head',
  corn: 'corn on the cob husk', daikon: 'daikon radish', edamame: 'edamame pods', ginger: 'ginger root rhizome',
  greenbeans: 'green beans', lotusroot: 'lotus root vegetable', snowpeas: 'snow peas pods', sweetpotato: 'sweet potato tuber',
  taro: 'taro root corm', wintermelon: 'winter melon Benincasa hispida', carrot: 'carrots with tops', babycarrot: 'baby carrots',
  onion: 'yellow onion bulb', garlic: 'garlic bulb', cherrytomato: 'cherry tomatoes on vine', cucumber: 'cucumber vegetable',
  pepper: 'red bell pepper', zucchini: 'zucchini courgette', chineseeggplant: 'Chinese eggplant long purple',
  enoki: 'enoki mushrooms', shiitake: 'shiitake mushrooms',
  bacon: 'raw bacon strips', beef: 'raw ground beef', chickenthigh: 'raw chicken thighs', groundturkey: 'raw ground turkey',
  porkchop: 'raw pork chop', salmon: 'raw salmon fillet', shrimp: 'raw shrimp prawns', steak: 'raw ribeye steak',
  chicken: 'raw chicken breast', tofu: 'tofu block',
  yogurt: 'yogurt container', cottagecheese: 'cottage cheese', creamcheese: 'cream cheese foil brick', halfandhalf: 'half and half carton',
  heavycream: 'cream carton', shreddedcheese: 'shredded cheese', softcheese: 'brie cheese', sourcream: 'sour cream',
  stringcheese: 'string cheese', butter: 'butter stick block', hardcheese: 'cheddar cheese block', egg: 'egg carton', milk: 'milk carton gable top',
  bread: 'loaf of bread sliced', cookedrice: 'cooked white rice', corntortilla: 'corn tortillas stack', flourtortilla: 'flour tortillas',
  hummus: 'hummus', rotisserie: 'rotisserie chicken', salsa: 'pico de gallo salsa fresca',
  apple: 'apple fruit', orange: 'orange fruit', mandarin: 'mandarin orange fruit leaf', grapefruit: 'grapefruit',
  avocado: 'avocado fruit', pear: 'pear fruit', peach: 'peach fruit', plum: 'plum fruit', pineapple: 'pineapple fruit',
  strawberry: 'strawberry fruit', blueberry: 'blueberries', raspberry: 'raspberries', blackberry: 'blackberries', grapes: 'grapes bunch',
  cherries: 'cherries fruit', cantaloupe: 'cantaloupe melon', honeydew: 'honeydew melon', coconut: 'coconut husked brown',
  pomegranate: 'pomegranate fruit', papaya: 'papaya fruit', dragonfruit: 'dragon fruit pitaya', fig: 'fig fruit',
  persimmon: 'persimmon fruit', asianpear: 'Asian pear nashi', lychee: 'lychee fruit',
  ketchup: 'ketchup squeeze bottle', mustard: 'yellow mustard bottle', mayonnaise: 'mayonnaise jar', soysauce: 'soy sauce bottle',
  hotsauce: 'hot sauce bottle sriracha', jam: 'jam jar', pickles: 'pickles jar', relish: 'pickle relish jar', jarredsalsa: 'salsa jar',
  tahini: 'tahini jar', horseradish: 'horseradish jar', pesto: 'pesto jar', hoisin: 'hoisin sauce', oystersauce: 'oyster sauce bottle',
  bbqsauce: 'barbecue sauce bottle', teriyaki: 'teriyaki sauce', saladdressing: 'salad dressing bottle', creamydressing: 'ranch dressing',
  vinaigrette: 'vinaigrette bottle',
  icecream: 'ice cream tub', icepops: 'ice pops popsicles', frozenberries: 'frozen berries bag', frozenveg: 'frozen vegetables bag',
  frozenpizza: 'frozen pizza box', frozendumplings: 'frozen dumplings bag',
  leftovers: 'leftovers food container', beer: 'beer bottle', cannedbeer: 'beer can', hardcider: 'cider can', hardseltzer: 'seltzer can slim',
  redwine: 'red wine bottle', whitewine: 'white wine bottle', rose: 'rose wine bottle', sparklingwine: 'champagne bottle',
  vermouth: 'vermouth bottle', sake: 'sake bottle', soju: 'soju bottle', vodka: 'vodka bottle', gin: 'gin bottle', rum: 'rum bottle',
  tequila: 'tequila bottle', mezcal: 'mezcal bottle', whiskey: 'whiskey bottle', bourbon: 'bourbon bottle', scotch: 'scotch whisky bottle',
  brandy: 'brandy bottle', cognac: 'cognac bottle', baijiu: 'baijiu bottle', liquor: 'liquor bottle', creamliqueur: 'cream liqueur bottle'
};

// One request a second, and a longer wait and a retry when Wikimedia asks
// to slow down (429).
const pause = ms => new Promise(r => setTimeout(r, ms));
async function get(url, tries = 4) {
  await pause(1000);
  try { return await get1(url); } catch (e) {
    if (tries > 1 && /^429/.test(e.message)) { await pause(15000); return get(url, tries - 1); }
    throw e;
  }
}
function get1(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': UA } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return resolve(get1(res.headers.location));
      if (res.statusCode !== 200) return reject(new Error(res.statusCode + ' ' + url));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}
const strip = s => String(s || '').replace(/<[^>]+>/g, '').trim();

// Each food's Wikipedia article, whose lead photo is usually the food as
// bought (default: the search words). Its file lives on Commons.
const WIKI = {
  arugula: 'Eruca vesicaria', basil: 'Basil', bokchoy: 'Bok choy', cabbage: 'Cabbage', celery: 'Celery', choysum: 'Choy sum',
  cilantro: 'Coriander', gailan: 'Gai lan', garlicchives: 'Allium tuberosum', kale: 'Kale', leaflettuce: 'Lettuce', leek: 'Leek',
  napacabbage: 'Napa cabbage', parsley: 'Parsley', romaine: 'Romaine lettuce', scallion: 'Scallion', waterspinach: 'Ipomoea aquatica',
  spinach: 'Spinach', asparagus: 'Asparagus', bambooshoots: 'Bamboo shoot', beansprouts: 'Bean sprout', beets: 'Beetroot',
  broccoli: 'Broccoli', brussels: 'Brussels sprout', butternut: 'Butternut squash', cauliflower: 'Cauliflower', corn: 'Corn on the cob',
  daikon: 'Daikon', edamame: 'Edamame', ginger: 'Ginger', greenbeans: 'Green bean', lotusroot: 'Nelumbo nucifera', snowpeas: 'Snow pea',
  sweetpotato: 'Sweet potato', taro: 'Taro', wintermelon: 'Wax gourd', babycarrot: 'Baby carrot', cherrytomato: 'Cherry tomato',
  cucumber: 'Cucumber', pepper: 'Bell pepper', zucchini: 'Zucchini', chineseeggplant: 'Eggplant', enoki: 'Enokitake', shiitake: 'Shiitake',
  bacon: 'Bacon', beef: 'Ground beef', chickenthigh: 'Chicken thighs', groundturkey: 'Ground turkey', porkchop: 'Pork chop', salmon: 'Salmon as food',
  shrimp: 'Shrimp and prawn as food', steak: 'Steak', yogurt: 'Yogurt', cottagecheese: 'Cottage cheese', creamcheese: 'Cream cheese',
  halfandhalf: 'Half and half', heavycream: 'Cream', shreddedcheese: 'Shredded cheese', softcheese: 'Brie', sourcream: 'Sour cream',
  stringcheese: 'String cheese', bread: 'Bread', cookedrice: 'Cooked rice', corntortilla: 'Corn tortilla', flourtortilla: 'Flour tortilla',
  hummus: 'Hummus', rotisserie: 'Rotisserie chicken', salsa: 'Pico de gallo', ketchup: 'Ketchup', mustard: 'Mustard (condiment)',
  mayonnaise: 'Mayonnaise', soysauce: 'Soy sauce', hotsauce: 'Sriracha', jam: 'Fruit preserves', pickles: 'Pickled cucumber', relish: 'Relish',
  jarredsalsa: 'Salsa (sauce)', tahini: 'Tahini', horseradish: 'Horseradish', pesto: 'Pesto', hoisin: 'Hoisin sauce', oystersauce: 'Oyster sauce',
  bbqsauce: 'Barbecue sauce', teriyaki: 'Teriyaki', saladdressing: 'Salad dressing', creamydressing: 'Ranch dressing', vinaigrette: 'Vinaigrette',
  icecream: 'Ice cream', icepops: 'Ice pop', frozenpizza: 'Frozen pizza', frozendumplings: 'Jiaozi', sake: 'Sake', soju: 'Soju', baijiu: 'Baijiu',
  vermouth: 'Vermouth', creamliqueur: 'Irish cream', mezcal: 'Mezcal', cognac: 'Cognac', hardseltzer: 'Hard seltzer', hardcider: 'Cider'
};

async function commonsFile(title) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=480&format=json`;
  return Object.values(JSON.parse(await get(api)).query.pages)[0];
}
// A photograph (jpeg), freely licensed, not an illustration: its record.
function usable(p) {
  const ii = (p && p.imageinfo || [])[0];
  if (!ii || ii.mime !== 'image/jpeg') return null;
  const md = ii.extmetadata || {};
  const lic = strip(md.LicenseShortName && md.LicenseShortName.value);
  if (!FREE.test(lic)) return null;
  const text = (p.title + ' ' + strip(md.ImageDescription && md.ImageDescription.value) + ' ' + strip(md.Categories && md.Categories.value)).toLowerCase();
  if (/illustration|drawing|painting|clipart|ai[- ]generated|artificial intelligence|diagram|logo|still life|seed catalog/.test(text)) return null;
  return { url: ii.thumburl, page: ii.descriptionurl, title: p.title, licence: lic, author: strip(md.Artist && md.Artist.value) };
}

async function fetchKey(key, want = 3) {
  const found = [];
  const wiki = WIKI[key] || QUERIES[key];
  try {
    const w = JSON.parse(await get(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wiki)}&prop=pageimages|images&piprop=name&imlimit=30&redirects=1&format=json`));
    const page = Object.values(w.query.pages)[0];
    const names = [page.pageimage && 'File:' + page.pageimage, ...(page.images || []).map(i => i.title)].filter(Boolean);
    for (const n of [...new Set(names)].filter(n => /\.jpe?g$/i.test(n)).slice(0, 8)) {
      const u = usable(await commonsFile(n));
      if (u) found.push(u);
      if (found.length >= want) break;
    }
  } catch (e) { /* no article: search only */ }
  if (found.length < want) {
    const q = encodeURIComponent(QUERIES[key] + ' filetype:bitmap');
    const data = JSON.parse(await get(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=15&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=480&format=json`));
    for (const p of Object.values((data.query || {}).pages || {}).sort((a, b) => a.index - b.index)) {
      if (found.length >= want) break;
      const u = usable(p);
      if (u && !found.some(f => f.title === u.title)) found.push(u);
    }
  }
  const dir = path.join(OUT, key);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const sources = [];
  for (const f of found) {
    const file = String(sources.length + 1) + '.jpg';
    try { fs.writeFileSync(path.join(dir, file), await get(f.url)); } catch (e) { continue; }
    sources.push({ file, page: f.page, title: f.title, licence: f.licence, author: f.author });
  }
  fs.writeFileSync(path.join(dir, 'sources.json'), JSON.stringify(sources, null, 1));
  return sources.length;
}

function sheet(keys) {
  const cells = keys.map(k => {
    const dir = path.join(OUT, k);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).sort() : [];
    return `<div style="margin:6px 0"><div style="font:12px monospace">${k}</div>${files.map(f =>
      `<img src="${k}/${f}" style="height:150px;margin-right:4px"><span style="font:10px monospace">${f}</span>`).join('')}</div>`;
  }).join('');
  fs.writeFileSync(path.join(OUT, '_sheet.html'), `<!doctype html><body style="margin:8px;background:#fff">${cells}</body>`);
}

if (process.argv[2] !== '--keep') (async () => {
  const args = process.argv.slice(2);
  if (args[0] === '--sheet') { sheet(args[1].split(',')); console.log('sheet written'); return; }
  const keys = args[0] ? args[0].split(',') : Object.keys(QUERIES);
  for (const k of keys) {
    if (!QUERIES[k]) { console.log('no query for', k); continue; }
    try { console.log(k, await fetchKey(k)); } catch (e) { console.log(k, 'failed', e.message); }
  }
})();

// node tools/fetch-references.js --keep key:1,2 key:3 ...  keeps only the
// numbered photos for each food (the one or two clearest), drops the rest.
if (process.argv[2] === '--keep') {
  for (const arg of process.argv.slice(3)) {
    const [key, nums] = arg.split(':'), keep = nums.split(',').map(n => n + '.jpg'), dir = path.join(OUT, key);
    const src = JSON.parse(fs.readFileSync(path.join(dir, 'sources.json'))).filter(s => keep.includes(s.file));
    fs.readdirSync(dir).filter(f => f.endsWith('.jpg') && !keep.includes(f)).forEach(f => fs.unlinkSync(path.join(dir, f)));
    fs.writeFileSync(path.join(dir, 'sources.json'), JSON.stringify(src, null, 1));
  }
  process.exit(0);
}
