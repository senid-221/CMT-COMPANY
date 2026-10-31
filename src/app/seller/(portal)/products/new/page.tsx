import Link from 'next/link';
import { prisma } from '@/lib/db';
import { saveSellerProduct } from '@/app/seller/actions';
import { SellerProductForm } from '@/components/seller/product-form';

export default async function NewSellerProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const categories = await prisma.category.findMany({ orderBy: { sort: 'asc' }, select: { id: true, name: true } });

  return (
    <div>
      <Link href="/seller" className="text-sm font-semibold text-brand hover:underline">
        ← Products
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold text-ink">Publish a product</h1>
      <p className="mt-1 text-sm text-muted">Your product appears in the shop as soon as you save it.</p>
      {error ? (
        <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
          {error === 'duplicate-handle' ? 'That handle is already used. Choose another one.' : 'Check the product details and try again.'}
        </p>
      ) : null}
      <div className="mt-5">
        <SellerProductForm categories={categories} action={saveSellerProduct} />
      </div>
    </div>
  );
}
