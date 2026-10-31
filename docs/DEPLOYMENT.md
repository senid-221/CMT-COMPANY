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
and `AUTH_SECRET` is required for admin, customer and seller login. `ADMIN_EMAIL` / `ADMIN_PASSWORD` are read only when you run
`npm run db:admin`. `SELLER_EMAIL` / `SELLER_PASSWORD` / `SELLER_NAME` are read only when you run `npm run db:seller`.
`NEXT_PUBLIC_WHATSAPP` (digits only, e.g. `250788123456`) and `NEXT_PUBLIC_SUPPORT_EMAIL` are
optional; the footer and support page hide those links when the values are empty.

Customer accounts, purchases, deals, rating filters and the six info pages work without extra configuration. Sellers sign
in at `/seller/login` and can register new seller accounts from `/seller/register`.

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
npm run db:init           # creates the tables, loads 19 categories + 163 products, creates admin and seller
npm run build
pm2 start npm --name citymarket -- start
pm2 save && pm2 startup
```

`npm run db:init` can also be run from a laptop against Neon when the host has no shell: put the Neon strings in
`.env`, run it, and the app picks the tables up without a redeploy. It finishes by regenerating the local SQLite
client, so local development keeps using `prisma/dev.db`.

When Node cannot be run at all, paste `prisma/neon-schema.sql` and then `prisma/neon-data.sql` into the Neon SQL
editor. That creates the tables and the catalogue; the admin and seller accounts still come from `npm run db:admin`
and `npm run db:seller`.

The dashboard lives at `/admin`. Re-run `npm run db:admin` any time you want to reset the admin password.

The seller portal lives at `/seller`. Re-run `npm run db:seller` after changing `SELLER_PASSWORD` to reset the
HighQuality Ltd password; it only claims products that have no seller yet, so it never moves another seller's listings.
New sellers create their own account at `/seller/register` and can publish products immediately. Admin can reassign a
product to a seller from its edit page under **Products → Seller**.

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
variables empty until the seller's real account is known):

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
