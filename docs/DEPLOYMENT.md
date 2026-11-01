# CityMarket web app — deployment

Target: Hostinger VPS (Ubuntu 22.04/24.04) + Neon Postgres. Node 20 or newer.

## 1. Neon database

1. Neon console → **New project** → name `citymarket`, region closest to your customers.
2. Open the project → **Connection Details** → copy the **pooled** connection string (host ends with `-pooler`).
3. Use the pooled URL in the app (`prisma` needs one connection, not many).

The database name in the URL must stay a single word. Prisma cannot open a database whose name contains a space
(for example `CMB DATABASE`): it reports "Can't reach database server" and every page that reads data returns 500,
while `/admin/login` keeps working because it needs no database. Use `citymarket`, `neondb` or any other single word.

`.env` on the server:

```
DATABASE_URL="postgresql://<user>:<password>@<ep-name>-pooler.<region>.aws.neon.tech/citymarket?sslmode=require"
NEXT_PUBLIC_SITE_URL="https://<your-domain>"
NEXT_PUBLIC_WHATSAPP=""
NEXT_PUBLIC_SUPPORT_EMAIL=""
AUTH_SECRET="<48 random bytes as hex>"
ADMIN_EMAIL="<your admin email>"
ADMIN_PASSWORD="<at least 10 characters>"
ADMIN_NAME="<display name>"
SELLER_EMAIL="citymarketshop250@gmail.com"
SELLER_PASSWORD="<at least 8 characters>"
SELLER_NAME="HighQuality Ltd"
GOOGLE_CLIENT_ID="<from Google Cloud Console>"
GOOGLE_CLIENT_SECRET="<from Google Cloud Console>"
```

Generate the session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Leave nothing unset: `DATABASE_URL` must be the real Neon URL, `NEXT_PUBLIC_SITE_URL` must be the public https origin,
and `AUTH_SECRET` is required for admin, customer and vendor login. `ADMIN_EMAIL` / `ADMIN_PASSWORD` are read only when you run
`npm run db:admin`. `SELLER_EMAIL` / `SELLER_PASSWORD` / `SELLER_NAME` are read only when you run `npm run db:seller`.
`NEXT_PUBLIC_WHATSAPP` (digits only, e.g. `250788123456`) and `NEXT_PUBLIC_SUPPORT_EMAIL` are
optional; the footer and support page hide those links when the values are empty.

Customer accounts, purchases, deals, rating filters and the six info pages work without extra configuration. Vendors sign
in at `/seller/login` and can register new vendor accounts from `/seller/register`.

**Never copy `.env.local` from your machine to the server.** Next.js loads `.env.local` in production as well, and its
local `DATABASE_URL` would override the Neon URL in `.env`, pointing the live site at a missing local database.

## 2. Server setup (once)

```bash
ssh root@<vps-ip>
apt update && apt install -y curl git nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pnpm pm2
node -v        # expect v22.x
```

## 3. Deploy

```bash
cd /opt && git clone <your-repo> citymarket && cd citymarket
cp .env.example .env      # paste the Neon and admin values
npm ci
npm run db:init           # creates the tables, loads 19 categories + 163 products, creates admin and vendor
npm run build
pm2 start npm --name citymarket -- start
pm2 save && pm2 startup
```

`npm run db:init` can also be run from a laptop against Neon when the host has no shell: put the Neon strings in
`.env`, run it, and the app picks the tables up without a redeploy. It finishes by regenerating the local SQLite
client, so local development keeps using `prisma/dev.db`.

When Node cannot be run at all, paste `prisma/neon-schema.sql` and then `prisma/neon-data.sql` into the Neon SQL
editor. That creates the tables and the catalogue; the admin and vendor accounts still come from `npm run db:admin`
and `npm run db:seller`.

The dashboard lives at `/admin`. Re-run `npm run db:admin` any time you want to reset the admin password.

The vendor portal lives at `/seller`. Re-run `npm run db:seller` after changing `SELLER_PASSWORD` to reset the
HighQuality Ltd password; it only claims products that have no vendor yet, so it never moves another vendor's listings.
New vendors create their own account at `/seller/register` and can publish products immediately. Admin can reassign a
product to a vendor from its edit page under **Products → Vendor**.

## 3b. Google sign-in (customers)

