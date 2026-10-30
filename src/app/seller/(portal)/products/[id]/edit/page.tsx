import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireSeller } from '@/lib/seller/auth';
import { deleteSellerProduct, saveSellerProduct } from '@/app/seller/actions';
import { SellerProductForm } from '@/components/seller/product-form';
import { ConfirmButton } from '@/components/admin/confirm-button';

export default async function EditSellerProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const seller = await requireSeller();
  const { id } = await params;
  const { error } = await searchParams;

  const [product, categories] = await Promise.all([
    prisma.product.findFirst({ where: { id, sellerId: seller.id } }),
    prisma.category.findMany({ orderBy: { sort: 'asc' }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();

  return (
    <div>
      <Link href="/seller" className="text-sm font-semibold text-brand hover:underline">
        ← Products
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{product.name}</h1>
          <p className="text-sm text-slate-600">/product/{product.handle}</p>
        </div>
        <Link href={`/product/${product.handle}`} target="_blank" className="btn btn-ghost text-sm">
          View on storefront ↗
        </Link>
      </div>
      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error === 'duplicate-handle' ? 'That handle is already used. Choose another one.' : 'Check the product details and try again.'}
        </p>
      ) : null}
      <div className="mt-5">
        <SellerProductForm product={product} categories={categories} action={saveSellerProduct} />
      </div>

      <section className="mt-5 rounded-xl border border-red-200 bg-white p-4">
        <h2 className="font-display text-lg font-semibold text-slate-900">Delete product</h2>
        <p className="mt-1 text-sm text-slate-600">Removes it from the shop. Past order lines keep their snapshot.</p>
        <form action={deleteSellerProduct} className="mt-3">
          <input type="hidden" name="id" value={product.id} />
          <ConfirmButton
            message={`Delete ${product.name}? This cannot be undone.`}
            className="rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
          >
            Delete product
          </ConfirmButton>
        </form>
      </section>
    </div>
  );
}
