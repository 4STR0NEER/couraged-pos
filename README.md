# CourageD POS

Staff-only register, inventory and analytics for CourageD Fitness Hub.
Separate app and Vercel project from the marketing site (`../couraged`); same brand tokens.

## Setup

1. Supabase › SQL Editor: run `supabase/schema.sql` (already done), then every numbered patch in `supabase/` in order (`001_…` to `004_…`). Each patch is safe to run again.
2. Supabase › Authentication › Sign In / Providers: turn **off** "Allow new users to sign up". Create staff accounts yourself under Authentication › Users › Add user. New accounts start `inactive`; give them a role:
   ```sql
   update public.profiles set role = 'staff' where id = (select id from auth.users where email = 'staff@example.com');
   ```
3. Copy `.env.example` to `.env.local` and fill in the URL and anon key (Project Settings › API).
4. `npm install` then `npm run dev` (`npm run dev:tablet` to open it from a tablet on the same wifi).

## Deploy

New Vercel project from this repo; add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables. Add the deployed URL under Supabase › Authentication › URL Configuration.

## Memberships

Sell memberships through the register as products with `kind = 'service'` and `category = 'Membership'` (no stock tracking). The Memberships analytics tab reads that category.

## What each part does

- **Register** (staff + admin): checkout, cash change, receipt.
- **Inventory** (staff + admin): receive deliveries, count shelves, write off spoilage, add and edit products and prices (admins can also delete). Stock only changes through these actions, and every change is in the product's History with who made it.
- **Sales** (admin only): every receipt with filters, cash-in-drawer totals, and voiding with a reason.
- **Analytics** (admin only): General, Merchandise, Memberships and Staff tabs for any date range.

## Tests

`npm run test:db` runs the schema and every patch in an in-process Postgres (PGlite) and checks permissions, checkout, stock and reports as staff, admin and an inactive user.
