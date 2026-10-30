import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const src = path.resolve('public/media');
const out = path.resolve('public/media/optimized');
fs.mkdirSync(out, { recursive: true });

const catalogPath = path.resolve('prisma/catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const targets = [
  ...catalog.categories.map((c) => c.image),
  ...catalog.products.map((p) => p.image),
];

let converted = 0;
const missing = [];

for (const rel of targets) {
  const inFile = path.resolve('public', rel.replace(/^\//, ''));
  if (!fs.existsSync(inFile)) {
    missing.push(rel);
    continue;
  }
  const base = path.basename(inFile).replace(/\.(png|jpe?g|svg|webp|gif)$/i, '');
  const outFile = path.join(out, `${base}.webp`);
  if (!fs.existsSync(outFile)) {
    await sharp(inFile, { failOn: 'none' })
      .resize({ width: 720, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(outFile);
  }
  converted++;
}

for (const list of [catalog.categories, catalog.products]) {
  for (const row of list) {
    row.image = `/media/optimized/${path.basename(row.image).replace(/\.[a-z]+$/i, '')}.webp`;
  }
}
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));

console.log(`webp ready: ${converted}/${targets.length}`);
if (missing.length) console.log(`missing sources: ${missing.join(', ')}`);
