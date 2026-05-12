# Cloudflare Deployment Guide

This project is configured to deploy to **Cloudflare Pages** with **D1 Database** backend.

## Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) v3.94+
- Node.js 18+ (Latest LTS recommended)
- Cloudflare account with Pages & D1 enabled
- npm or yarn

## Quick Start (5 minutes)

### 1. Install Wrangler & Dependencies

```bash
npm install
# or if wrangler isn't installed globally:
npx wrangler --version
```

### 2. Login to Cloudflare

```bash
npx wrangler login
```

This will open your browser to authenticate with Cloudflare.

### 3. Create D1 Database

```bash
npm run cf:db:create
# Output will show your DATABASE_ID
```

Copy the `database_id` from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "thevault-db"
database_id = "YOUR_DATABASE_ID_HERE"  # ← Replace this
```

### 4. Create Required Secrets

Set these secrets in Cloudflare Pages:

```bash
# Core secrets (REQUIRED)
npx wrangler pages secret put APP_SECRET --env production
npx wrangler pages secret put STRIPE_SECRET_KEY --env production

# OAuth providers (OPTIONAL - set as needed)
npx wrangler pages secret put GOOGLE_CLIENT_ID --env production
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --env production
npx wrangler pages secret put X_CLIENT_ID --env production
npx wrangler pages secret put X_CLIENT_SECRET --env production

# Payment providers (OPTIONAL)
npx wrangler pages secret put VITE_STRIPE_PUBLISHABLE_KEY --env production
npx wrangler pages secret put COINBASE_API_KEY --env production

# APIs (OPTIONAL)
npx wrangler pages secret put OPENAI_API_KEY --env production

# Domain
npx wrangler pages secret put VAULT_DOMAIN "your-domain.com" --env production
```

**Tip:** Generate a secure `APP_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Deploy

```bash
npm run deploy
```

This will:
- ✅ Type-check your code
- ✅ Build the frontend (Vite)
- ✅ Generate database migrations
- ✅ Deploy to Cloudflare Pages

## Environment-Specific Deployment

### Deploy to Staging

```bash
npm run deploy -- --env staging
```

### Deploy to Production

```bash
npm run deploy -- --env production
```

## Database Management

### Initialize Database Schema

```bash
npm run db:push
```

### Generate Migrations

```bash
npm run db:generate
```

### View Database Info

```bash
npm run cf:db:info
```

## Project Structure for Cloudflare

```
.
├── functions/
│   └── [[path]].ts          ← Cloudflare Pages Function entry point
├── api/
│   ├── router.ts            ← tRPC router
│   ├── context.ts           ← tRPC context
│   └── *-router.ts          ← Route handlers
├── db/
│   ├── schema.ts            ← Database schema
│   ├── migrations/          ← Auto-generated migrations
│   └── relations.ts         ← Database relations
├── src/
│   ├── pages/               ← React pages
│   ├── components/          ← React components
│   └── main.tsx             ← React entry point
├── dist/                    ← Built output (Vite builds here)
├── wrangler.toml            ← Cloudflare config
└── drizzle.config.ts        ← Database config
```

## How It Works

1. **Frontend**: Vite builds React app → `dist/index.html`
2. **Backend**: Hono server in `functions/[[path]].ts` handles:
   - API routes via tRPC
   - Authentication & security
   - D1 database queries
3. **Deployment**: `wrangler pages deploy dist` uploads to Cloudflare
4. **Routing**: Cloudflare Pages Functions auto-routes `[[path]]` to API

## Common Issues & Solutions

### "Database not found" Error

**Problem:** `database_id` not set correctly in `wrangler.toml`

**Solution:**
```bash
npm run cf:db:info
# Copy the ID from output
# Update wrangler.toml
```

### "Secret not found" Error

**Problem:** Environment variables not set in Cloudflare Pages

**Solution:**
```bash
# Set missing secrets
npx wrangler pages secret put SECRET_NAME "value" --env production
# List all secrets:
npx wrangler pages secret list --env production
```

### Build Fails - TypeScript Errors

**Solution:**
```bash
npm run check  # Check types
npm run lint   # Fix linting issues
npm run format # Auto-format code
```

### API Routes Returning 404

**Problem:** `functions/[[path]].ts` not exporting `onRequest`

**Check:**
```bash
grep -n "export const onRequest" functions/[[path]].ts
```

Should show the export. If not, verify the file wasn't corrupted.

## Monitoring & Logs

### View Deployment Logs

```bash
npx wrangler pages deployment list
npx wrangler pages deployment tail  # Real-time logs
```

### Check Database Logs

```bash
npm run cf:db:info
# Check Cloudflare dashboard → D1 section
```

## Security Checklist

- [ ] `APP_SECRET` is cryptographically secure (32+ bytes)
- [ ] All OAuth secrets are set in Cloudflare (not committed to repo)
- [ ] API keys are rotated regularly
- [ ] `wrangler.toml` doesn't contain real secrets (marked REPLACE_WITH...)
- [ ] `.env` files are in `.gitignore`
- [ ] CORS is properly configured in `functions/[[path]].ts`

## Production Best Practices

### 1. Use Environment-Specific Secrets

```bash
# Staging
npx wrangler pages secret put APP_SECRET "staging-secret" --env staging

# Production
npx wrangler pages secret put APP_SECRET "production-secret" --env production
```

### 2. Enable Custom Domain

In Cloudflare Pages dashboard:
1. Go to **Settings → Custom domains**
2. Add your domain
3. Follow DNS setup instructions

### 3. Configure Rate Limiting

Edit `api/security.ts` to adjust `STRICT_RATE_LIMIT` for auth endpoints.

### 4. Enable DDoS Protection

Cloudflare Pages includes built-in DDoS protection. No additional config needed.

### 5. Monitor Performance

Use Cloudflare Analytics:
1. Dashboard → Pages → Your project
2. View request metrics, errors, and performance data

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start local dev server |
| `npm run build` | Build frontend with Vite |
| `npm run check` | Type-check code |
| `npm run deploy` | Full deployment pipeline |
| `npm run db:generate` | Generate migrations |
| `npm run db:push` | Apply migrations to D1 |
| `npm run cf:db:create` | Create new D1 database |
| `npm run cf:db:info` | Show database details |
| `npm run cf:login` | Authenticate with Cloudflare |

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Login: `npm run cf:login`
3. ✅ Create database: `npm run cf:db:create`
4. ✅ Update `wrangler.toml` with database ID
5. ✅ Set secrets: `npx wrangler pages secret put ...`
6. ✅ Deploy: `npm run deploy`

## Support & Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Hono Framework](https://hono.dev/)
- [tRPC Documentation](https://trpc.io/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)

---

**Last Updated:** April 29, 2026  
**Compatibility:** Cloudflare Pages, D1, Workers
