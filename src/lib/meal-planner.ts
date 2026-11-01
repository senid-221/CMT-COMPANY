import { prisma } from '@/lib/db';
import { activeVendorWhere } from '@/lib/vendors';
import type { Locale } from '@/lib/i18n';
import type { Market } from '@/lib/markets';

export const PLANNER_STYLES = ['balanced', 'high-protein', 'quick', 'comfort'] as const;
export type PlannerStyle = (typeof PLANNER_STYLES)[number];

export const PLANNER_DIETS = ['vegetarian', 'vegan', 'halal', 'gluten-free', 'dairy-free'] as const;
export type PlannerDiet = (typeof PLANNER_DIETS)[number];

const MEAL_CATEGORIES = ['fruits', 'veggies', 'meats', 'seafood', 'dairy-eggs', 'bakery', 'pantry', 'groceries-food-beverages'];
const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack', 'meal'] as const;

const MEAT_HANDLES = new Set([
  'fresh-raw-beef',
  'ground-beef',
  'chicken-wings',
  'beef-sirloin',
  'smoked-sausage',
  'chicken-breast',
  'lamb-chops',
  'raw-seabass-fish',
]);
const DAIRY_HANDLES = new Set([
  'whipping-cream',
  'mozzarella-cheese',
  'greek-yogurt',
  'cottage-cheese',
  'salted-butter',
  'chocolate-milk',
]);
const GLUTEN_HANDLES = new Set(['wheat-bread', 'croissant', 'chocolate-muffin', 'garlic-baguette']);

/** Dietary rules are enforced by removing products before the model sees the catalogue; prompt wording alone is not a guarantee. */
function allowedByDiets(handle: string, diets: PlannerDiet[]) {
  for (const diet of diets) {
    if (diet === 'vegetarian' && MEAT_HANDLES.has(handle)) return false;
    if (diet === 'vegan' && (MEAT_HANDLES.has(handle) || DAIRY_HANDLES.has(handle))) return false;
    if (diet === 'dairy-free' && DAIRY_HANDLES.has(handle)) return false;
    if (diet === 'gluten-free' && GLUTEN_HANDLES.has(handle)) return false;
    if (diet === 'halal' && handle === 'smoked-sausage') return false;
  }
  return true;
}
type Slot = (typeof SLOTS)[number];

export type MealPlanInput = {
  style: PlannerStyle;
  diets: PlannerDiet[];
  household: number;
  days: number;
  budgetCents: number | null;
  locale: Locale;
};

export type PlanProduct = {
  handle: string;
  name: string;
  nameFr: string | null;
  unit: string;
  image: string;
  priceCents: number;
};

export type PlanItem = { qty: number; product: PlanProduct };
export type PlanMeal = { slot: Slot; title: string; note: string; items: PlanItem[] };
export type PlanDay = { meals: PlanMeal[]; costCents: number };

export type MealPlan = {
  summary: string;
  tip: string;
  days: PlanDay[];
  items: PlanItem[];
  totalCents: number;
  budgetCents: number | null;
};

export type PlannerErrorCode = 'unconfigured' | 'invalid' | 'too-many' | 'timeout' | 'failed';

export class PlannerError extends Error {
  code: PlannerErrorCode;
  constructor(code: PlannerErrorCode) {
    super(code);
    this.code = code;
  }
}

