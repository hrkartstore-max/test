# ZSITE Phase 1 — Foundation

## Current architecture

- Next.js App Router
- React 19
- TypeScript strict mode
- Supabase client integration
- Existing merchant dashboard preserved in `app/page.tsx`
- Existing payment, subscription, shipping and store routes preserved

## Foundation boundaries

- `lib/config/env.ts`: explicit public/server environment boundary
- `lib/http/response.ts`: standardized API response envelope
- `lib/errors.ts`: application error model
- `lib/logger.ts`: structured server-safe logging
- `lib/validation/`: shared validation primitives
- `lib/server/request.ts`: request correlation
- `middleware.ts`: baseline response security headers
- `app/api/health`: health endpoint
- `app/api/v1/health`: versioned API health endpoint

## Security rules

Server-only credentials must never be imported by client components. Only variables prefixed with `NEXT_PUBLIC_` are intended for browser exposure.

The existing dashboard is intentionally not rewritten during Foundation. Authentication, tenant authorization and RLS are Phase 2/3 work and must replace any client-trusted ownership assumptions before production use.

## Validation

Phase 1 is considered validated only when lint, TypeScript and production build execute successfully in CI.
