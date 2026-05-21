# Cloudflare Production Deployment Checklist

## Required Wrangler Secrets

Run these commands before deployment:

```bash
wrangler secret put OPENROUTER_API_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put GOOGLE_AI_API_KEY
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put JWT_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
```

## Recommended Wrangler Vars

Add to wrangler.toml:

```toml
[vars]
APP_URL = "https://yourdomain.com"
GOOGLE_CLIENT_ID = "your-google-client-id"
GOOGLE_REDIRECT_URI = "https://yourdomain.com/api/auth/google/callback"
NODE_ENV = "production"
```

## Required OAuth Redirect URIs

### Google OAuth

Authorized JavaScript Origins:

```txt
https://yourdomain.com
https://www.yourdomain.com
```

Authorized Redirect URIs:

```txt
https://yourdomain.com/api/auth/google/callback
https://www.yourdomain.com/api/auth/google/callback
```

## Health Checks

Verify these endpoints after deployment:

```txt
/api/health
/api/db/health
```

## Cloudflare Compatibility Status

Verified:

- SPA asset handling
- React Router SPA fallback
- Hono Worker runtime
- D1 bindings
- tRPC routing
- Security headers
- CORS middleware
- Rate limiting
- Edge-compatible deployment structure

## Recommended Next Upgrades

- Durable Objects for realtime features
- R2 image storage
- Queue workers for AI tasks
- Streaming AI responses
- Worker analytics
- Error reporting
- Turnstile bot protection
- Edge caching strategy
