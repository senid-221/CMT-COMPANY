import fs from 'node:fs';
import path from 'node:path';

const srcDir = path.resolve('src');
const i18nFile = path.resolve('src/lib/i18n.ts');

const declared = new Set(
  [...fs.readFileSync(i18nFile, 'utf8').matchAll(/^\s*'([a-zA-Z0-9._-]+)':\s*\[/gm)].map((m) => m[1]),
);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.tsx?$/.test(entry.name)) yield full;
  }
}

const used = new Map();
for (const file of walk(srcDir)) {
  if (file === i18nFile) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/\bt\(\s*locale\s*,\s*'([a-zA-Z0-9._-]+)'/g)) {
    if (!used.has(m[1])) used.set(m[1], []);
    used.get(m[1]).push(path.relative(process.cwd(), file));
  }
  for (const m of text.matchAll(/:\s*'([a-zA-Z]+\.[a-zA-Z0-9._-]+)'\s*(?:\||,|;)/g)) {
    const key = m[1];
    if (key.includes('.')) used.set(key, used.get(key) ?? [path.relative(process.cwd(), file)]);
  }
}

const missing = [...used.keys()].filter((k) => !declared.has(k)).sort();
const unused = [...declared].filter((k) => !used.has(k)).sort();

console.log(`declared ${declared.size} keys, referenced ${used.size}`);
if (missing.length) {
  console.log('MISSING (referenced but not declared):');
  for (const k of missing) console.log(`  ${k}  ← ${[...new Set(used.get(k))].join(', ')}`);
}
if (unused.length) {
  console.log(`unused declared keys: ${unused.join(', ')}`);
}
process.exitCode = missing.length ? 1 : 0;
