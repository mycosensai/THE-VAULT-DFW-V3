# Cloudflare Deployment Guide

## Target stack

- Cloudflare Pages for the Vite/React frontend
- Cloudflare Pages Functions for the Hono + tRPC API
- Cloudflare D1 for application data
- Stripe for production payments
- HttpOnly cookie sessions for auth

## Required Cloudflare bindings

```toml
name = "thevault"
compatibility_date = "2025-04-01"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "thevault-db"
database_id = "REPLACE_WITH_DATABASE_ID"
```

## Required production secrets

Set these in Cloudflare Pages project settings or with Wrangler:

```bash
wrangler pages secret put APP_SECRET
wrangler pages secret put STRIPE_SECRET_KEY
wrangler pages secret put STRIPE_WEBHOOK_SECRET
wrangler pages secret put VITE_STRIPE_PUBLISHABLE_KEY
wrangler pages secret put VAULT_DOMAIN
```

## Build commands

```bash
npm ci
npm run check
npm run build
npm run deploy
```

## Production rules

- Do not deploy with fallback secrets.
- Do not run with stub database mode in production.
- Keep crypto checkout disabled until real RPC validation is implemented.
- Keep CORS locked to the production Vault domain.
- Use Cloudflare WAF, rate limiting, bot protection, and Turnstile on auth forms.

## Recommended file tree

```text
api/                    tRPC routers, middleware, server utilities
contracts/              shared constants and types
db/                     D1/Drizzle schema and migrations
functions/              Cloudflare Pages Functions entrypoints
src/                    React/Vite frontend
src/components/         reusable UI components
src/pages/              route-level pages
src/providers/          client providers
docs/                   deployment and architecture docs
public/                 static public assets
```
