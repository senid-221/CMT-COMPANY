import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const catalog = JSON.parse(fs.readFileSync(path.resolve('prisma/aliexpress-catalog.json'), 'utf8'));
const outDir = path.resolve('public/media/optimized');
fs.mkdirSync(outDir, { recursive: true });

const background = catalog.imageBackground ?? '#f5f8fe';
const tile = 720;
const inset = 54;

async function fetchBuffer(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0', accept: 'image/avif,image/webp,image/*,*/*' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) throw new Error(`too small: ${buf.length} bytes`);
      return buf;
    } catch (error) {
      if (attempt === 3) throw new Error(`${url}: ${error.message}`);
      await new Promise((r) => setTimeout(r, 900 * attempt));
    }
  }
  throw new Error(url);
}

let ready = 0;
for (const p of catalog.products) {
  const buffer = await fetchBuffer(p.imageSourceUrl);
  const product = await sharp(buffer, { failOn: 'none' })
    .flatten({ background })
    .resize({ width: tile - inset * 2, height: tile - inset * 2, fit: 'contain', position: 'centre', background })
    .png()
    .toBuffer();
  await sharp({ create: { width: tile, height: tile, channels: 3, background } })
    .composite([{ input: product, gravity: 'centre' }])
    .webp({ quality: 80 })
    .toFile(path.join(outDir, `${p.handle}.webp`));
  ready++;
}

console.log(`aliexpress media ready: ${ready}/${catalog.products.length} (background ${background}, ${inset}px inset)`);
