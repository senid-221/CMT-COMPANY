import '../prisma/load-env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const data = JSON.parse(fs.readFileSync(path.resolve('prisma/mtn-deals-catalog.json'), 'utf8'));
const prisma = new PrismaClient();

async function main() {
  const seller = await prisma.seller.findFirst({ where: { name: data.sellerName }, select: { id: true, name: true } });
  if (!seller) throw new Error(`seller not found: ${data.sellerName}`);

  const categoryIds = new Map(
    (await prisma.category.findMany({ select: { id: true, handle: true } })).map((c) => [c.handle, c.id]),
  );

  let imported = 0;
  for (const p of data.products) {
    const categoryId = categoryIds.get(p.category);
    if (!categoryId) throw new Error(`category not found: ${p.category}`);

    const fields = {
      name: p.name,
      nameFr: p.nameFr ?? null,
      searchName: `${p.name} ${p.nameFr ?? ''}`.toLowerCase(),
      description: p.description,
      descriptionFr: p.descriptionFr ?? null,
      unit: p.unit,
      priceCents: p.priceCents,
      compareAtCents: p.compareAtCents ?? null,
      image: p.image,
      featured: p.featured === true,
      stock: p.stock,
      categoryId,
      sellerId: seller.id,
    };

    await prisma.product.upsert({
      where: { handle: p.handle },
      update: fields,
      create: { handle: p.handle, ...fields },
    });
    imported++;
  }

  const owned = await prisma.product.count({ where: { sellerId: seller.id } });
  console.log(`imported ${imported} MTN deal product(s) for ${seller.name}; seller now owns ${owned} product(s)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
