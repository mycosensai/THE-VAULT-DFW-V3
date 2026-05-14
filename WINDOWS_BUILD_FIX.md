# Windows EPERM Build Fix

If you see:

```txt
EPERM: operation not permitted, scandir
INetCache\\Low\\Content.IE5
```

This is NOT a Vault app error.

It is caused by a rogue `npx run` package recursively scanning protected Windows system folders.

## Correct commands

DO NOT run:

```bash
npx run
```

OR:

```bash
npx run build
```

Use:

```bash
npm run build
```

and:

```bash
npm run check
```

---

## Recommended cleanup

Delete broken cache:

```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\npm-cache"
```

Then reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

Windows CMD alternative:

```cmd
rmdir /s /q node_modules
del package-lock.json
npm install
```

---

## Correct deployment sequence

```bash
npm install
npm run check
npm run build
npm run deploy
```

---

## Recommended Node version

Use Node.js 20 LTS.

Node 24 can break older tooling and Cloudflare packages.

Recommended:

```bash
nvm install 20
nvm use 20
```

---

## Cloudflare deployment

```bash
npx wrangler login
npm run deploy
```
