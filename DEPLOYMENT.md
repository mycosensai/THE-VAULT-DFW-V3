# THE VAULT DFW V3 Deployment

## Requirements

- Node.js 20+
- Cloudflare account
- Wrangler CLI

## Install

```bash
npm install
```

## Local Development

```bash
npm run dev
```

## Type Check

```bash
npm run check
```

## Build

```bash
npm run build
```

## Cloudflare Login

```bash
npx wrangler login
```

## Deploy

```bash
npm run deploy
```

## D1 Database

Verify the D1 database binding exists inside wrangler.toml.

## Environment Variables

Configure all required environment variables inside the Cloudflare dashboard before deployment.

## Health Checks

- /api/health
- /api/db/health
