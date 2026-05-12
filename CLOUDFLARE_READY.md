# 🚀 THE VAULT - Cloudflare Deployment Ready

Your project is now **fully configured for direct deployment to Cloudflare Pages** with D1 Database backend.

## Quick Start (3 Steps)

### 1️⃣ Install & Setup
```bash
npm install
npm run cf:login
npm run cf:db:create
```

### 2️⃣ Update Configuration
- Copy the **database ID** from step 1
- Paste it into `wrangler.toml`:
  ```toml
  database_id = "your-id-here"
  ```

### 3️⃣ Deploy
```bash
npm run deploy
```

**That's it!** Your app is now live on Cloudflare Pages. 🎉

---

## What's Been Added

### 📋 Documentation
- **`CLOUDFLARE_DEPLOYMENT.md`** - Complete deployment guide with troubleshooting
- **`DEPLOYMENT_CHECKLIST.md`** - Step-by-step checklist for production deployment
- **`.env.example`** - Environment variables reference

### 📦 Configuration Files
- **`wrangler.toml`** - Enhanced Cloudflare Pages configuration
- **`.gitignore`** - Prevents accidental secret commits
- **`package.json`** - New npm scripts for deployment

### 🛠️ Setup Scripts
- **`scripts/setup-cloudflare.sh`** - Automated setup (Linux/macOS)
- **`scripts/setup-cloudflare.ps1`** - Automated setup (Windows PowerShell)

### ✅ Already Configured
- ✅ Hono API server with tRPC
- ✅ D1 Database connection
- ✅ React SPA routing
- ✅ Security headers & CORS
- ✅ Rate limiting
- ✅ TypeScript support
- ✅ Database migrations

---

## New NPM Scripts

| Command | Purpose |
|---------|---------|
| `npm run deploy` | Build + type-check + deploy to Cloudflare |
| `npm run db:generate` | Generate database migrations |
| `npm run db:push` | Apply migrations to D1 |
| `npm run cf:db:create` | Create new D1 database |
| `npm run cf:db:info` | View database details |
| `npm run cf:login` | Authenticate with Cloudflare |

---

## Project Structure for Cloudflare

```
functions/[[path]].ts          ← Cloudflare Functions entry point
├── api/router.ts              ← tRPC router  
├── api/context.ts             ← tRPC context
└── api/*-router.ts            ← Route handlers

db/
├── schema.ts                   ← Database schema
├── schema-d1.sql              ← SQL schema
└── migrations/                 ← Auto-generated migrations

src/
├── pages/                      ← React pages
├── components/                 ← React components
└── main.tsx                    ← React entry point

dist/                          ← Built output (created by Vite)
└── index.html                 ← SPA entry point
```

---

## How Deployment Works

1. **Frontend**: Vite builds React → `dist/` folder
2. **Backend**: Hono server in `functions/[[path]].ts` handles API calls
3. **Database**: D1 handles all data persistence
4. **Routing**: 
   - `/api/*` → Cloudflare Functions (backend)
   - All other routes → Static files or fallback to `index.html` (React Router)

---

## Environment Variables

### Required (Core)
- `APP_SECRET` - JWT signing secret
- `VAULT_DOMAIN` - Your domain

### Optional (by feature)
- **Payments**: `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`
- **OAuth**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `X_CLIENT_ID`, `X_CLIENT_SECRET`
- **APIs**: `OPENAI_API_KEY`, `COINBASE_API_KEY`

See `.env.example` for complete reference.

---

## Key Files to Review

- 📄 [wrangler.toml](wrangler.toml) - Cloudflare configuration
- 📄 [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md) - Detailed deployment guide
- 📄 [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Pre-deployment checklist
- 📄 [.env.example](.env.example) - Environment variables reference

---

## Before You Deploy

1. ✅ Set `APP_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
2. ✅ Set other required secrets based on your features
3. ✅ Update `wrangler.toml` with your D1 database ID
4. ✅ Run `npm run check` to verify no TypeScript errors
5. ✅ Run `npm run build` to test the build locally

---

## Deployment Environments

### Staging
```bash
npm run deploy -- --env staging
```

### Production
```bash
npm run deploy -- --env production
```

Each environment has separate D1 databases and secrets.

---

## Monitoring After Deployment

```bash
# View real-time logs
wrangler pages deployment tail

# View deployment history
wrangler pages deployment list

# Check database
wrangler d1 info thevault-db

# Test API
curl https://your-domain.com/api/health
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| "Database not found" | Update `database_id` in `wrangler.toml` |
| "Secret not found" | Set secrets: `wrangler pages secret put NAME VALUE --env production` |
| Build fails | Run `npm run check` to see TypeScript errors |
| API returns 404 | Check `functions/[[path]].ts` exports `onRequest` |
| CORS errors | Check `getCorsConfig()` in `api/security.ts` |

---

## Support

For detailed information:
- 📖 [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md) - Complete guide with examples
- ✅ [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Production deployment checklist
- 🔧 [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- 🔧 [D1 Database Docs](https://developers.cloudflare.com/d1/)

---

## Next Steps

```bash
# 1. Install everything
npm install

# 2. Log in to Cloudflare
npm run cf:login

# 3. Create database
npm run cf:db:create

# 4. Set database ID in wrangler.toml
# Copy the ID from step 3 output

# 5. Set secrets
npx wrangler pages secret put APP_SECRET "your-secret" --env production
npx wrangler pages secret put VAULT_DOMAIN "your-domain.com" --env production

# 6. Deploy!
npm run deploy
```

---

**Status**: ✅ Ready for Cloudflare Deployment  
**Last Updated**: April 29, 2026  
**Infrastructure**: Cloudflare Pages + D1 Database + Hono + tRPC
