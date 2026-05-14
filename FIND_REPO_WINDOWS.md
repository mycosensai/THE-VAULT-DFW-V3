# Cannot Find Repository Folder on Windows

If PowerShell says:

```txt
Cannot find path 'C:\Users\vdako\THE-VAULT-DFW-V3'
```

then the repo was either:

- cloned somewhere else
- never cloned locally
- downloaded as a ZIP into Downloads/Desktop

## Step 1 — Find the repo

Run:

```powershell
Get-ChildItem C:\Users\vdako -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object {$_.Name -like "*VAULT*"}
```

OR:

```powershell
dir C:\Users\vdako -Recurse -Directory | findstr VAULT
```

## Step 2 — Enter the folder

Example:

```powershell
cd "C:\Users\vdako\Downloads\THE-VAULT-DFW-V3"
```

## Step 3 — Verify package.json exists

Run:

```powershell
dir
```

You should see:

```txt
package.json
wrangler.toml
src
api
functions
```

## Step 4 — If repo does not exist locally

Clone it:

```bash
git clone https://github.com/mycosensai/THE-VAULT-DFW-V3.git
```

Then:

```bash
cd THE-VAULT-DFW-V3
npm install
npm run check
npm run build
npm run deploy
```
