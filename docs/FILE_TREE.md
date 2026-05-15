# THE VAULT DFW V3 File Tree

This document describes the organized production structure of the repository.

## Application Source

```txt
src/
  components/        Reusable React UI components
  hooks/             Client-side React hooks
  lib/               Frontend utility helpers
  pages/             Route-level React pages
  providers/         App-level providers, including tRPC
```

## Backend / API

```txt
api/
  *-router.ts        tRPC routers grouped by domain
  context.ts         Request context creation
  middleware.ts      Auth/public/admin middleware
  oauth-*.ts         OAuth provider and callback logic
  queries/           Database connection/query helpers
  lib/env.ts         Cloudflare environment binding accessors
  security.ts        Security headers, CORS, rate limiting, audit logs
```

## Cloudflare Runtime

```txt
functions/           Cloudflare Pages Functions entrypoint
worker/              Worker runtime entrypoint for asset/API deployment
wrangler.toml        Cloudflare project, D1, SPA asset, and Worker config
```

Important deployment note:

- `functions/[[path]].ts` is used by Cloudflare Pages Functions deployments.
- `worker/index.ts` is used by direct Wrangler Worker deployments.
- Both paths are intentionally kept because the project has been deployed through both Cloudflare modes during stabilization.
- Do not delete either runtime entrypoint unless the Cloudflare deployment mode is fully standardized first.

## Database

```txt
db/schema.ts         Drizzle D1 schema
migrations/          Manual D1 SQL migrations
```

Current migration files:

```txt
0001_users_schema_fix.sql
0002_webhook_events.sql
```

## Testing / Load Checks

```txt
tests/load/          Safe k6 smoke/load checks
```

Current test files:

```txt
k6-smoke.js          Controlled endpoint smoke/load test
```

## CI/CD

```txt
.github/workflows/ci.yml
```

Runs:
- dependency install
- typecheck
- production build
- lint check

## Cleanup Notes

No literal files named `import 1`, `import 2`, `import_1`, or similar were found in the repository during cleanup.

The recent added support files are intentionally grouped as:

```txt
migrations/0001_users_schema_fix.sql
migrations/0002_webhook_events.sql
tests/load/k6-smoke.js
docs/FILE_TREE.md
.github/workflows/ci.yml
```

Avoid renaming runtime files like `functions/[[path]].ts`, `worker/index.ts`, or router files unless imports are updated at the same time.

## Recommended Future Refactor

After launch, standardize on one Cloudflare deployment mode:

1. Cloudflare Pages + Pages Functions, or
2. Wrangler Worker + Assets.

Until that decision is final, both runtime entrypoints should remain to avoid breaking production routes.
