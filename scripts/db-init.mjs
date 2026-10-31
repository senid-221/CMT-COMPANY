import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const envPath = path.resolve('.env');

if (!fs.existsSync(envPath)) {
  console.error('No .env in this folder. Create one from .env.example and fill in the Neon values first.');
  process.exit(1);
}

const fileVars = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const match = /^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*)$/.exec(line);
  if (!match) continue;
  const quote = match[2].trim()[0];
  fileVars[match[1]] =
    (quote === '"' || quote === "'") && match[2].trim().endsWith(quote)
      ? match[2].trim().slice(1, -1)
      : match[2].trim().replace(/\s+#.*$/, '');
}

const url = (fileVars.DATABASE_URL ?? '').trim();
if (url.includes('*****') || !/^postgres(ql)?:\/\//.test(url)) {
  console.error('Fill DATABASE_URL in .env with the Neon Postgres connection string, then run this again.');
  process.exit(1);
}

// Prisma cannot open a database whose name contains a space; it reports
// "Can't reach database server" and every data-backed page returns 500.
const database = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
if (/\s/.test(database)) {
  console.error(`The database name "${database}" contains a space. Create a database named citymarket in Neon and put it in DATABASE_URL.`);
  process.exit(1);
}

// .env is authoritative here: .env.local still points at the local SQLite file,
// and the seed scripts must not fall back to it.
const childEnv = { ...process.env, ...fileVars, DATABASE_URL: (fileVars.DIRECT_URL ?? '').trim() || url };

const prismaCli = path.resolve('node_modules/prisma/build/index.js');
const step = (label) => console.log(`\n==> ${label}`);
const run = (args) => {
  try {
    execFileSync(process.execPath, args, { stdio: 'inherit', env: childEnv });
  } catch {
    console.error('\nStopped: the step above failed. Fix that error and run this command again.');
    process.exit(1);
  }
};

step('Creating tables in Postgres');
run([prismaCli, 'db', 'push', '--schema', 'prisma/schema.prisma']);

step('Seeding catalogue');
run(['prisma/seed.mjs']);

step('Creating seller account');
run(['prisma/seed-seller.mjs']);

step('Creating admin account');
run(['prisma/seed-admin.mjs']);

step('Restoring the local SQLite client');
run([prismaCli, 'generate', '--schema', 'prisma/schema.local.prisma']);

console.log('\nProduction database ready.');
