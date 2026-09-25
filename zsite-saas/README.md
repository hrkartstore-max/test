# HEPRA Store Builder

India-first multi-tenant commerce SaaS inspired by the supplied ZSite admin references.

## Stack
Next.js 15 · React 19 · TypeScript · Supabase Postgres/Auth · Vercel

## Included MVP
- Admin shell matching the supplied mobile/desktop reference
- Orders, Items, Categories, Discounts and Payments modules
- Item creation/search and category creation/toggles
- Supabase multi-tenant schema with RLS
- Ready for public storefront routes and custom domains

## Deploy
Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel, then deploy with root directory zsite-saas.

## Database
Run supabase/schema.sql in Supabase SQL editor or migration.