type Category = { id: string; name: string };
type Product = {
  id: string;
  handle: string;
  name: string;
  nameFr: string | null;
  unit: string;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  image: string;
  description: string | null;
  descriptionFr: string | null;
  categoryId: string;
};

export function SellerProductForm({ product, categories, action }: { product?: Product; categories: Category[]; action: (formData: FormData) => void }) {
  return (
    <form action={action} className="grid gap-4 lg:grid-cols-2">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-display text-lg font-semibold text-slate-900">Product basics</h2>
        <div>
          <label className="label" htmlFor="name">
            Name (English)
          </label>
          <input id="name" name="name" required defaultValue={product?.name ?? ''} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="nameFr">
            Name (French)
          </label>
          <input id="nameFr" name="nameFr" defaultValue={product?.nameFr ?? ''} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="handle">
            Handle (URL)
          </label>
          <input id="handle" name="handle" required defaultValue={product?.handle ?? ''} pattern="[a-zA-Z0-9-]{2,80}" className="field" />
          <p className="mt-1 text-xs text-slate-500">Used in /product/&lt;handle&gt;. Letters, numbers and dashes.</p>
        </div>
        <div>
          <label className="label" htmlFor="categoryId">
            Category
          </label>
          <select id="categoryId" name="categoryId" required defaultValue={product?.categoryId ?? ''} className="field">
            <option value="">Choose a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="unit">
            Unit
          </label>
          <input id="unit" name="unit" required defaultValue={product?.unit ?? ''} placeholder="1 kg" className="field" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-display text-lg font-semibold text-slate-900">Price and stock</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="price">
                Price (USD)
              </label>
              <input id="price" name="price" type="number" min={0.01} max={1000000} step={0.01} required defaultValue={product ? product.priceCents / 100 : ''} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="stock">
                Stock
              </label>
              <input id="stock" name="stock" type="number" min={0} max={100000} required defaultValue={product?.stock ?? 60} className="field" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="compareAt">
              Compare-at price (optional)
            </label>
            <input id="compareAt" name="compareAt" type="number" min={0.01} max={1000000} step={0.01} defaultValue={product?.compareAtCents ? product.compareAtCents / 100 : ''} className="field" />
            <p className="mt-1 text-xs text-slate-500">Shows a strikethrough price and a discount badge. Leave empty for no deal.</p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-display text-lg font-semibold text-slate-900">Media and description</h2>
          <div>
            <label className="label" htmlFor="image">
              Image path or URL
            </label>
            <input id="image" name="image" required defaultValue={product?.image ?? '/media/'} className="field" />
            {product ? <img src={product.image} alt="" width={64} height={64} className="mt-2 h-16 w-16 rounded-xl bg-slate-50 object-contain p-1" /> : null}
          </div>
          <div>
            <label className="label" htmlFor="description">
              Description (English)
            </label>
            <textarea id="description" name="description" rows={3} defaultValue={product?.description ?? ''} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="descriptionFr">
              Description (French)
            </label>
            <textarea id="descriptionFr" name="descriptionFr" rows={3} defaultValue={product?.descriptionFr ?? ''} className="field" />
          </div>
        </div>

        <button type="submit" className="btn btn-primary w-full">
          {product ? 'Save product' : 'Publish product'}
        </button>
      </div>
    </form>
  );
}
