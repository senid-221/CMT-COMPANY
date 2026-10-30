# CityMarket web app — deployment

Target: Hostinger VPS (Ubuntu 22.04/24.04) + Neon Postgres. Node 20 or newer.

## 1. Neon database

1. Neon console → **New project** → name `citymarket`, region closest to your customers.
2. Open the project → **Connection Details** → copy the **pooled** connection string (host ends with `-pooler`).
3. Use the pooled URL in the app (`prisma` needs one connection, not many).

`.env` on the server:

```
DATABASE_URL="postgresql://<user>:<password>@<ep-name>-pooler.<region>.aws.neon.tech/neondb?sslmode=require"
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
npx prisma db push        # creates the tables
node prisma/seed.mjs      # loads 9 categories + 50 products
npm run db:admin          # creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD
npm run db:seller         # creates HighQuality Ltd from SELLER_EMAIL / SELLER_PASSWORD and assigns every unowned product to it
npm run build
pm2 start npm --name citymarket -- start
pm2 save && pm2 startup
```

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

Checkout offers cash on delivery plus four online methods: debit/credit card, MTN Mobile Money, Orange Money and Wave.
Card is charged in US dollars; the three mobile money methods are charged in CFA francs (XOF) at the rate in
`PAY_XOF_PER_USD`. The sticker price stays in USD — checkout shows the exact XOF amount before the customer leaves.

1. Flutterwave Dashboard → **Settings → API keys**: copy the **Secret key** into `FLW_SECRET_KEY`.
   Your Flutterwave account must be enabled for XOF collections and for the mobile money networks you want to offer.
2. **Settings → Webhooks**: set the URL to `https://<your-domain>/api/payments/flutterwave/webhook` and choose a
   secret hash. Put the same hash in `FLW_WEBHOOK_HASH` (the server rejects any webhook whose `verif-hash` header
   does not match it).
3. Set `PAY_XOF_PER_USD` to the rate you want to charge (for example `600`). Restart the app.

Redirect URL used by the gateway: `https://<your-domain>/api/payments/flutterwave/callback`, built from
`NEXT_PUBLIC_SITE_URL`. Every payment is verified server-to-server against the Flutterwave transaction API before an
order is marked paid — both on the browser redirect and on the webhook — and the amount, currency and order reference
must match the stored order. A failed or cancelled payment keeps the order and offers **Pay now** on the order page.

With `FLW_SECRET_KEY` empty, all four online methods are disabled in checkout and only cash on delivery works; the
`FLW_API_BASE` variable exists only to point the integration at a sandbox or proxy during testing.

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
