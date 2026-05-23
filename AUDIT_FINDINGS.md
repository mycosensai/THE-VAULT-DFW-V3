# THE VAULT DFW — Production Audit Findings

Audit branch: `vault-production-rebuild`

## Executive Summary

The current codebase is not yet production-ready as a secure marketplace. The frontend is substantial and has many marketplace routes, but multiple high-risk systems still need hardening before real users, sellers, payments, or crypto transactions are enabled.

## Confirmed Findings

### 1. Admin and sensitive routes are browser-reachable

The main router exposes `/admin`, `/admin/agents`, `/admin/marketing`, `/orders`, `/sale`, `/agents`, checkout routes, and seller-related flows. Some pages perform client-side auth checks, but protection must also exist server-side.

Required fix:
- Add route guard components.
- Add backend role enforcement for every protected tRPC/API procedure.
- Never rely on frontend redirects for admin/security.

### 2. Local storage auth token usage exists

The tRPC provider reads `local_auth_token` from browser localStorage and sends it as an `x-local-auth-token` header.

Risk:
- Tokens in localStorage are exposed to XSS.
- Header-token auth is weaker than secure HTTP-only cookie sessions for this marketplace use case.

Required fix:
- Move auth to secure HTTP-only cookies.
- Rotate refresh tokens server-side.
- Remove frontend-readable tokens.

### 3. Anonymous session ID is weakly generated client-side

The app creates `vault_session_id` using `Math.random()` plus timestamp.

Risk:
- Predictable/non-cryptographic session IDs.
- Client can forge anonymous session IDs.

Required fix:
- Issue anonymous/cart sessions server-side.
- Use cryptographically secure randomness.
- Bind cart/order state to server records.

### 4. Stripe checkout depends on backend validation

Frontend checkout passes listing ID and redirect URLs to a Stripe session mutation.

Required fix:
- Backend must re-fetch listing price from DB.
- Backend must validate inventory/status.
- Backend must reject client-provided amount or seller payout data.
- Webhook must verify payment success before marking orders paid.

### 5. Crypto checkout appears to use Coinbase Commerce plus direct wallet payment

Crypto checkout redirects to Coinbase Commerce and offers direct Solana wallet payment.

Required fix:
- Backend must verify Coinbase webhooks.
- Direct Solana payment must validate signature, recipient, amount, token mint, and confirmation count.
- Never trust frontend wallet confirmation.

### 6. Production architecture is still prototype-shaped

The current app is primarily a single Vite app with API references, rather than the recommended `/apps/frontend`, `/apps/backend`, `/packages/shared` monorepo from the production blueprint.

Required fix:
- Split frontend/backend concerns.
- Add dedicated backend service.
- Add Prisma/PostgreSQL production database.

## Production Blockers

- [ ] Replace localStorage auth with secure cookie auth
- [ ] Add backend requireAuth/requireSeller/requireAdmin enforcement
- [ ] Add Prisma/PostgreSQL schema and migrations
- [ ] Add seller ownership enforcement
- [ ] Add Stripe webhook verification
- [ ] Add Stripe Connect onboarding and payouts
- [ ] Add Solana RPC transaction verification
- [ ] Add inventory locking
- [ ] Add order state machine
- [ ] Add CSRF protection
- [ ] Add rate limiting
- [ ] Add audit logging
- [ ] Add CI build/test/lint checks
- [ ] Add monitoring

## Recommended Next Repair Commit

Implement the production auth foundation:

1. Create backend auth middleware.
2. Remove localStorage token usage.
3. Add secure HTTP-only cookies.
4. Add server-side admin/seller enforcement.
5. Protect all sensitive tRPC/API procedures.


## Cloudflare Shipping Audit (2026-05-23)

### Current Ship Decision

**Decision: Not ready to ship to Cloudflare production yet.**

### Blocking Findings

1. **D1 production binding is still a placeholder**
   - `wrangler.toml` still uses `database_id = "REPLACE_WITH_REAL_D1_DATABASE_ID"`.
   - Until this is replaced with an actual D1 database ID, production API/database calls will fail.

2. **Build pipeline is not currently reproducible in this environment**
   - `npm run build` fails because Vite is not installed locally yet.
   - Attempting `npm ci` fails with `403 Forbidden` when resolving `@clerk/backend`, so dependencies cannot be installed in this environment for verification.

3. **Static + Functions routing looks correctly wired, but unverified end-to-end**
   - `pages_build_output_dir = "dist"` is set in `wrangler.toml`.
   - `public/_routes.json` includes `/api/*` for Functions routing.
   - `functions/[[path]].ts` exposes health/database health and API middleware.
   - Because dependencies cannot be installed here, full runtime verification (local Pages simulation + production build + integration smoke tests) is still pending.

### Non-Blocking Positives

- Cloudflare compatibility date is set (`2026-05-22`).
- D1 binding key (`DB`) is present and consumed by function code.
- Security headers and per-path rate limiting middleware are present in the Functions entrypoint.
- Stripe webhook signature verification logic exists and enforces a timestamp tolerance.

### Required Before Ship

1. Replace the placeholder `database_id` in `wrangler.toml` with the real production D1 ID.
2. Ensure package installation succeeds in CI (registry/network/security policy fix), then run:
   - `npm ci`
   - `npm run build`
   - `npx wrangler pages deploy dist --dry-run` (or equivalent preflight)
3. Run post-deploy smoke checks:
   - `GET /api/health`
   - `GET /api/db/health`
   - Stripe webhook test event with valid signature.
4. Gate production release on green build + smoke checks in CI.

## Cloudflare Shipping Audit Update (2026-05-23, Pass 2)

### Scope verified in this pass
- Removed active Coinbase integration from runtime API/router path and frontend checkout flow.
- Added autonomous trigger wiring for `verify` and `tokenize` on blockchain certification.
- Added Cloudflare execution-context handoff for `waitUntil` trigger dispatch.
- Switched appraisal/listing commission lookup to DB tier-based logic.
- Migrated local auth password hashing from bcrypt to Web Crypto PBKDF2.

### Current status
- **Pages entrypoint**: using `functions/[[path]].ts`.
- **Worker duplicate entrypoint**: removed (`worker/index.ts` deleted).
- **Crypto providers in UI**: OpenSea / Rarible / Magic Eden options are present.
- **Coinbase active router**: removed from `api/router.ts`.
- **Coinbase env accessors**: removed from `api/lib/env.ts`.

### Remaining deployment risk in this environment
- Full build/deploy verification is still blocked by npm registry access errors (403), so `npm ci` and `npm run build` cannot be completed in this runtime.
- Recommend CI gate with:
  1. `npm ci`
  2. `npm run build`
  3. `npx wrangler pages deploy dist --dry-run`
  4. `/api/health`, `/api/db/health`, and key mutation smoke tests (listings.create, appraisal.create with image, blockchain.certify).