1. Google Cloud Console → **APIs & Services → OAuth consent screen**: user type **External**, app name CityMarket,
   support email, scopes `.../auth/userinfo.email` and `.../auth/userinfo.profile`.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. Authorized redirect URIs — add both and nothing else:
   - `https://<your-domain>/api/auth/google/callback`
   - `http://localhost:3100/api/auth/google/callback`
4. Copy the client ID and secret into `.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, then
   `npm run build` and `pm2 reload citymarket`.

The redirect URI is built from `NEXT_PUBLIC_SITE_URL`, so that variable must be the exact public origin
(`https://<your-domain>`, no trailing slash). When both Google values are empty the sign-in buttons on `/login`,
`/signup` and `/checkout` stay disabled; a blank client ID never reaches Google.

Google users get a normal customer account (no password), and signing in with an email that already has a password
account links the Google identity to it. Orders placed as a guest with that email are claimed by the account on
sign-in.

## 3c. Online payments (Flutterwave)

Prices and rails follow the shopper's country — see §3d before configuring this section.

Checkout offers cash on delivery, bank transfer, debit/credit card and the mobile money rails the shopper's country has.
Card is always charged in US dollars. Mobile money is charged in the rail's own currency, because Flutterwave rejects
any other: MTN MoMo (`mobilemoneyrwanda`) only in RWF, Orange Money and Wave (`mobilemoneyxof`, networks
`ORANGEMONEY` / `WAVE`) only in XOF. The rate used is `PAY_RWF_PER_USD` or `PAY_XOF_PER_USD`, and checkout prints the
exact local amount before the customer leaves the site.

1. Flutterwave Dashboard → **Settings → API keys**: copy the **Secret key** into `FLW_SECRET_KEY`.
   Your Flutterwave account must be enabled for RWF and XOF collections and for the mobile money networks you want.
2. **Settings → Webhooks**: set the URL to `https://<your-domain>/api/payments/flutterwave/webhook` and choose a
   secret hash. Put the same hash in `FLW_WEBHOOK_HASH` (the server rejects any webhook whose `verif-hash` header
   does not match it).
3. Set the FX rates you want to bill (see §3d) and restart the app.

Redirect URL used by the gateway: `https://<your-domain>/api/payments/flutterwave/callback`, built from
`NEXT_PUBLIC_SITE_URL`. Every payment is verified server-to-server against the Flutterwave transaction API before an
order is marked paid — both on the browser redirect and on the webhook — and the amount, currency and order reference
must match the stored order. A failed or cancelled payment keeps the order and offers **Pay now** on the order page.

With `FLW_SECRET_KEY` empty, every online method is disabled in checkout and only cash on delivery (plus bank transfer,
if configured) works; the `FLW_API_BASE` variable exists only to point the integration at a sandbox or proxy during testing.

## 3d. Countries, currencies and rails

Each shopper is served in one **market**. A market decides the currency the whole site is priced in and the payment
methods checkout offers. Prices are stored in US cent everywhere; the local figure is derived at render time, so a
change of rate never rewrites history — orders keep the currency and amount they were taken in.

| Market | Currency | Rails | FX variable |
| --- | --- | --- | --- |
| Rwanda (`RW`) | RWF | cash on delivery, card, MTN MoMo, bank transfer | `PAY_RWF_PER_USD` |
| Senegal + the XOF zone (`SN`) | XOF | cash on delivery, card, Orange Money, Wave, bank transfer | `PAY_XOF_PER_USD` |
| Everywhere else (`INT`) | USD | cash on delivery, card | none |

Resolution order for a visit: the `cmb_market` cookie (set when the shopper picks a country in the header) → the
country header from the CDN or proxy (`x-geo-country`, `cf-ipcountry`, `x-country-code`, `x-forwarded-country`) →
`INT`. Nginx must forward the header for geo detection to reach the app:

```
proxy_set_header x-geo-country $http_x_geo_country;
```

The header pill in the navbar also guesses the country client-side (get.geojs.io) when no cookie exists yet and offers
it as "Detected: …" — a shopper's explicit pick is never overwritten.

A market goes live only when it can actually price and collect:

- `PAY_RWF_PER_USD` missing → Rwanda drops out of the switcher and MTN MoMo is unavailable (Flutterwave needs an RWF
  amount). `PAY_XOF_PER_USD` missing → same for Senegal, Orange Money and Wave.
- `PAY_BANK_NAME`, `PAY_BANK_ACCOUNT` and `PAY_BANK_HOLDER` — all three required, or the bank option stays hidden.
  Flutterwave has no inbound bank transfer product for Rwanda or Senegal, so this rail is a **manual** transfer: the
  order page prints the account and an admin marks the payment received after checking the statement. Never ask the
  shopper for a card number, PIN or CVV.

