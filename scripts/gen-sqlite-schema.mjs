import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve('prisma/schema.prisma'), 'utf8');
const local = source
  .replace('provider = "postgresql"', 'provider = "sqlite"')
  .replace('url      = env("DATABASE_URL")', 'url      = env("LOCAL_DB_URL")');

fs.writeFileSync(path.resolve('prisma/schema.local.prisma'), local);
console.log('wrote prisma/schema.local.prisma (sqlite, LOCAL_DB_URL)');
