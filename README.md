# Classy Luxe — The Scent of Elegance

Online store and business dashboard for **Classy Luxe**, a fragrance retailer in Alhaji Lapaz, Accra, Ghana.

**Stack:** Next.js 15 (App Router) · TypeScript · React 19 · Tailwind CSS v4 · Framer Motion · Supabase (PostgreSQL, Auth, Storage) · Paystack · Vercel · GitHub

> **Why the move from GitHub Pages?** The old site was one static HTML file with the products written into the code. Saving orders, an admin login, stock control and verified payments all need a server and a database, and GitHub Pages can't run either. This app runs on Vercel instead. **Keep the old GitHub Pages site live until this app is set up and tested.**

---

## Current status — please read

| Part | Status |
|---|---|
| Database: schema, security rules, functions, seed data | **Tested** on PostgreSQL 16: migrations apply cleanly, and the role, payment, stock and review rules were each checked with test queries |
| Next.js app (storefront + admin) | **Written, not yet built.** The development environment couldn't install packages, so `npm run build` hasn't been run. Expect possibly a few small TypeScript or lint fixes on the first build |
| Paystack | Built to Paystack's documented API. **Not tested against Paystack**, because no keys were available. Test with `sk_test_…` keys before going live |

---

## Features

### Storefront
- Homepage:
  - hero
  - collections
  - best sellers
  - a "Discover your signature scent" finder
  - why Classy Luxe
  - nationwide delivery (16 regions)
  - GCTU student section
  - brand story
  - testimonials
  - Instagram section
  - WhatsApp offers list
  - contact form
  - final call to action
- Shop:
  - search by name or scent note
  - filters: Student/General collection, category, price, in stock only
  - sorting: featured, newest, price, name
- Product pages (`/product/[slug]`):
  - image gallery
  - sizes, each with its own price
  - real stock status (In stock / Only N left / Out of stock)
  - quantity selector, Add to Bag, Order via WhatsApp
  - verified customer reviews
  - Product structured data (JSON-LD) for search engines
- Bag:
  - kept between visits
  - quantity limits follow real stock
  - subtotal
- Checkout:
  - **WhatsApp:** the order is saved in the database (e.g. `CL-1001`), then the customer taps to send a pre-filled WhatsApp message. The order stays *pending* and *unpaid* until you confirm it.
  - **Paystack (optional):** Mobile Money, card or bank transfer. Payment is verified on the server and through a signed webhook. An order is marked *paid* only when Paystack confirms the exact amount in GHS.
- Policy pages: `/privacy`, `/terms` and `/returns`, written by you in Admin → Settings. Nothing is invented.
- SEO and quality: sitemap, robots file, Open Graph tags, optimised images through `next/image`, security headers, reduced-motion support, keyboard access.

### Admin dashboard (`/admin`)
Each role sees only what it is allowed to:

| Area | Staff | Manager | Owner |
|---|:-:|:-:|:-:|
| Dashboard: sales, orders, pending/completed, products, low stock, recent orders, 30-day chart | ✓ | ✓ | ✓ |
| Orders: search, filter, details, status (Pending → Confirmed → Processing → Ready → Out for delivery → Delivered / Cancelled), history, record MoMo/cash payments | ✓ | ✓ | ✓ |
| Customers: search, contact details, order history | ✓ | ✓ | ✓ |
| Inventory: stock levels, restock and adjustments with a log, low-stock list | ✓ | ✓ | ✓ |
| Mark sizes unavailable, refunds | | ✓ | ✓ |
| Products: create, edit, delete, prices, sizes, images, featured, active | | ✓ | ✓ |
| Categories: create, edit, delete (only when empty), image, active | | ✓ | ✓ |
| Reviews: approve, reject, delete | | ✓ | ✓ |
| Delivery fees by area · Settings (contact, WhatsApp, social links, delivery text, policies, store options) | | ✓ | ✓ |
| Team: invite admins by email, change roles, deactivate | | | ✓ |

Payment status is kept separate from order status. Payments are recorded in their own `payments` table with the reference, provider, channel, amount and verification details.

## Security

- **Row Level Security** is on for every table.
  - The public can read only the active catalogue, delivery fees, store settings and *approved* reviews (name, rating, text and date only).
  - Customers, orders, payments and inventory history are admin-only.
- **Orders, payments and reviews are created by database functions** that the browser can't call:
  - `place_order` reads prices from the database, so a tampered cart can't change a price. It also locks and checks stock.
  - `mark_order_paid` refuses any amount that doesn't match.
  - `submit_review` accepts a review only from a customer whose order was delivered and included that product. It checks the order number plus the phone number used.
- **Admins can't edit totals, statuses or payment states directly.** Those go through `set_order_status`, `record_manual_payment` and `mark_order_refunded`. Each checks the admin's role and records history.
- **Roles are checked twice:** in the app (`requireAdmin('manager')`) and again in the database (`is_admin()` / `is_manager()` / `is_owner()`). Deactivated admins lose access immediately, and the last owner can't be demoted or removed.
- **No public admin sign-up.** Admins are invited by an owner.
- **Secret keys stay on the server.** `SUPABASE_SERVICE_ROLE_KEY` and `PAYSTACK_SECRET_KEY` are read only in `server-only` modules.
- **Inputs are validated with Zod** on the server.
- **Uploads:** images only, 5 MB maximum.
- **Bots:** the checkout form has a hidden honeypot field.
- **Logs:** structured logs, with phone numbers masked, go to Vercel → Logs.