Values to paste in `/opt/citymarket/.env` (adjust the two rates to the ones you want to bill — leave the bank
variables empty until the vendor's real account is known):

```
PAY_RWF_PER_USD="1300"
PAY_XOF_PER_USD="600"
PAY_BANK_NAME=""
PAY_BANK_ACCOUNT=""
PAY_BANK_HOLDER=""
```

`createOrder` re-checks the method against the resolved market on the server, so a hand-crafted request that posts
`paymentMethod=orange` while the market is Rwanda is rejected with `invalid:paymentMethod` — the filter in the UI is
a convenience, not the rule. The new `Order.market` column means the schema must be pushed to Neon before this goes
live: `npx prisma db push --schema=prisma/schema.prisma`.

## 3e. Meal planner (Luna)

`/meal-planner` runs a three-step quiz (meal style, dietary needs, shopping rhythm + optional budget) and asks GPT-4o for a
plan built **only** from grocery products that are in stock. The model returns product handles; the server drops any handle
that is not in the catalogue and re-prices every line from the database before returning the plan, so a model mistake can
never invent a product or a price. The shopper then adds the whole plan to the normal cart in one click.

The feature is off until the OpenAI key is set. Add it to `/opt/citymarket/.env` (server-only, never `NEXT_PUBLIC_`):

```
OPENAI_API_KEY="<key from platform.openai.com>"
OPENAI_MODEL="gpt-4o"
```

`OPENAI_MODEL` is optional and defaults to `gpt-4o`. Restart pm2 after editing. With no key, the page shows an
"unavailable" note and `POST /api/meal-planner` answers 503 — the rest of the storefront is unaffected.

Limits: five plans per IP per ten minutes, a 45-second upstream timeout, and a 60-second route budget. Until the key is
set, the page shows the unavailable note and the route answers 503. Billing comes from your OpenAI account; a week-long
plan is a single chat completion.

## 3f. Live chat (Luna)

Every storefront page has a floating chat button that opens **Luna**, the store's AI assistant. She answers product,
delivery and order questions, searches the live catalogue, offers product cards with the normal Add to cart button, and
can prepare a real order. She replies in the shopper's language (English, French, Ikinyarwanda, Kiswahili, others),
because the model is instructed to mirror the language of the customer's last message — no per-language copy to maintain.

She also manages the shopper's cart — `add_to_cart`, `update_cart`, `view_cart` and `clear_cart` change the same local
cart as the storefront and the widget renders a cart summary card — and answers store-policy questions from
`get_store_info`, which reads delivery windows and fees, the market's payment rails, returns and order-change policy,
support contacts and the live coupon codes (filtered to the shopper's market). Those tools are read-only against the
catalogue and cart, so they need no extra configuration beyond the variables below.

It uses the same `OPENAI_API_KEY` as the meal planner (§3e); no extra key or schema change is needed. Two optional
overrides exist for both features:

```
OPENAI_MODEL="gpt-4o"
OPENAI_BASE_URL="<optional compatible endpoint>"
```

`OPENAI_BASE_URL` is unset in production and only useful for a local fixture. `AUTH_SECRET` must be at least 32
characters (already required for sessions) because the order draft is signed with it. With no key the widget opens in
an offline state that links to the shop and WhatsApp, and `POST /api/chat` answers 503.

How ordering stays safe:

- The model can only call `prepare_order`, which validates stock and every checkout field, re-prices the lines from the
  database, and returns a **signed 15-minute draft**. Nothing is written yet; the shopper must tap **Confirm order**.
- `POST /api/chat/order` re-checks the token signature, expiry, IP and market, consumes its nonce (a replay answers
  409 `duplicate`), then calls the same `createOrder` as the checkout page. Online methods start the normal
  Flutterwave payment; the confirmation card shows **Pay now** and the order page.
- Order status is only returned when the phone digits match the order phone or the shopper is signed in.
- The assistant never asks for card numbers, PINs or CVVs, and no payment data is sent to the model.

Limits: 12 chat messages per IP per 5 minutes (32 KB body), 6 confirmations per minute (8 KB body), a 45-second upstream
timeout and 60-second route budget, with up to four tool rounds per reply. Nginx must forward `X-Forwarded-For` (§4) so
these limits apply per shopper rather than per proxy.

## 3g. Vendors and storefronts

A vendor is a `Seller` row with a public storefront at `/store/<handle>`. The store is live only while the monthly
subscription is paid (`storefrontUntil` in the future) and the account is not suspended (`suspendedAt` is null).
Expired, unpaid and suspended vendors keep their portal access but their products disappear from the shop, search,
chat, meal planner, product pages and sitemap.

- **Billing.** The plan price is `feeRwf` (default RWF 20,000) for `feeDays` (default 30) and is charged through the
  normal Flutterwave rails: card in USD, MTN MoMo in RWF, Orange/Wave in XOF using `PAY_RWF_PER_USD` and
  `PAY_XOF_PER_USD`. The conversion is in `src/lib/vendor-billing.ts`. Each attempt creates a `StorefrontInvoice`;
  the callback and the webhook verify the transaction before extending `storefrontUntil` (a renewal adds days on top).
- **Subaccounts.** Each vendor enters a Flutterwave subaccount ID (`RS_…`) in **Vendor portal → Storefront settings**.
  Flutterwave creates these under **Dashboard → Subaccounts**. Checkout sends one `subaccounts[]` entry per vendor in
  the cart, with `transaction_split_ratio` = that vendor's discounted item value ÷ order total × 100. The delivery fee
  stays with the platform, and ratios are capped so they never exceed 100.
- **Payouts.** Online orders paid with a vendor subaccount record a `VendorSettlement` with status `split` — Flutterwave
  pays the vendor directly at charge time. Cash-on-delivery orders, and vendors without a subaccount, record the same
  row as `pending`; an administrator marks it paid in **Admin → Vendors → Payouts waiting**, which is the record that
  the manual transfer left the platform account.
- **Admin.** **Admin → Vendors** extends the subscription (the **+N days** button grants `feeDays` by default),
  suspends or restores a store and edits its fee plan. Suspending or expiring a store immediately removes its products
  from the public catalogue (the cached `catalog` tag is revalidated on every change).

Vendor accounts are created at `/seller/register` (name, city, email, password). The storefront handle is generated
from the store name and can be edited in **Storefront settings**; it must be unique. New accounts start unpaid, so their
products stay hidden until the first storefront payment (or an admin extension). The `.env` seed for the platform's own
vendor is:

```
SELLER_EMAIL="citymarketshop250@gmail.com"
SELLER_PASSWORD="<at least 8 characters>"
SELLER_NAME="HighQuality Ltd"
SELLER_HANDLE="highquality"
SELLER_STOREFRONT_DAYS="365"
SELLER_FEE_RWF="20000"
```

`npm run db:seller` upserts that account, assigns unowned products to it and activates a 365-day storefront. To adopt
the feature on an existing database, push the schema and give every existing vendor row a store address (adjust the
handle list for the account you want to keep):

```bash
npx prisma db push
```

```sql
UPDATE "Seller" SET handle = 'highquality', "storefrontUntil" = NOW() + INTERVAL '365 days' WHERE email = 'citymarketshop250@gmail.com';
UPDATE "Seller"
SET handle = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g')) || '-' || left(id, 4)
WHERE handle IS NULL;
```

Vendors that should not sell yet keep their handle but no `storefrontUntil`, so all their products stay hidden.

## 4. Nginx + HTTPS

`/etc/nginx/sites-available/citymarket`:

```
server {
  listen 80;
  server_name <your-domain>;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
ln -s /etc/nginx/sites-available/citymarket /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d <your-domain>
```

`X-Forwarded-For` is required: the order API rate-limits per client IP and reads that header.

## 5. Hostinger DNS

Add an **A record** for `@` and `www` pointing at the VPS IP. Allow ports 80/443 in the Hostinger firewall.

## 6. Updates

```bash
cd /opt/citymarket
git pull
npm ci
npx prisma db push
npm run build
pm2 reload citymarket
```

## Data pipeline

`prisma/catalog.json` is generated from the original Flutter app state:

```bash
node scripts/extract-catalog.mjs ../path-to-citymarket    # parses FFAppState mock data
node scripts/fetch-media.mjs                              # downloads product images
node scripts/optimize-media.mjs                           # converts to 720px webp
node prisma/seed.mjs                                      # upserts into the database
```

Prices are stored in USD cents and the extractor keeps the original USD amounts from the template
(`priceCents` in `catalog.json`). After deployment, edit prices, compare-at prices and stock in the
dashboard under **Products**.
