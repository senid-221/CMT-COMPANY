import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireSeller } from '@/lib/seller/auth';
import { formatMoney } from '@/lib/money';

type Params = { saved?: string; deleted?: string; error?: string };

const ERRORS: Record<string, string> = {
  invalid: 'Check the product details and try again.',
  'duplicate-handle': 'That product URL is already used. Choose another handle.',
  'not-found': 'That product is not in your store.',
};

export default async function SellerDashboardPage({ searchParams }: { searchParams: Promise<Params> }) {
  const seller = await requireSeller();
  const { saved, deleted, error } = await searchParams;

  const [products, orderRows] = await Promise.all([
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
  ]);

  const live = products.filter((product) => product.stock > 0).length;
  const low = products.filter((product) => product.stock > 0 && product.stock <= 10).length;
  const flash = saved ? 'Changes saved.' : deleted ? 'Product deleted.' : error ? ERRORS[error] ?? 'Something went wrong.' : '';

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{seller.name}</h1>
          <p className="mt-1 text-sm text-slate-600">Publish products, update prices and manage stock.</p>
        </div>
        <Link href="/seller/products/new" className="btn btn-primary">
          New product
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Products', value: products.length },
          { label: 'Live listings', value: live },
          { label: 'Low stock', value: low },
          { label: 'Orders with your items', value: orderRows.length },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {flash ? (
        <p className={`mt-5 rounded-xl px-4 py-3 text-sm font-semibold ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>
          {flash}
        </p>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={product.image} alt="" width={40} height={40} className="h-10 w-10 rounded-lg bg-slate-50 object-contain p-1" />
                    <div>
                      <p className="font-semibold text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.handle}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{product.category.name}</td>
                <td className="px-4 py-3 text-right">
                  <p className="font-semibold text-slate-900">{formatMoney(product.priceCents, 'en')}</p>
                  {product.compareAtCents ? <p className="text-xs text-slate-400 line-through">{formatMoney(product.compareAtCents, 'en')}</p> : null}
                </td>
                <td className={`px-4 py-3 text-right font-semibold ${product.stock <= 10 ? 'text-amber-700' : 'text-slate-700'}`}>{product.stock}</td>
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
            <p className="text-sm text-slate-600">No products yet. Publish your first product to appear in the shop.</p>
            <Link href="/seller/products/new" className="btn btn-primary mt-4">
              Add a product
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
