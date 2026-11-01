import Link from 'next/link';
import { requireSeller } from '@/lib/seller/auth';
import { saveVendorProfile } from '@/app/seller/actions';
import { storefrontActive } from '@/lib/vendors';

export const metadata = { title: 'Storefront settings', robots: { index: false, follow: false } };

const INPUT =
  'h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';
const LABEL = 'mb-1 block text-sm font-semibold text-label';

const ERRORS: Record<string, string> = {
  invalid: 'Check the store name, address and image link.',
  handle: 'That store address is already taken. Choose another one.',
  subaccount: 'A Flutterwave subaccount ID starts with RS_ (for example RS_D87A9EEABF2C62AF8).',
};

export default async function VendorSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const seller = await requireSeller();
  const { saved, error } = await searchParams;
  const active = storefrontActive(seller);

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Storefront settings</h1>
          <p className="mt-1 text-sm text-muted">This is what shoppers see when they open your store.</p>
        </div>
        {active && seller.handle ? (
          <Link href={`/store/${seller.handle}`} className="btn btn-ghost text-sm">
            View store
          </Link>
        ) : null}
      </div>

      {saved ? <p role="status" className="mt-4 rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">Storefront saved.</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{ERRORS[error] ?? 'Something went wrong.'}</p> : null}

      <form action={saveVendorProfile} className="card mt-5 space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>Store name</span>
            <input name="name" required minLength={2} maxLength={80} defaultValue={seller.name} className={INPUT} />
          </label>
          <label className="block">
            <span className={LABEL}>City</span>
            <input name="city" maxLength={40} defaultValue={seller.city ?? ''} placeholder="Kigali" className={INPUT} />
          </label>
          <label className="block">
            <span className={LABEL}>Store address</span>
            <div className="flex h-11 items-center rounded-xl border border-line bg-canvas pl-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <span className="shrink-0 text-sm font-semibold text-label">/store/</span>
              <input
                name="handle"
                required
                minLength={2}
                maxLength={60}
                defaultValue={seller.handle ?? ''}
                pattern="[a-z0-9-]+"
                className="h-full min-w-0 flex-1 bg-transparent px-1 text-sm text-ink outline-none"
              />
            </div>
          </label>
          <label className="block">
            <span className={LABEL}>Phone</span>
            <input name="phone" type="tel" maxLength={30} defaultValue={seller.phone ?? ''} className={INPUT} />
          </label>
        </div>

        <label className="block">
          <span className={LABEL}>Tagline</span>
          <input name="tagline" maxLength={120} defaultValue={seller.tagline ?? ''} placeholder="Fresh groceries from Kigali" className={INPUT} />
        </label>

        <label className="block">
          <span className={LABEL}>About the store</span>
          <textarea name="about" rows={5} maxLength={1000} defaultValue={seller.about ?? ''} className="field resize-y" placeholder="What you sell, where you deliver, opening hours." />
        </label>

        <label className="block">
          <span className={LABEL}>Logo image link</span>
          <input name="logo" maxLength={300} defaultValue={seller.logo ?? ''} placeholder="https://… or /images/logo.png" className={INPUT} />
          <span className="mt-1 block text-xs text-muted">Square image, at least 200 × 200 pixels.</span>
        </label>

        <div className="rounded-xl border border-line bg-surface-alt p-4">
          <label className="block">
            <span className={LABEL}>Flutterwave subaccount ID</span>
            <input
              name="subaccountId"
              maxLength={60}
              defaultValue={seller.subaccountId ?? ''}
              placeholder="RS_D87A9EEABF2C62AF8"
              className={INPUT}
            />
          </label>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Shoppers’ card and mobile money payments are split straight to this subaccount. Create it in your
            Flutterwave dashboard under Settings → Subaccounts, then paste the ID that starts with RS_. Without it,
            online sales are held for a manual payout.
          </p>
        </div>

        <button type="submit" className="btn btn-primary">
          Save storefront
        </button>
      </form>
    </div>
  );
}
