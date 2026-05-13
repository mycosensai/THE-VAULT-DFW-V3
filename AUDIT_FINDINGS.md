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

