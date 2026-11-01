import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { Flash, PageHeader } from '@/components/admin/ui';

type Params = { q?: string; saved?: string; deleted?: string; error?: string };

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { q = '', saved, deleted, error } = await searchParams;
  const term = q.trim().slice(0, 60);

  const products = await prisma.product.findMany({
    where: term
      ? { OR: [{ name: { contains: term } }, { nameFr: { contains: term } }, { handle: { contains: term } }] }
      : {},
    orderBy: { name: 'asc' },
    take: 200,
    select: {
      id: true,
      handle: true,
      name: true,
      nameFr: true,
      priceCents: true,
      stock: true,
      featured: true,
      image: true,
      category: { select: { name: true } },
      seller: { select: { name: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Products"
        description="Create, edit, price and restock the catalogue."
        action={
          <Link href="/admin/products/new" className="btn btn-primary">
            New product
          </Link>
        }
      />

      <form method="get" action="/admin/products" className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-52 flex-1">
          <label className="label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={term} placeholder="Name or handle" className="field" />
        </div>
        <button type="submit" className="btn btn-primary px-6">
          Search
        </button>
        <p className="text-sm text-muted">{products.length} product(s)</p>
      </form>

      <Flash saved={saved} deleted={deleted} error={error} />

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-hover">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={product.image} alt="" width={40} height={40} className="h-10 w-10 rounded-lg bg-surface-alt object-contain p-1" />
                    <div>
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-xs text-muted">{product.handle}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">{product.category.name}</td>
                <td className="px-4 py-3 text-muted">{product.seller?.name ?? <span className="text-muted">Unassigned</span>}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatMoney(product.priceCents, 'en')}</td>
                <td className={`px-4 py-3 text-right font-semibold ${product.stock <= 10 ? 'text-warning' : ''}`}>{product.stock}</td>
                <td className="px-4 py-3">{product.featured ? 'Yes' : <span className="text-muted">No</span>}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/products/${product.id}/edit`} className="text-sm font-semibold text-brand hover:underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length ? null : <p className="px-4 py-8 text-center text-sm text-muted">No product matches this search.</p>}
      </div>
    </div>
  );
}
