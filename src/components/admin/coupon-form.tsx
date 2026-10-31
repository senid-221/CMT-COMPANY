'use client';

import { useState } from 'react';
import { saveCoupon } from '@/app/admin/coupons/actions';
import { t } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';

export type CouponFormValue = {
  id: string;
  code: string;
  kind: string;
  percent: number | null;
  amountCents: number | null;
  minSubtotalCents: number;
  maxDiscountCents: number | null;
  markets: string;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
  label: string;
  labelFr: string | null;
};

const dollars = (cents: number | null | undefined) => (cents == null ? '' : (cents / 100).toFixed(2));
const dayValue = (value: Date | null | undefined) =>
  value ? new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '';

const EMPTY: CouponFormValue = {
  id: '',
  code: '',
  kind: 'percent',
  percent: 10,
  amountCents: null,
  minSubtotalCents: 0,
  maxDiscountCents: null,
  markets: '',
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  usedCount: 0,
  active: true,
  label: '',
  labelFr: '',
};

export function CouponForm({ coupon }: { coupon?: CouponFormValue }) {
  const value = coupon ?? EMPTY;
  const [kind, setKind] = useState(value.kind === 'amount' ? 'amount' : 'percent');
  const [percent, setPercent] = useState(String(value.percent ?? 10));
  const [amount, setAmount] = useState(dollars(value.amountCents) || '5.00');
  const [code, setCode] = useState(value.code);
  const [label, setLabel] = useState(value.label);
  const [labelFr, setLabelFr] = useState(value.labelFr ?? '');

  const previewCents = kind === 'amount' ? Math.round(Number(amount.replace(/[^0-9.]/g, '')) * 100) : Math.round((Number(percent) || 0) * 50);
  const headline =
    kind === 'amount'
      ? t('en', 'coupon.offAmount', { amount: formatMoney(previewCents) })
      : t('en', 'coupon.offPercent', { pct: Number(percent) || 0 });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <form action={saveCoupon} className="card space-y-4 p-5">
        {coupon ? <input type="hidden" name="id" value={coupon.id} /> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Box label="Code" hint="Customers type this at checkout">
            <input
              name="code"
              required
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 32))}
              maxLength={32}
              className="field font-display font-bold"
              placeholder="SAVE10"
            />
          </Box>
          <Box label="Discount type">
            <select name="kind" value={kind} onChange={(event) => setKind(event.target.value)} className="field">
              <option value="percent">Percentage</option>
              <option value="amount">Fixed amount</option>
            </select>
          </Box>
          {kind === 'percent' ? (
            <Box label="Percent off" hint="1 to 95">
              <input name="percent" type="number" min={1} max={95} step={1} value={percent} onChange={(event) => setPercent(event.target.value)} className="field" />
            </Box>
          ) : (
            <Box label="Percent off" hint="Ignored while the type is fixed amount">
              <input type="number" min={1} max={95} step={1} value={percent} onChange={(event) => setPercent(event.target.value)} className="field opacity-60" />
            </Box>
          )}
          {kind === 'amount' ? (
            <Box label="Amount off (USD)">
              <input name="amount" type="number" min={0} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="field" />
            </Box>
          ) : (
            <Box label="Amount off (USD)" hint="Ignored while the type is percentage">
              <input type="number" min={0} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="field opacity-60" />
            </Box>
          )}
          <Box label="Minimum cart (USD)">
            <input name="minSubtotal" type="number" min={0} step="0.01" defaultValue={dollars(value.minSubtotalCents) || '0'} className="field" />
          </Box>
          <Box label="Max discount (USD)" hint="Blank means no cap">
            <input name="maxDiscount" type="number" min={0} step="0.01" defaultValue={dollars(value.maxDiscountCents)} className="field" />
          </Box>
          <Box label="Starts" hint="Blank means immediately">
            <input name="startsAt" type="date" defaultValue={dayValue(value.startsAt)} className="field" />
          </Box>
          <Box label="Ends" hint="Blank means no end date">
            <input name="endsAt" type="date" defaultValue={dayValue(value.endsAt)} className="field" />
          </Box>
          <Box label="Usage limit" hint="Blank means unlimited">
            <input name="usageLimit" type="number" min={1} step={1} defaultValue={value.usageLimit ?? ''} className="field" />
          </Box>
          <Box label="Countries" hint="Two-letter codes, comma separated. Blank means all countries">
            <input name="markets" defaultValue={value.markets} maxLength={40} className="field" placeholder="RW, SN" />
          </Box>
          <Box label="Ad headline (English)">
            <input name="label" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} className="field" placeholder="Weekend groceries treat" />
          </Box>
          <Box label="Ad headline (French)">
            <input
              name="labelFr"
              value={labelFr}
              onChange={(event) => setLabelFr(event.target.value)}
              maxLength={80}
              className="field"
              placeholder="Gâteries du week-end"
            />
          </Box>
        </div>

        <label className="flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" name="active" defaultChecked={value.active} className="h-4 w-4 accent-[#297357]" />
          Live on the storefront
        </label>

        <div className="flex gap-3">
          <button type="submit" className="btn btn-primary btn-3d">
            {coupon ? 'Save coupon' : 'Create coupon'}
          </button>
        </div>
      </form>

      <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-6">
        <h2 className="font-display text-lg font-semibold">Home page preview</h2>
        <article className="ticket">
          <div className="min-w-0 flex-1 space-y-1 p-4">
            <p className="font-display text-lg font-bold text-brand">{headline}</p>
            {label ? <p className="text-sm">{label}</p> : null}
            {labelFr ? <p className="text-sm text-muted">{labelFr}</p> : null}
          </div>
          <div className="ticket-actions">
            <span className="btn btn-primary btn-3d">{code || 'CODE'}</span>
          </div>
        </article>
        <p className="text-xs text-muted">
          This is how the animated coupon ad appears on the home page for shoppers in the listed countries.
        </p>
      </aside>
    </div>
  );
}

function Box({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </div>
  );
}