## Setup

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com). Choose the region closest to Ghana, e.g. `eu-west`.
2. In **SQL Editor**, run these files in order:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_security.sql`
   - `supabase/migrations/0003_store_features.sql`
   - `supabase/seed.sql` (adds the 18 products, 8 categories, 16 regions and business details from the old website)

   Or, with the CLI: `supabase link --project-ref …`, then `supabase db push`, then run the seed.
3. **Turn off public sign-ups:** Authentication → Sign In / Providers → turn off "Allow new users to sign up".
4. **Create the first owner:** go to Authentication → Users → **Add user**, enter your email and a strong password, and tick *Auto confirm*. Then run:
   ```sql
   insert into public.admins (user_id, role, display_name)
   select id, 'owner', 'Your name' from auth.users where email = 'you@example.com';
   ```
   Invite everyone else from Admin → **Team**.
5. **For invitations:** set Authentication → URL Configuration → *Site URL* to your live domain, and add `https://YOUR-DOMAIN/admin/login` to the redirect URLs.
6. **Storage:** the `product-images` bucket is created by migration 0002. Nothing else to do.

### 2. Run it on your computer
```bash
cp .env.example .env.local   # values from Supabase → Project Settings → API
npm install
npm run build                # first build: fix any reported type/lint errors
npm run dev                  # http://localhost:3000  ·  admin: /admin
```

### 3. Deploy to Vercel
1. Push the code to GitHub. Use a **new** repository, or a new branch: the old GitHub Pages site should keep running until you switch over.
2. In Vercel, choose **Add New → Project** and import the repository. The framework is detected as Next.js.
3. Add the environment variables from `.env.example` for *Production* and *Preview*. Set `NEXT_PUBLIC_SITE_URL` to your domain.
4. Deploy. Then add your domain under Settings → Domains.

### 4. Paystack (optional)
1. Add `PAYSTACK_SECRET_KEY`. Start with the **test** key (`sk_test_…`).
2. In Paystack → Settings → API Keys & Webhooks, set the webhook URL to `https://YOUR-DOMAIN/api/paystack/webhook`. The callback URL is set automatically.
3. In Admin → **Delivery fees**, set fees for the areas where online payment should be offered. GCTU is free. Areas without a fee stay WhatsApp-only, so customers are never charged an incomplete total.
4. Place a test order with Paystack's test Mobile Money or card details. Check that the order turns *paid* in Admin → Orders, then switch to the live key.

## Testing checklist (before switching from the old site)
- [ ] Homepage, shop filters, search, sorting and product pages on a phone and a laptop
- [ ] Add to bag, change quantities, remove items, reload (the bag stays)
- [ ] WhatsApp checkout: the order appears in Admin → Orders, the WhatsApp message is correct, and the order stays pending/unpaid
- [ ] Admin login; a staff account can't open Products or Settings
- [ ] Create, edit and delete a product; upload an image; change a price; the shop updates
- [ ] Turn on stock tracking for a size, order more than is in stock (refused), cancel an order (stock returns)
- [ ] Record a MoMo payment; mark an order delivered; submit a review with that order number; approve it
- [ ] Paystack test payment (if used)

## Content to confirm before launch
- **Product photos:** the seed links to the photos the old site used. Most are hosted on Pinterest and one is from another retailer's site. They may not show your actual stock. Upload your own photos in Admin → Products, then remove those hosts from `next.config.ts`.
- **Mousuf** is listed twice: GH₵ 180, and GH₵ 550 ("burlap pouch edition", no photo). Both were on the old site. Confirm or edit.
- **Product categories:** Body Splash, Oil Perfumes, Deodorants, Diffusers, Hand Cream, Mini Wipes and Petal Paper Soap had no product listings. Add products in the admin; until then their pages invite customers to enquire on WhatsApp.
- **Testimonials** (`src/lib/site.ts`) come from the old site, but they mention fragrances that aren't in the catalogue (Midnight Royale, Rose Mystique, Oud Noir Prestige, Golden Hour, Emperor's Reserve). Confirm they're genuine, or remove them. New reviews come only from verified orders.
- **Homepage figures:** "50+ fragrances / 500+ happy clients" come from the old site. Edit them in `src/app/(store)/page.tsx` if needed.
- **Policies:** write your privacy, terms and returns policies in Admin → Settings.
- **Stock tracking** starts off for every size, because no stock figures existed. Turn it on in Admin → Inventory.

## Project structure
```
supabase/migrations/   0001 schema · 0002 RLS + storage · 0003 roles, payments, reviews, settings
supabase/seed.sql      catalogue, delivery areas and business details from the previous site
src/app/(store)/       storefront: home, product pages, checkout result, policy pages
src/app/admin/         login + (dashboard): orders, customers, inventory, products, categories, reviews, delivery, settings, team
src/app/api/paystack/  callback + webhook route handlers
src/app/actions/       checkout + review server actions
src/components/        store/ and admin/ UI
src/lib/               Supabase clients, catalogue queries, validation, money, Paystack, logging
```
