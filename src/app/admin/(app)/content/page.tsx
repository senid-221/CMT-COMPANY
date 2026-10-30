import Link from 'next/link';
import { getContent } from '@/lib/content';
import { prisma } from '@/lib/db';
import { saveSiteContent } from '@/app/admin/actions';
import { Flash, PageHeader } from '@/components/admin/ui';

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { saved, error } = await searchParams;
  const [content, products] = await Promise.all([
    getContent(),
    prisma.product.findMany({ orderBy: { name: 'asc' }, select: { handle: true, name: true }, take: 100 }),
  ]);

  return (
    <div>
      <PageHeader
        title="Website content"
        description="Homepage blocks shown to English and French visitors."
        action={
          <Link href="/" target="_blank" className="btn btn-ghost text-sm">
            Open storefront ↗
          </Link>
        }
      />

      <Flash saved={saved} error={error} />

      <form action={saveSiteContent} className="space-y-4">
        <section className="card space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">Announcement bar</h2>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="announcementEnabled" defaultChecked={content.announcement.enabled} className="h-4 w-4" />
              Show the bar
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="announcementEn">
                Text (English)
              </label>
              <input id="announcementEn" name="announcementEn" defaultValue={content.announcement.text.en} maxLength={160} className="field" placeholder="Free delivery over 30 000 USD today" />
            </div>
            <div>
              <label className="label" htmlFor="announcementFr">
                Text (French)
              </label>
              <input id="announcementFr" name="announcementFr" defaultValue={content.announcement.text.fr} maxLength={160} className="field" placeholder="Livraison gratuite dès 30 000 USD" />
            </div>
          </div>
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="font-display text-lg font-semibold">Homepage hero</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="heroTitleEn">
                Title (English)
              </label>
              <input id="heroTitleEn" name="heroTitleEn" defaultValue={content.hero.title.en} maxLength={120} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="heroTitleFr">
                Title (French)
              </label>
              <input id="heroTitleFr" name="heroTitleFr" defaultValue={content.hero.title.fr} maxLength={120} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="heroTextEn">
                Text (English)
              </label>
              <textarea id="heroTextEn" name="heroTextEn" rows={3} defaultValue={content.hero.text.en} maxLength={400} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="heroTextFr">
                Text (French)
              </label>
              <textarea id="heroTextFr" name="heroTextFr" rows={3} defaultValue={content.hero.text.fr} maxLength={400} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="ctaLabelEn">
                Button label (English)
              </label>
              <input id="ctaLabelEn" name="ctaLabelEn" defaultValue={content.hero.ctaLabel.en} maxLength={40} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="ctaLabelFr">
                Button label (French)
              </label>
              <input id="ctaLabelFr" name="ctaLabelFr" defaultValue={content.hero.ctaLabel.fr} maxLength={40} className="field" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="ctaHref">
                Button link
              </label>
              <input id="ctaHref" name="ctaHref" defaultValue={content.hero.ctaHref} maxLength={200} className="field" placeholder="/shop" />
              <p className="mt-1 text-xs text-muted">Internal path only, for example /shop or /category/fruits.</p>
            </div>
          </div>
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="font-display text-lg font-semibold">Delivery note</h2>
          <p className="text-sm text-muted">Shown next to “Today’s picks”. Leave empty to use the default free-delivery message.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="deliveryNoteEn">
                Note (English)
              </label>
              <input id="deliveryNoteEn" name="deliveryNoteEn" defaultValue={content.delivery.note.en} maxLength={160} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="deliveryNoteFr">
                Note (French)
              </label>
              <input id="deliveryNoteFr" name="deliveryNoteFr" defaultValue={content.delivery.note.fr} maxLength={160} className="field" />
            </div>
          </div>
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="font-display text-lg font-semibold">Featured products</h2>
          <p className="text-sm text-muted">
            Product handles, comma separated (up to 12). Leave empty to use the products flagged as featured. Available handles:{' '}
            <span className="text-ink">{products.slice(0, 8).map((product) => product.handle).join(', ')}{products.length > 8 ? '…' : ''}</span>
          </p>
          <div>
            <label className="label" htmlFor="featuredHandles">
              Handles
            </label>
            <textarea id="featuredHandles" name="featuredHandles" rows={2} defaultValue={content.featured.handles.join(', ')} className="field" />
          </div>
        </section>

        <button type="submit" className="btn btn-primary">
          Save homepage
        </button>
      </form>
    </div>
  );
}
