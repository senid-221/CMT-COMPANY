import fs from 'node:fs';
import path from 'node:path';

const manifest = JSON.parse(fs.readFileSync('prisma/media-manifest.json', 'utf8'));
const out = path.resolve('public/media');
fs.mkdirSync(out, { recursive: true });

let ok = 0;
const failures = [];

for (const { url, file } of manifest) {
  const dest = path.join(out, file);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    ok++;
    continue;
  }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 64) throw new Error('empty body');
    fs.writeFileSync(dest, buf);
    ok++;
  } catch (err) {
    failures.push({ file, url, error: String(err.message || err) });
  }
}

fs.writeFileSync('prisma/media-failures.json', JSON.stringify(failures, null, 2));
console.log(`downloaded ${ok}/${manifest.length} into public/media`);
for (const f of failures) console.log(`  FAIL ${f.file}: ${f.error}`);
