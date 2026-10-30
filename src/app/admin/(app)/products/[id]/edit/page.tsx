import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { deleteProduct, saveProduct } from '@/app/admin/actions';
import { BackLink, Flash, PageHeader } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/product-form';
import { ConfirmButton } from '@/components/admin/confirm-button';

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const [product, categories, sellers] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { sort: 'asc' }, select: { id: true, name: true } }),
    prisma.seller.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();

  return (
    <div>
      <BackLink href="/admin/products">Products</BackLink>
      <PageHeader
        title={product.name}
        description={`/product/${product.handle}`}
        action={
          <Link href={`/product/${product.handle}`} className="btn btn-ghost text-sm" target="_blank">
            View on storefront ↗
          </Link>
        }
      />
      <Flash saved={saved} error={error} />
      <ProductForm product={product} categories={categories} sellers={sellers} action={saveProduct} />

      <section className="card mt-4 border-danger/30 p-4">
        <h2 className="font-display text-lg font-semibold">Delete product</h2>
        <p className="mt-1 text-sm text-muted">Removes the product from the shop. Past order lines keep their snapshot.</p>
        <form action={deleteProduct} className="mt-3">
          <input type="hidden" name="id" value={product.id} />
          <ConfirmButton
            message={`Delete ${product.name}? This cannot be undone.`}
            className="rounded-full border border-danger/40 px-4 py-2 text-sm font-bold text-danger hover:bg-danger/10"
          >
            Delete product
          </ConfirmButton>
        </form>
      </section>
    </div>
  );
}
