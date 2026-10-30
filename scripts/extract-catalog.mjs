import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
const OUT_DIR = path.resolve('prisma');
const MEDIA = path.resolve('public/media');

const text = fs.readFileSync(path.join(SRC, 'lib/app_state.dart'), 'utf8');

function block(varName) {
  const start = text.indexOf(`${varName} = [`);
  if (start === -1) throw new Error(`missing ${varName}`);
  const end = text.indexOf('\n  ];', start);
  return text.slice(start, end);
}

function records(src) {
  const out = [];
  const re = /jsonDecode\(\s*'([\s\S]*?)'\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const raw = m[1].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\$/g, '$');
    try {
      out.push(JSON.parse(raw));
    } catch {
      /* multi-line literal split */
    }
  }
  return out;
}

const categories = records(block('_categories'));
const list1 = records(block('_vegetablesList1'));
const list2 = records(block('_vegetablesList2'));

const KEYWORDS = [
  ['Fruits', ['mango', 'banana', 'apple', 'lemon', 'orange', 'grape', 'pineapple', 'watermelon', 'strawber', 'kiwi', 'pear', 'peach', 'cherry', 'melon', 'fruit']],
  ['Veggies', ['cucumber', 'tomato', 'carrot', 'potato', 'onion', 'garlic', 'spinach', 'cabbage', 'lettuce', 'broccoli', 'pepper', 'brinjal', 'eggplant', 'beans', 'pea', 'corn', 'vegetable', 'greens', 'beetroot', 'radish', 'zucchini', 'cauliflower', 'mushroom']],
  ['Meats', ['beef', 'chicken', 'mutton', 'pork', 'goat', 'meat', 'lamb', 'bacon', 'sausage']],
  ['Seafood', ['fish', 'shrimp', 'prawn', 'crab', 'salmon', 'tuna', 'seafood', 'lobster', 'oyster']],
  ['Dairy & Eggs', ['milk', 'cheese', 'butter', 'egg', 'yogurt', 'curd', 'cream', 'paneer']],
  ['Bakery', ['bread', 'bakery', 'cake', 'muffin', 'croissant', 'bagel', 'bun', 'pastry', 'cookie', 'donut']],
  ['Beverages', ['juice', 'coffee', 'tea', 'water', 'cola', 'soda', 'drink', 'beer', 'wine', 'smoothie', 'lemonade']],
  ['Snacks', ['chip', 'snack', 'popcorn', 'cracker', 'wafer', 'chocolate', 'candy', 'biscuit', 'namkeen', 'nuts', 'almond', 'cashew']],
  ['Pantry', ['rice', 'flour', 'oil', 'salt', 'sugar', 'pasta', 'wheat', 'maize', 'spice', 'honey', 'cereal', 'oats', 'pulse', 'lentil', 'bean', 'soy', 'vinegar', 'sauce', 'pantry', 'flax']],
];

function guessCategory(name) {
  const n = name.toLowerCase();
  for (const [cat, words] of KEYWORDS) {
    if (words.some((w) => n.includes(w))) return cat;
  }
  return 'Pantry';
}

function toCents(priceStr) {
  const usd = Number(String(priceStr).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(usd) || usd <= 0) return null;
  return Math.round(usd * 100);
}

function slug(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function basename(url) {
  return decodeURIComponent(url.split('/').pop().split('?')[0]);
}

function localName(url, fallback) {
  const base = basename(url).replace(/\.[a-z]+$/i, '');
  const s = slug(base);
  return (s && s !== '-' ? s : fallback).slice(0, 60);
}

const seen = new Map();
const seenHandles = new Map();
const products = [];
let dupe = 0;

const NAME_FIXES = { 'Organic lemone fruits': 'Organic lemon fruits' };

for (const [group, rows] of [['featured', list1], ['catalog', list2]]) {
  for (const r of rows) {
    if (!r.name || !r.price) continue;
    const price = toCents(r.price);
    if (price == null) continue;
    const name = NAME_FIXES[r.name.trim()] || r.name.trim();
    let file = localName(r.image || '', slug(name) || `item-${products.length}`);
    while (seen.has(file)) file = `${file}-${++dupe}`;
    seen.set(file, true);
    let handle = slug(name) || `item-${products.length}`;
    while (seenHandles.has(handle)) handle = `${slug(name)}-${(seenHandles.get(slug(name)) || 0) + 1}`;
    seenHandles.set(handle, (seenHandles.get(handle) || 0) + 1);
    products.push({
      handle,
      name,
      unit: (r.quantity || '1 pc').trim(),
      priceCents: price,
      category: guessCategory(name),
      imageSourceUrl: r.image,
      image: `/media/${file}${ext(r.image)}`,
      group,
    });
  }
}

function ext(url) {
  const m = basename(url).match(/\.(png|jpe?g|svg|webp|gif)$/i);
  return m ? `.${m[1].toLowerCase()}` : '.png';
}

const usedCategories = categories.map((c) => c.title).filter(Boolean);
const catRows = usedCategories.map((title) => {
  const src = categories.find((c) => c.title === title);
  return {
    handle: slug(title),
    name: title,
    imageSourceUrl: src.image,
    image: `/media/cat-${slug(title)}${ext(src.image)}`,
    productCount: products.filter((p) => p.category === title).length,
  };
});

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(MEDIA, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'catalog.json'), JSON.stringify({ categories: catRows, products }, null, 2));

const manifest = [
  ...catRows.filter((c) => c.imageSourceUrl).map((c) => ({ url: c.imageSourceUrl, file: path.basename(c.image) })),
  ...products.map((p) => ({ url: p.imageSourceUrl, file: path.basename(p.image) })),
];
fs.writeFileSync(path.join(OUT_DIR, 'media-manifest.json'), JSON.stringify(manifest, null, 2));

const uncategorized = products.filter((p) => !usedCategories.includes(p.category)).map((p) => p.category);
console.log(`categories: ${catRows.length}, products: ${products.length}`);
console.log(`cfa rate: ${RATE}, images to fetch: ${manifest.length}`);
console.log(`orphan category refs: ${[...new Set(uncategorized)].join(', ') || 'none'}`);
for (const c of catRows) console.log(`  ${c.name}: ${c.productCount}`);
