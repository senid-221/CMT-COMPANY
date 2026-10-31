export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.error('[db] DATABASE_URL is not set');
    return;
  }

  let target: { host: string; database: string };
  try {
    const parsed = new URL(raw);
    target = { host: parsed.hostname, database: decodeURIComponent(parsed.pathname.replace(/^\//, '')) };
  } catch {
    console.error('[db] DATABASE_URL is not a valid URL');
    return;
  }

  console.log(`[db] target host=${target.host} database="${target.database}"`);
  if (/\s/.test(target.database)) {
    console.error('[db] the database name contains a space; Prisma cannot connect to it. Point DATABASE_URL at a database named citymarket.');
  }

  try {
    const { prisma } = await import('./lib/db');
    await prisma.$queryRaw`SELECT 1`;
    console.log('[db] connection ok');
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n').filter(Boolean).slice(-1)[0] : String(error);
    console.error(`[db] connection failed: ${message}`);
  }
}
