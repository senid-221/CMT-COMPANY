import './load-env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const NAME_FR = {
  'Organic lemon': 'Citron bio',
  'Organic lemon fruits': 'Citrons bio',
  Mango: 'Mangue',
  'Fresh raw beef': 'Bœuf frais',
  'Fresh banana': 'Banane fraîche',
  'Fresh apple': 'Pomme fraîche',
  Avocado: 'Avocat',
  'Raw seabass fish': 'Bar frais',
  Pineapple: 'Ananas',
  'Fresh orange juice': 'Jus d’orange pressé',
  Cucumber: 'Concombre',
  Strawberries: 'Fraises',
  'Ground Beef': 'Bœuf haché',
  'Red Apples': 'Pommes rouges',
  'Sweet Corn': 'Maïs doux',
  'Dragon Fruit': 'Fruit du dragon',
  'Garlic Baguette': 'Baguette à l’ail',
  Blueberries: 'Myrtilles',
  'Chicken Wings': 'Ailes de poulet',
  Leeks: 'Poireaux',
  'Pumpkin Slice': 'Tranche de citrouille',
  Kiwi: 'Kiwi',
  'Whipping Cream': 'Crème fouettée',
  Eggplant: 'Aubergine',
  'Beef Sirloin': 'Contrefilet de bœuf',
  'Wheat Bread': 'Pain de blé',
  'Bok Choy': 'Pak choï',
  Croissant: 'Croissant',
  'Mozzarella Cheese': 'Mozzarella',
  Oranges: 'Oranges',
  'Greek Yogurt': 'Yaourt grec',
  'Smoked Sausage': 'Saucisse fumée',
  'Cinnamon Roll': 'Rouleau à la cannelle',
  'Cottage Cheese': 'Fromage blanc cottage',
  'Green Grapes': 'Raisins verts',
  'Chicken Breast': 'Blanc de poulet',
  'Red Bell Pepper': 'Poivron rouge',
  'Salted Butter': 'Beurre salé',
  Papaya: 'Papaye',
  'Chocolate Milk': 'Lait au chocolat',
  'Chocolate Muffin': 'Muffin au chocolat',
  'Watermelon Slice': 'Tranche de pastèque',
  'Lamb Chops': 'Côtelettes d’agneau',
  'Banana Bread': 'Cake à la banane',
  'Kale Leaves': 'Feuilles de chou kale',
  Bananas: 'Bananes',
  Grapes: 'Raisins',
};

const CATEGORY_FR = {
  Fruits: 'Fruits',
  Veggies: 'Légumes',
  Meats: 'Viandes',
  Seafood: 'Fruits de mer',
  'Dairy & Eggs': 'Produits laitiers et œufs',
  Bakery: 'Boulangerie',
  Pantry: 'Épicerie',
  Beverages: 'Boissons',
  Snacks: 'Collations',
};

const catalog = JSON.parse(fs.readFileSync(path.resolve('prisma/catalog.json'), 'utf8'));
const prisma = new PrismaClient();

