# Final Cloudflare Release Folder

This folder contains the minimum files needed for a Cloudflare Pages deployment handoff.

## Included
- wrangler.toml
- package.json
- package-lock.json
- _routes.json
- [[path]].ts

## Deploy Steps
1. Install dependencies:
   npm ci
2. Build:
   npm run build
3. Deploy:
   npx wrangler pages deploy dist

## Required secrets (set in Cloudflare dashboard or CLI)
- APP_SECRET
- OPENAI_API_KEY (if AI routes used)
- STRIPE_SECRET_KEY (if checkout routes used)
- CLERK_* keys (if Clerk auth used)

## Validate
- GET /api/health
- GET /api/db/health
