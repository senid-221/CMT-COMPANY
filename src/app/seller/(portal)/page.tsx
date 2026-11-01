import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireSeller } from '@/lib/seller/auth';
import { formatMoney } from '@/lib/money';
import { storefrontActive, storefrontStatus } from '@/lib/vendors';

type Params = { saved?: string; deleted?: string; error?: string; welcome?: string };

const ERRORS: Record<string, string> = {
  invalid: 'Check the product details and try again.',
  'duplicate-handle': 'That product URL is already used. Choose another handle.',
  'not-found': 'That product is not in your store.',
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(value);
}

export default async function SellerDashboardPage({ searchParams }: { searchParams: Promise<Params> }) {
  const seller = await requireSeller();
  const { saved, deleted, error, welcome } = await searchParams;

  const [products, orderRows, settlement] = await Promise.all([
    prisma.product.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        name: true,
        handle: true,
        image: true,
        priceCents: true,
        compareAtCents: true,
        stock: true,
        category: { select: { name: true } },
      },
    }),
    prisma.orderItem.findMany({
      where: { product: { sellerId: seller.id } },
      select: { orderId: true },
      distinct: ['orderId'],
    }),
    prisma.vendorSettlement.aggregate({
      where: { sellerId: seller.id },
      _sum: { amountCents: true },
    }),
  ]);

  const live = products.filter((product) => product.stock > 0).length;
  const active = storefrontActive(seller);
  const status = storefrontStatus(seller);
  const paidUntil = seller.storefrontUntil ? formatDate(seller.storefrontUntil) : null;
  const flash = welcome
    ? 'Welcome to CityMarket. Activate your storefront to publish it to shoppers.'
    : saved
      ? 'Changes saved.'
      : deleted
        ? 'Product deleted.'
        : error
          ? ERRORS[error] ?? 'Something went wrong.'
          : '';

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{seller.name}</h1>
          <p className="mt-1 text-sm text-muted">Publish products, set prices and manage stock. Your store page goes live with a paid storefront.</p>
        </div>
        <Link href="/seller/products/new" className="btn btn-primary">
          New product
        </Link>
      </div>

      <section className={`mt-5 rounded-2xl border p-5 ${active ? 'border-success/30 bg-success/5' : 'border-warning/40 bg-warning/5'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Storefront</p>
            <h2 className="mt-1 font-display text-xl font-bold text-ink">
              {active ? 'Live on CityMarket' : status === 'suspended' ? 'Suspended' : status === 'expired' ? 'Subscription ended' : 'Not activated'}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-ink/75">
              {active
                ? `Your store is public and your products link back to it until ${paidUntil}.`
                : status === 'suspended'
                  ? 'An administrator suspended this storefront. Contact support to reopen it.'
                  : 'Your products stay hidden from CityMarket until the storefront subscription is paid.'}
            </p>
            {seller.handle ? (
              <p className="mt-2 text-sm font-semibold text-brand">
                {active ? <Link href={`/store/${seller.handle}`} className="hover:underline">/store/{seller.handle} →</Link> : <>/store/{seller.handle}</>}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">Choose your store address in Storefront settings.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/seller/billing" className="btn btn-primary text-sm">
              {active ? 'Renew storefront' : 'Activate storefront'}
            </Link>
            <Link href="/seller/settings" className="btn btn-ghost text-sm">
              Edit storefront
            </Link>
            {active && seller.handle ? (
              <Link href={`/store/${seller.handle}`} className="btn btn-ghost text-sm">
                View store
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Products', value: products.length },
          { label: 'Live listings', value: live },
          { label: 'Orders with your items', value: orderRows.length },
          { label: 'Total sales', value: formatMoney(settlement._sum.amountCents ?? 0, 'en') },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-canvas p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{stat.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      {flash ? (
        <p className={`mt-5 rounded-xl px-4 py-3 text-sm font-semibold ${error ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
          {flash}
        </p>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-canvas">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-surface-alt">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={product.image} alt="" width={40} height={40} className="h-10 w-10 rounded-lg bg-surface-alt object-contain p-1" />
                    <div>
                      <p className="font-semibold text-ink">{product.name}</p>
                      <p className="text-xs text-muted">{product.handle}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">{product.category.name}</td>
                <td className="px-4 py-3 text-right">
                  <p className="font-semibold text-ink">{formatMoney(product.priceCents, 'en')}</p>
                  {product.compareAtCents ? <p className="text-xs text-muted line-through">{formatMoney(product.compareAtCents, 'en')}</p> : null}
                </td>
                <td className={`px-4 py-3 text-right font-semibold ${product.stock <= 10 ? 'text-warning' : 'text-label'}`}>{product.stock}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/seller/products/${product.id}/edit`} className="text-sm font-semibold text-brand hover:underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length ? null : (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted">No products yet. Publish your first product to appear in the shop.</p>
            <Link href="/seller/products/new" className="btn btn-primary mt-4">
              Add a product
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