async function main() {
  const categoryIds = new Map();

  for (const [index, c] of catalog.categories.entries()) {
    const row = await prisma.category.upsert({
      where: { handle: c.handle },
      update: { name: c.name, nameFr: CATEGORY_FR[c.name] ?? c.nameFr ?? null, image: c.image, sort: index },
      create: { handle: c.handle, name: c.name, nameFr: CATEGORY_FR[c.name] ?? null, image: c.image, sort: index },
    });
    categoryIds.set(c.name, row.id);
  }

  let created = 0;
  for (const [index, p] of catalog.products.entries()) {
    const categoryId = categoryIds.get(p.category);
    if (!categoryId) continue;
    const nameFr = NAME_FR[p.name] ?? null;
    const searchName = `${p.name} ${nameFr ?? ''}`.toLowerCase();
    const description = `${p.name}, sold as ${p.unit}. Checked fresh at the market every morning.`;
    const descriptionFr = nameFr ? `${nameFr}, vendu au ${p.unit}. Vérifié frais chaque matin au marché.` : null;
    const compareAtCents = index % 5 === 2 ? Math.ceil(p.priceCents / 0.8 / 100) * 100 - 1 : null;

    await prisma.product.upsert({
      where: { handle: p.handle },
      update: {
        name: p.name,
        nameFr,
        searchName,
        unit: p.unit,
        priceCents: p.priceCents,
        compareAtCents,
        image: p.image,
        featured: p.group === 'featured',
        category: { connect: { id: categoryId } },
        description,
        descriptionFr,
      },
      create: {
        handle: p.handle,
        name: p.name,
        nameFr,
        searchName,
        unit: p.unit,
        priceCents: p.priceCents,
        compareAtCents,
        image: p.image,
        featured: p.group === 'featured',
        stock: p.group === 'featured' ? 40 : 60,
        categoryId,
        description,
        descriptionFr,
      },
    });
    created++;
  }

  const importedPath = path.resolve('prisma/agaseke-catalog.json');
  if (fs.existsSync(importedPath)) {
    const imported = JSON.parse(fs.readFileSync(importedPath, 'utf8'));
    const categoryIdsByHandle = new Map();

    for (const c of imported.categories) {
      const row = await prisma.category.upsert({
        where: { handle: c.handle },
        update: { name: c.name, nameFr: c.nameFr ?? null, image: c.image, sort: c.sort },
        create: { handle: c.handle, name: c.name, nameFr: c.nameFr ?? null, image: c.image, sort: c.sort },
      });
      categoryIdsByHandle.set(c.handle, row.id);
    }

    for (const p of imported.products) {
      const categoryId = categoryIdsByHandle.get(p.category);
      if (!categoryId) continue;
      const data = {
        name: p.name,
        nameFr: p.nameFr ?? null,
        searchName: `${p.name} ${p.nameFr ?? ''}`.toLowerCase(),
        description: p.description,
        descriptionFr: p.descriptionFr ?? null,
        unit: p.unit,
        priceCents: p.priceCents,
        compareAtCents: p.compareAtCents ?? null,
        image: p.image,
        featured: p.featured,
        stock: p.stock,
      };

      await prisma.product.upsert({
        where: { handle: p.handle },
        update: { ...data, categoryId },
        create: { handle: p.handle, categoryId, ...data },
      });
      created++;
    }
  }

  const mtnPath = path.resolve('prisma/mtn-deals-catalog.json');
  if (fs.existsSync(mtnPath)) {
    const mtn = JSON.parse(fs.readFileSync(mtnPath, 'utf8'));
    const categoryIdsByHandle = new Map(
      (await prisma.category.findMany({ select: { id: true, handle: true } })).map((c) => [c.handle, c.id]),
    );

    for (const p of mtn.products) {
      const categoryId = categoryIdsByHandle.get(p.category);
      if (!categoryId) continue;
      const data = {
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
      };

      await prisma.product.upsert({
        where: { handle: p.handle },
        update: { ...data, categoryId },
        create: { handle: p.handle, categoryId, ...data },
      });
      created++;
    }
  }

  const jumiaPath = path.resolve('prisma/jumia-bestsellers-catalog.json');
  if (fs.existsSync(jumiaPath)) {
    const jumia = JSON.parse(fs.readFileSync(jumiaPath, 'utf8'));
    const c = jumia.newCategory;
    await prisma.category.upsert({
      where: { handle: c.handle },
      update: { name: c.name, nameFr: c.nameFr, image: c.image, sort: c.sort },
      create: { handle: c.handle, name: c.name, nameFr: c.nameFr, image: c.image, sort: c.sort },
    });

    const categoryIdsByHandle = new Map(
      (await prisma.category.findMany({ select: { id: true, handle: true } })).map((row) => [row.handle, row.id]),
    );

    for (const p of jumia.products) {
      const categoryId = categoryIdsByHandle.get(p.category);
      if (!categoryId) continue;
      const data = {
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
      };

      await prisma.product.upsert({
        where: { handle: p.handle },
        update: { ...data, categoryId },
        create: { handle: p.handle, categoryId, ...data },
      });
      created++;
    }
  }

  console.log(`seeded ${categoryIds.size} categories, ${created} products`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
