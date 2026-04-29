# THE VAULT - Cloudflare Deployment Checklist

## Pre-Deployment ✓

- [ ] **Install Wrangler CLI**
  ```bash
  npm install -D wrangler
  ```
  
- [ ] **Verify Node.js Version** (v18+ / Latest LTS)
  ```bash
  node --version
  ```

- [ ] **Install Dependencies**
  ```bash
  npm install
  ```

- [ ] **Type Check**
  ```bash
  npm run check
  ```

## Database Setup ✓

- [ ] **Create Cloudflare Account** & Enable D1
  - Visit: https://dash.cloudflare.com

- [ ] **Authenticate with Wrangler**
  ```bash
  npx wrangler login
  ```

- [ ] **Create D1 Database**
  ```bash
  npm run cf:db:create
  # Or manually:
  npx wrangler d1 create thevault-db --binding=DB
  ```

- [ ] **Update `wrangler.toml`**
  ```toml
  database_id = "YOUR_DATABASE_ID_HERE"
  ```
  
  Where to find it:
  ```bash
  npm run cf:db:info
  ```

- [ ] **Initialize Database Schema**
  ```bash
  wrangler d1 execute thevault-db --file=./db/schema-d1.sql
  ```

- [ ] **Verify Schema** (optional)
  ```bash
  wrangler d1 execute thevault-db --command="SELECT name FROM sqlite_master WHERE type='table';"
  ```

## Secrets & Environment ✓

- [ ] **Generate APP_SECRET**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- [ ] **Set Core Secrets** (REQUIRED)
  ```bash
  # For staging environment
  npx wrangler pages secret put APP_SECRET "your-secret" --env staging
  npx wrangler pages secret put VAULT_DOMAIN "your-domain.com" --env staging
  
  # For production environment
  npx wrangler pages secret put APP_SECRET "your-secret" --env production
  npx wrangler pages secret put VAULT_DOMAIN "vault.yourdomain.com" --env production
  ```

- [ ] **Set Payment Secrets** (if using)
  ```bash
  npx wrangler pages secret put STRIPE_SECRET_KEY "sk_..." --env production
  npx wrangler pages secret put VITE_STRIPE_PUBLISHABLE_KEY "pk_..." --env production
  ```

- [ ] **Set OAuth Secrets** (if using)
  ```bash
  npx wrangler pages secret put GOOGLE_CLIENT_ID "..." --env production
  npx wrangler pages secret put GOOGLE_CLIENT_SECRET "..." --env production
  npx wrangler pages secret put X_CLIENT_ID "..." --env production
  npx wrangler pages secret put X_CLIENT_SECRET "..." --env production
  ```

- [ ] **Set API Secrets** (if using)
  ```bash
  npx wrangler pages secret put OPENAI_API_KEY "sk-..." --env production
  npx wrangler pages secret put COINBASE_API_KEY "..." --env production
  ```

- [ ] **Verify Secrets are Set**
  ```bash
  npx wrangler pages secret list --env production
  ```

## Build & Testing ✓

- [ ] **Build Locally**
  ```bash
  npm run build
  ```
  
  Check for `dist/` directory with:
  - `dist/index.html`
  - `dist/assets/` (CSS, JS, etc.)

- [ ] **Test Build**
  ```bash
  npm run preview
  # Visit http://localhost:4173
  ```

- [ ] **Run Type Checks**
  ```bash
  npm run check
  ```

- [ ] **Lint Code** (optional)
  ```bash
  npm run lint
  ```

## Cloudflare Pages Setup ✓

- [ ] **Connect Git Repository** (if deploying via git)
  - Visit: https://dash.cloudflare.com → Pages
  - Click "Create a project"
  - Select your Git provider (GitHub, GitLab, etc.)
  - Select repository
  - Build settings:
    - Build command: `npm run build`
    - Build output directory: `dist`
    - Root directory: `/`

- [ ] **Configure Environment (if not using CLI)**
  - Settings → Environment variables
  - Add staging & production variables
  - Set D1 binding

## Deployment ✓

### Option 1: Deploy from CLI (Recommended for Testing)

```bash
npm run deploy
```

### Option 2: Deploy via Git (CI/CD)

1. Push to your connected Git repository:
   ```bash
   git add .
   git commit -m "Ready for Cloudflare deployment"
   git push origin main
   ```

2. Cloudflare automatically builds & deploys

### Option 3: Manual wrangler Deploy

