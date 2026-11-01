'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { addQty } from '@/lib/cart';
import { flyToCart } from '@/lib/fly-to-cart';
import { formatMoney } from '@/lib/money';
import { t, type Locale, type MessageKey } from '@/lib/i18n';
import type { Market } from '@/lib/markets';
import type { MealPlan, PlanProduct, PlannerDiet, PlannerStyle } from '@/lib/meal-planner';

type ErrorCode = 'unconfigured' | 'too-many' | 'invalid' | 'timeout' | 'failed';
type Phase = 'quiz' | 'loading' | 'result';

const ERROR_KEY: Record<ErrorCode, MessageKey> = {
  unconfigured: 'planner.error.unconfigured',
  'too-many': 'planner.error.tooMany',
  invalid: 'planner.error.invalid',
  timeout: 'planner.error.timeout',
  failed: 'planner.error.failed',
};

const STYLES: { id: PlannerStyle; label: MessageKey; desc: MessageKey }[] = [
  { id: 'balanced', label: 'planner.style.balanced', desc: 'planner.style.balanced.desc' },
  { id: 'high-protein', label: 'planner.style.highProtein', desc: 'planner.style.highProtein.desc' },
  { id: 'quick', label: 'planner.style.quick', desc: 'planner.style.quick.desc' },
  { id: 'comfort', label: 'planner.style.comfort', desc: 'planner.style.comfort.desc' },
];

const DIETS: { id: PlannerDiet; label: MessageKey }[] = [
  { id: 'vegetarian', label: 'planner.diet.vegetarian' },
  { id: 'vegan', label: 'planner.diet.vegan' },
  { id: 'halal', label: 'planner.diet.halal' },
  { id: 'gluten-free', label: 'planner.diet.glutenFree' },
  { id: 'dairy-free', label: 'planner.diet.dairyFree' },
];

const FREQUENCIES: { days: number; label: MessageKey; desc: MessageKey }[] = [
  { days: 7, label: 'planner.freq.weekly', desc: 'planner.freq.weekly.desc' },
  { days: 4, label: 'planner.freq.twice', desc: 'planner.freq.twice.desc' },
  { days: 2, label: 'planner.freq.alternate', desc: 'planner.freq.alternate.desc' },
];

const SLOT_KEY: Record<string, MessageKey> = {
  breakfast: 'planner.slot.breakfast',
  lunch: 'planner.slot.lunch',
  dinner: 'planner.slot.dinner',
  snack: 'planner.slot.snack',
  meal: 'planner.slot.meal',
};

const OPTION_BASE = 'rounded-2xl border p-4 text-left transition';
const OPTION_ACTIVE = 'border-brand bg-brand/10 ring-2 ring-brand/20';
const OPTION_IDLE = 'border-line bg-canvas hover:border-brand/60 hover:bg-hover';

function localized(product: PlanProduct, locale: Locale) {
  return locale === 'fr' && product.nameFr ? product.nameFr : product.name;
}