export function plannerConfigured() {
  return Boolean((process.env.OPENAI_API_KEY ?? '').trim());
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

export function parseMealPlanInput(raw: unknown, market: Market): MealPlanInput | null {
  const body = asObject(raw);
  if (!body) return null;

  const style = (PLANNER_STYLES as readonly string[]).includes(String(body.style)) ? (body.style as PlannerStyle) : null;
  if (!style) return null;

  const household = Math.round(Number(body.household));
  if (!Number.isFinite(household) || household < 1 || household > 8) return null;

  const days = Math.round(Number(body.days));
  if (!Number.isFinite(days) || days < 1 || days > 7) return null;

  const diets = Array.isArray(body.diets)
    ? [...new Set(body.diets.filter((diet): diet is PlannerDiet => (PLANNER_DIETS as readonly string[]).includes(String(diet))))]
    : [];

  let budgetCents: number | null = null;
  const budgetUnits = Number(body.budgetUnits);
  if (Number.isFinite(budgetUnits) && budgetUnits > 0) {
    const usd = budgetUnits / market.ratePerUsd;
    budgetCents = Math.min(1_000_000, Math.round(usd * 100));
  }

  return { style, diets, household, days, budgetCents, locale: body.locale === 'fr' ? 'fr' : 'en' };
}

async function groceryCatalogue() {
  return prisma.product.findMany({
    where: { category: { handle: { in: MEAL_CATEGORIES } }, stock: { gt: 0 }, ...activeVendorWhere() },
    select: {
      handle: true,
      name: true,
      nameFr: true,
      unit: true,
      image: true,
      priceCents: true,
      category: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });
}

const STYLE_TEXT: Record<PlannerStyle, string> = {
  balanced: 'balanced everyday meals',
  'high-protein': 'high-protein meals built around meat, fish and dairy',
  quick: 'quick and easy meals with short cooking times',
  comfort: 'warm, filling home-style comfort food',
};

function buildPrompt(input: MealPlanInput, catalogue: Awaited<ReturnType<typeof groceryCatalogue>>) {
  const language = input.locale === 'fr' ? 'French' : 'English';
  const budget = input.budgetCents ? `$${(input.budgetCents / 100).toFixed(2)} for the whole plan` : 'not set — keep it economical';
  const rules = [
    'Use ONLY products from CATALOG and reference each one by its exact handle. Never invent products, handles or prices.',
    'Treat every quantity as packs of the listed unit: qty 1 means one pack. Use 1-3 for most items.',
    'Every meal needs at least one catalogue item, usually 2-4 items.',
    'Respect every dietary preference strictly. Vegan excludes meat, seafood, dairy and eggs. Vegetarian excludes meat and seafood. Halal excludes pork and alcohol. Gluten-free excludes wheat bread, croissant, chocolate muffin and garlic baguette. Dairy-free excludes cream, cheese, yogurt, butter and chocolate milk.',
    'Plan breakfast, lunch and dinner for every day. At most one snack per day.',
    'Do not use the same main protein in every meal; vary the days.',
    'Stay within the budget when one is given. Prices in the catalogue are per pack.',
    'Write summary, tip, meal titles and notes in ' + language + '.',
  ];

  const system = [
    'You are Luna, the meal planner for CityMarket, an online grocery store.',
    'Turn the shopper quiz into a practical meal plan that can be bought with the supplied catalogue.',
    'Output strict JSON only, with no markdown and no commentary.',
    'Shape: {"summary":"2 sentences","tip":"one short shopping or storage tip","days":[{"meals":[{"slot":"breakfast","title":"...","note":"...","items":[{"handle":"exact-handle","qty":1}]}]}]}',
    `Return exactly ${input.days} day objects. slot must be breakfast, lunch, dinner or snack. note is optional and under 120 characters.`,
    'Rules:',
    ...rules.map((rule) => `- ${rule}`),
  ].join('\n');

  const user = JSON.stringify({
    shopper: {
      mealStyle: STYLE_TEXT[input.style],
      dietary: input.diets.length ? input.diets : ['none'],
      household: input.household,
      days: input.days,
      budget,
    },
    catalog: catalogue.map(
      (product) =>
        `${product.handle} | ${product.name} | ${product.unit} | $${(product.priceCents / 100).toFixed(2)} | ${product.category.name}`,
    ),
  });

  return { system, user };
}

function toPlanProduct(product: Awaited<ReturnType<typeof groceryCatalogue>>[number]): PlanProduct {
  return {
    handle: product.handle,
    name: product.name,
    nameFr: product.nameFr,
    unit: product.unit,
    image: product.image,
    priceCents: product.priceCents,
  };
}

function normalizeSlot(value: unknown): Slot {
  const slot = String(value ?? '').toLowerCase().trim();
  return (SLOTS as readonly string[]).includes(slot) ? (slot as Slot) : 'meal';
}

function sanitize(raw: unknown, input: MealPlanInput, catalogue: Awaited<ReturnType<typeof groceryCatalogue>>): MealPlan {
  const byHandle = new Map(catalogue.map((product) => [product.handle, product]));
  const body = asObject(raw);
  const rawDays = Array.isArray(body?.days) ? body.days.slice(0, input.days) : [];
  const days: PlanDay[] = [];

  for (const rawDay of rawDays) {
    const day = asObject(rawDay);
    const rawMeals = Array.isArray(day?.meals) ? day.meals.slice(0, 5) : [];
    const meals: PlanMeal[] = [];

    for (const rawMeal of rawMeals) {
      const meal = asObject(rawMeal);
      const seen = new Set<string>();
      const items: PlanItem[] = [];
      const rawItems = Array.isArray(meal?.items) ? meal.items.slice(0, 6) : [];

      for (const rawItem of rawItems) {
        const item = asObject(rawItem);
        const handle = typeof item?.handle === 'string' ? item.handle.trim() : '';
        const product = byHandle.get(handle);
        if (!product || seen.has(handle)) continue;
        const qty = Math.max(1, Math.min(12, Math.round(Number(item?.qty) || 1)));
        seen.add(handle);
        items.push({ qty, product: toPlanProduct(product) });
      }

      if (!items.length) continue;
      meals.push({
        slot: normalizeSlot(meal?.slot),
        title: cleanText(meal?.title, 90) || items[0].product.name,
        note: cleanText(meal?.note, 140),
        items,
      });
    }

    if (!meals.length) continue;
    const costCents = meals.reduce(
      (sum, meal) => sum + meal.items.reduce((line, item) => line + item.qty * item.product.priceCents, 0),
      0,
    );
    days.push({ meals, costCents });
  }

  const merged = new Map<string, PlanItem>();
  for (const day of days) {
    for (const meal of day.meals) {
      for (const item of meal.items) {
        const line = merged.get(item.product.handle);
        if (line) line.qty = Math.min(99, line.qty + item.qty);
        else merged.set(item.product.handle, { qty: item.qty, product: item.product });
      }
    }
  }

  const items = [...merged.values()].sort((a, b) => a.product.name.localeCompare(b.product.name));
  if (!days.length || !items.length) throw new PlannerError('failed');

  return {
    summary: cleanText(body?.summary, 260),
    tip: cleanText(body?.tip, 200),
    days,
    items,
    totalCents: items.reduce((sum, item) => sum + item.qty * item.product.priceCents, 0),
    budgetCents: input.budgetCents,
  };
}

export async function buildMealPlan(input: MealPlanInput): Promise<MealPlan> {
  if (!plannerConfigured()) throw new PlannerError('unconfigured');

  const catalogue = (await groceryCatalogue()).filter((product) => allowedByDiets(product.handle, input.diets));
  if (!catalogue.length) throw new PlannerError('failed');

  const { system, user } = buildPrompt(input, catalogue);
  const model = (process.env.OPENAI_MODEL ?? '').trim() || 'gpt-4o';

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${(process.env.OPENAI_API_KEY ?? '').trim()}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        max_tokens: 2600,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    throw new PlannerError(name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'failed');
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('[meal-planner] openai', response.status, detail.slice(0, 300));
    throw new PlannerError('failed');
  }

  const data = (await response.json().catch(() => null)) as { choices?: { message?: { content?: string } }[] } | null;
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new PlannerError('failed');

  let parsed: unknown;
  try {
    const cleaned = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new PlannerError('failed');
  }

  return sanitize(parsed, input, catalogue);
}
