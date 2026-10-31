import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const catalog = JSON.parse(fs.readFileSync(path.resolve('prisma/jumia-bestsellers-catalog.json'), 'utf8'));
const srcDir = path.resolve('public/media');
const outDir = path.resolve('public/media/optimized');
fs.mkdirSync(outDir, { recursive: true });

async function download(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 1024) return;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) throw new Error(`too small: ${buf.length} bytes`);
      fs.writeFileSync(file, buf);
      return;
    } catch (error) {
      if (attempt === 3) throw new Error(`${url}: ${error.message}`);
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

let downloaded = 0;
for (const p of catalog.products) {
  const src = path.join(srcDir, `${p.handle}.jpg`);
  await download(p.imageSourceUrl, src);
  const out = path.join(outDir, `${p.handle}.webp`);
  await sharp(src, { failOn: 'none' })
    .resize({ width: 720, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(out);
  downloaded++;
}

console.log(`jumia media ready: ${downloaded}/${catalog.products.length}`);
