# CourageD POS

Staff-only register, inventory and analytics for CourageD Fitness Hub.
Separate app and Vercel project from the marketing site (`../couraged`); same brand tokens.

## Setup

1. Supabase › SQL Editor: run `supabase/schema.sql` (already done), then every numbered patch in `supabase/` in order.
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
