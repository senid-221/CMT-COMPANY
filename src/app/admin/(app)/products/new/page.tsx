import { prisma } from '@/lib/db';
import { saveProduct } from '@/app/admin/actions';
import { BackLink, Flash, PageHeader } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/product-form';

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [categories, sellers] = await Promise.all([
    prisma.category.findMany({ orderBy: { sort: 'asc' }, select: { id: true, name: true } }),
    prisma.seller.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <BackLink href="/admin/products">Products</BackLink>
      <PageHeader title="New product" description="Add a product to the catalogue." />
      <Flash error={error} />
      <ProductForm categories={categories} sellers={sellers} action={saveProduct} />
    </div>
  );
}