export function MealPlanner({ locale, market }: { locale: Locale; market: Market }) {
  const [step, setStep] = useState(0);
  const [style, setStyle] = useState<PlannerStyle>('balanced');
  const [diets, setDiets] = useState<PlannerDiet[]>([]);
  const [household, setHousehold] = useState(2);
  const [days, setDays] = useState(7);
  const [budget, setBudget] = useState('');
  const [phase, setPhase] = useState<Phase>('quiz');
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [added, setAdded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timedOutRef = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== 'result' || !resultRef.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resultRef.current.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [phase]);

  const toggleDiet = (diet: PlannerDiet) => {
    setDiets((current) => (current.includes(diet) ? current.filter((item) => item !== diet) : [...current, diet]));
  };

  async function generate() {
    setError(null);
    setPhase('loading');
    const controller = new AbortController();
    abortRef.current = controller;
    timedOutRef.current = false;
    const timer = window.setTimeout(() => {
      timedOutRef.current = true;
      controller.abort();
    }, 60_000);

    try {
      const response = await fetch('/api/meal-planner', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          style,
          diets,
          household,
          days,
          budgetUnits: Number(budget) || 0,
          market: market.code,
          locale,
        }),
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => null)) as { plan?: MealPlan; error?: ErrorCode } | null;
      if (!response.ok || !data?.plan) {
        setError(data?.error && data.error in ERROR_KEY ? data.error : 'failed');
        setPhase('quiz');
        setStep(2);
        return;
      }
      setPlan(data.plan);
      setAdded(false);
      setPhase('result');
    } catch (err) {
      if (timedOutRef.current) {
        setError('timeout');
        setPhase('quiz');
        setStep(2);
      } else if ((err as Error)?.name !== 'AbortError') {
        setError('failed');
        setPhase('quiz');
        setStep(2);
      }
    } finally {
      window.clearTimeout(timer);
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setPhase('quiz');
  }

  function addAll(event: React.MouseEvent<HTMLElement>) {
    if (!plan || added) return;
    for (const item of plan.items) addQty(item.product.handle, item.qty);
    flyToCart(event.currentTarget);
    setAdded(true);
  }

  function startOver() {
    setPlan(null);
    setError(null);
    setAdded(false);
    setPhase('quiz');
    setStep(0);
  }

  if (phase === 'loading') {
    return (
      <div className="card p-8 text-center sm:p-12" role="status" aria-live="polite">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand/10">
          <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand border-t-transparent motion-reduce:animate-none" />
        </div>
        <p className="mt-5 font-display text-xl font-semibold">{t(locale, 'planner.generating')}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">{t(locale, 'planner.generatingHint')}</p>
        <button type="button" onClick={cancel} className="btn btn-ghost mt-6">
          {t(locale, 'planner.back')}
        </button>
      </div>
    );
  }

  if (phase === 'result' && plan) {
    const meta = t(locale, 'planner.planMeta', {
      days: plan.days.length,
      people: t(locale, 'planner.people', { n: household }),
      total: formatMoney(plan.totalCents, locale, market),
    });

    return (
      <div ref={resultRef} className="scroll-mt-28 space-y-5">
        <div className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold">{t(locale, 'planner.resultTitle')}</h2>
              <p className="mt-1 text-sm text-muted">{meta}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t(locale, 'planner.total')}</p>
              <p className="font-display text-2xl font-bold text-brand">{formatMoney(plan.totalCents, locale, market)}</p>
            </div>
          </div>

          {plan.summary ? <p className="mt-4 text-[15px] leading-relaxed">{plan.summary}</p> : null}

          {plan.budgetCents ? (
            plan.totalCents > plan.budgetCents ? (
              <p className="mt-4 inline-flex rounded-full bg-warning/10 px-3 py-1 text-sm font-semibold text-warning">
                {t(locale, 'planner.overBudget', {
                  amount: formatMoney(plan.totalCents - plan.budgetCents, locale, market),
                })}
              </p>
            ) : (
              <p className="mt-4 inline-flex rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">
                {t(locale, 'planner.withinBudget', {
                  amount: formatMoney(plan.budgetCents - plan.totalCents, locale, market),
                })}
              </p>
            )
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button type="button" onClick={addAll} disabled={added} className="btn btn-primary btn-3d">
              {added ? t(locale, 'planner.added') : t(locale, 'planner.addAll')}
            </button>
            {added ? (
              <Link href="/cart" className="btn btn-ghost">
                {t(locale, 'planner.viewCart')}
              </Link>
            ) : null}
            <button type="button" onClick={generate} className="btn btn-ghost">
              {t(locale, 'planner.regenerate')}
            </button>
            <button type="button" onClick={startOver} className="btn btn-ghost">
              {t(locale, 'planner.startOver')}
            </button>
          </div>

          <p className="mt-4 text-xs text-muted">{t(locale, 'planner.disclaimer')}</p>
        </div>

        {plan.tip ? (
          <div className="rounded-xl border-l-4 border-brand bg-surface-alt px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">{t(locale, 'planner.tip')}</p>
            <p className="mt-1 text-sm">{plan.tip}</p>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(270px,1fr)]">
          <div className="space-y-4">
            {plan.days.map((day, index) => (
              <article key={index} className="card p-4 sm:p-5">
                <header className="flex items-center justify-between gap-3 border-b border-line pb-3">
                  <h3 className="font-display text-base font-semibold">{t(locale, 'planner.day', { n: index + 1 })}</h3>
                  <span className="whitespace-nowrap rounded-full bg-surface px-2.5 py-1 text-xs font-semibold">
                    {formatMoney(day.costCents, locale, market)}
                  </span>
                </header>
                <ul>
                  {day.meals.map((meal, mealIndex) => (
                    <li key={mealIndex} className="border-b border-line py-3 last:border-0 last:pb-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">
                        {t(locale, SLOT_KEY[meal.slot] ?? 'planner.slot.meal')}
                      </p>
                      <p className="mt-0.5 font-display text-[15px] font-semibold">{meal.title}</p>
                      {meal.note ? <p className="mt-0.5 text-sm text-muted">{meal.note}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {meal.items.map((item) => (
                          <Link
                            key={item.product.handle}
                            href={`/product/${item.product.handle}`}
                            className="rounded-full border border-line bg-canvas px-2.5 py-1 text-xs font-semibold hover:border-brand hover:text-brand"
                          >
                            {localized(item.product, locale)} ×{item.qty}
                          </Link>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <aside className="h-fit lg:sticky lg:top-28">
            <div className="card overflow-hidden">
              <div className="border-b border-line bg-surface-alt px-4 py-3">
                <h3 className="font-display text-base font-semibold">{t(locale, 'planner.shoppingList')}</h3>
                <p className="mt-0.5 text-xs text-muted">{t(locale, 'planner.shoppingHint')}</p>
              </div>
              <ul className="divide-y divide-line lg:max-h-[28rem] lg:overflow-y-auto">
                {plan.items.map((item) => (
                  <li key={item.product.handle} className="flex items-center gap-3 px-4 py-2.5">
                    <img
                      src={item.product.image}
                      alt=""
                      width={40}
                      height={40}
                      loading="lazy"
                      className="h-10 w-10 shrink-0 rounded-lg bg-surface object-contain"
                    />
                    <div className="min-w-0 flex-1">
                      <Link href={`/product/${item.product.handle}`} className="block truncate text-sm font-semibold hover:text-brand">
                        {localized(item.product, locale)}
                      </Link>
                      <p className="truncate text-xs text-muted">
                        {item.product.unit} · ×{item.qty}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold">
                      {formatMoney(item.qty * item.product.priceCents, locale, market)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="space-y-3 border-t border-line px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{t(locale, 'planner.total')}</span>
                  <span className="font-display text-lg font-bold text-brand">{formatMoney(plan.totalCents, locale, market)}</span>
                </div>
                <button type="button" onClick={addAll} disabled={added} className="btn btn-primary btn-3d w-full">
                  {added ? t(locale, 'planner.added') : t(locale, 'planner.addAll')}
                </button>
                {added ? (
                  <Link href="/cart" className="btn btn-ghost w-full">
                    {t(locale, 'planner.viewCart')}
                  </Link>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line bg-surface-alt px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            {t(locale, 'planner.step', { n: step + 1, total: 3 })}
          </p>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-all ${index === step ? 'w-6 bg-brand' : 'w-2.5 bg-line'}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-7">
        {step === 0 ? (
          <div>
            <h2 id="planner-q1" className="font-display text-lg font-semibold">
              {t(locale, 'planner.q1')}
            </h2>
            <p className="mt-1 text-sm text-muted">{t(locale, 'planner.q1.hint')}</p>
            <div role="group" aria-labelledby="planner-q1" className="mt-4 grid gap-3 sm:grid-cols-2">
              {STYLES.map((option) => {
                const active = style === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStyle(option.id)}
                    className={`${OPTION_BASE} ${active ? OPTION_ACTIVE : OPTION_IDLE}`}
                  >
                    <span className="block font-display text-[15px] font-semibold">{t(locale, option.label)}</span>
                    <span className="mt-0.5 block text-sm text-muted">{t(locale, option.desc)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            <h2 id="planner-q2" className="font-display text-lg font-semibold">
              {t(locale, 'planner.q2')}
            </h2>
            <p className="mt-1 text-sm text-muted">{t(locale, 'planner.q2.hint')}</p>
            <div role="group" aria-labelledby="planner-q2" className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={diets.length === 0}
                onClick={() => setDiets([])}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  diets.length === 0 ? 'border-brand bg-brand/10 text-brand ring-2 ring-brand/20' : 'border-line bg-canvas hover:border-brand/60 hover:bg-hover'
                }`}
              >
                {t(locale, 'planner.diet.none')}
              </button>
              {DIETS.map((option) => {
                const active = diets.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleDiet(option.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      active ? 'border-brand bg-brand/10 text-brand ring-2 ring-brand/20' : 'border-line bg-canvas hover:border-brand/60 hover:bg-hover'
                    }`}
                  >
                    {t(locale, option.label)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-lg font-semibold">{t(locale, 'planner.q3')}</h2>
              <p className="mt-1 text-sm text-muted">{t(locale, 'planner.q3.hint')}</p>
            </div>

            <div role="group" aria-label={t(locale, 'planner.q3')} className="grid gap-3 sm:grid-cols-3">
              {FREQUENCIES.map((option) => {
                const active = days === option.days;
                return (
                  <button
                    key={option.days}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDays(option.days)}
                    className={`${OPTION_BASE} ${active ? OPTION_ACTIVE : OPTION_IDLE}`}
                  >
                    <span className="block font-display text-[15px] font-semibold">{t(locale, option.label)}</span>
                    <span className="mt-0.5 block text-sm text-muted">{t(locale, option.desc)}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p id="planner-household" className="mb-2 text-sm font-semibold text-label">
                  {t(locale, 'planner.household')}
                </p>
                <div role="group" aria-labelledby="planner-household" className="inline-flex items-center gap-3 rounded-full border border-line bg-canvas p-1">
                  <button
                    type="button"
                    onClick={() => setHousehold((value) => Math.max(1, value - 1))}
                    disabled={household <= 1}
                    aria-label={t(locale, 'planner.peopleLess')}
                    className="grid h-9 w-9 place-items-center rounded-full border border-line text-lg leading-none hover:bg-hover disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="min-w-20 text-center text-sm font-semibold" aria-live="polite">
                    {t(locale, 'planner.people', { n: household })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHousehold((value) => Math.min(8, value + 1))}
                    disabled={household >= 8}
                    aria-label={t(locale, 'planner.peopleMore')}
                    className="grid h-9 w-9 place-items-center rounded-full border border-line text-lg leading-none hover:bg-hover disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="planner-budget" className="mb-2 block text-sm font-semibold text-label">
                  {t(locale, 'planner.budget')}
                </label>
                <div className="flex h-11 items-center rounded-xl border border-line bg-canvas focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                  <span className="pl-3 text-sm font-semibold text-muted">{market.currency}</span>
                  <input
                    id="planner-budget"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={budget}
                    onChange={(event) => setBudget(event.target.value.slice(0, 9))}
                    placeholder="0"
                    className="h-full w-full bg-transparent px-2 text-sm text-ink outline-none placeholder:text-muted"
                  />
                </div>
                <p className="mt-1 text-xs text-muted">{t(locale, 'planner.budgetHint')}</p>
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {t(locale, ERROR_KEY[error])}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          {step > 0 ? (
            <button type="button" onClick={() => setStep((value) => value - 1)} className="btn btn-ghost">
              {t(locale, 'planner.back')}
            </button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <button type="button" onClick={() => setStep((value) => value + 1)} className="btn btn-primary btn-3d">
              {t(locale, 'planner.next')}
            </button>
          ) : (
            <button type="button" onClick={generate} className="btn btn-primary btn-3d">
              {t(locale, 'planner.generate')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
