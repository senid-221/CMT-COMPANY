import '../prisma/load-env.mjs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const url = (process.env.DATABASE_URL ?? '').trim();
const direct = (process.env.DIRECT_URL ?? '').trim() || url;

if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
  console.error('DATABASE_URL must be the Neon Postgres connection string before running this. Set it in .env and try again.');
  process.exit(1);
}

const prismaCli = path.resolve('node_modules/prisma/build/index.js');
const childEnv = { ...process.env, DATABASE_URL: direct };

const step = (label) => console.log(`\n==> ${label}`);
const run = (args) => execFileSync(process.execPath, args, { stdio: 'inherit', env: childEnv });

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