```bash
wrangler pages deploy dist --project-name thevault
```

## Post-Deployment ✓

- [ ] **Visit Your Site**
  - Staging: `https://thevault-staging.pages.dev`
  - Production: `https://vault.yourdomain.com` (after custom domain setup)

- [ ] **Test Core Features**
  - [ ] Homepage loads
  - [ ] API health check: `/api/health`
  - [ ] Login/Register works
  - [ ] Database queries work
  - [ ] Stripe/payment endpoints work (if applicable)
  - [ ] OAuth login works (if applicable)

- [ ] **Check Browser Console** (F12)
  - No CORS errors
  - No TypeScript errors
  - API calls resolving correctly

- [ ] **Test API Endpoints**
  ```bash
  curl https://your-domain.com/api/health
  # Should return: {"status":"ok","timestamp":...}
  ```

- [ ] **Check Cloudflare Analytics**
  - Visit: https://dash.cloudflare.com → Pages → Your Project
  - Verify requests are being received
  - Check for errors in logs

## Custom Domain Setup ✓

- [ ] **Add Custom Domain**
  1. Cloudflare dashboard → Pages → Project settings
  2. Custom domains → Add domain
  3. Follow DNS configuration steps
  4. Wait 5-10 minutes for DNS to propagate

- [ ] **Enable SSL/TLS** (automatic with Cloudflare)
  - Visit https://yourwomain.com (HTTPS should work)

- [ ] **Set Up Redirects** (www → non-www, if needed)
  1. Cloudflare dashboard → Settings → Redirects
  2. Add redirect rules

## Monitoring & Maintenance ✓

- [ ] **Enable Logging**
  - Real-time logs: `wrangler pages deployment tail`

- [ ] **Set Up Error Alerts**
  - Cloudflare dashboard → Notifications
  - Create alerts for deployment failures

- [ ] **Regular Backups**
  - Database: Use Cloudflare's export tools
  - Code: Git history

- [ ] **Security Audit**
  - [ ] No secrets in code/config
  - [ ] Secrets rotated periodically
  - [ ] CORS configured properly
  - [ ] Rate limiting enabled
  - [ ] Bot protection enabled (Cloudflare)

## Rollback Plan ✓

If deployment fails:

```bash
# View deployment history
wrangler pages deployment list

# Rollback to previous version
wrangler pages deployment rollback --deployment-id <id>
```

Or via Cloudflare dashboard:
1. Pages → Project → Deployments
2. Find previous deployment
3. Click "Rollback"

## Troubleshooting Commands

```bash
# View logs
wrangler pages deployment tail

# Check database
wrangler d1 info thevault-db

# List secrets
wrangler pages secret list --env production

# Execute SQL query
wrangler d1 execute thevault-db --command="SELECT 1"

# View wrangler config
wrangler info

# Debug: test local function
npm run dev
# Then visit http://localhost:3000
```

## Performance Checklist ✓

- [ ] Enable Caching
  - Cloudflare dashboard → Caching
  - Set appropriate cache rules

- [ ] Minify Assets
  - Verify `dist/` contains minified files
  - Check file sizes in Network tab

- [ ] Use CDN
  - Cloudflare automatically caches edge locations
  - No additional setup needed

- [ ] Database Indexing
  - Ensure frequently queried columns are indexed

## Security Checklist ✓

- [ ] Enable DDoS Protection
  - Already enabled on all Cloudflare domains

- [ ] Set Security Headers
  - Configured in `api/security.ts`
  - CSP, X-Frame-Options, etc. set

- [ ] Enable HTTPS Only
  - Cloudflare dashboard → SSL/TLS
  - "Always use HTTPS" enabled

- [ ] Rate Limiting
  - Configured for auth endpoints
  - Review `STRICT_RATE_LIMIT` in `api/security.ts`

## Useful Links

| Resource | URL |
|----------|-----|
| Cloudflare Dashboard | https://dash.cloudflare.com |
| Pages Deployment | https://dash.cloudflare.com/pages |
| D1 Database | https://dash.cloudflare.com/d1 |
| Wrangler Docs | https://developers.cloudflare.com/workers/wrangler |
| Pages Docs | https://developers.cloudflare.com/pages |
| D1 Docs | https://developers.cloudflare.com/d1 |

---

**Status:** Ready for Deployment ✅  
**Last Updated:** April 29, 2026  
**Environment:** Cloudflare Pages + D1 Database
