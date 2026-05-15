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
functions/           Cloudflare Pages Functions entrypoints
worker/              Worker runtime entrypoint for asset/API deployment
wrangler.toml        Cloudflare project, D1, and asset configuration
```

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

## Notes

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
