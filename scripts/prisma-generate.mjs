import '../prisma/load-env.mjs';
import { execSync } from 'node:child_process';

const url = (process.env.DATABASE_URL || '').trim();
const schema = url.startsWith('file:') ? 'prisma/schema.local.prisma' : 'prisma/schema.prisma';

execSync(`prisma generate --schema ${schema}`, { stdio: 'inherit' });
