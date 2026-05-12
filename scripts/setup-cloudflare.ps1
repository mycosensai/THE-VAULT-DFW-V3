# THE VAULT - Cloudflare Deployment Setup Script (PowerShell)
# This script automates the initial setup for Cloudflare Pages deployment

$ErrorActionPreference = "Stop"

Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     THE VAULT - Cloudflare Pages Deployment Setup            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if Wrangler is installed
Write-Host "📌 Checking for Wrangler CLI..." -ForegroundColor Yellow
$wrangler = Get-Command wrangler -ErrorAction SilentlyContinue

if (-not $wrangler) {
    Write-Host "❌ Wrangler CLI not found. Installing..." -ForegroundColor Red
    npm install -D wrangler
}

# Check if user is logged in
Write-Host "📌 Checking Cloudflare authentication..." -ForegroundColor Yellow
$authCheck = & wrangler whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "🔐 Please log in to Cloudflare:" -ForegroundColor Cyan
    & wrangler login
} else {
    Write-Host "✅ Already authenticated with Cloudflare" -ForegroundColor Green
}

Write-Host ""
Write-Host "──────────────────────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host "Step 1: Create D1 Database" -ForegroundColor Cyan
Write-Host "──────────────────────────────────────────────────────────────" -ForegroundColor Cyan

$dbName = Read-Host "Database name [thevault-db]"
if ([string]::IsNullOrEmpty($dbName)) { $dbName = "thevault-db" }

Write-Host "Creating D1 database: $dbName..." -ForegroundColor Yellow
$dbOutput = & wrangler d1 create "$dbName" --binding=DB 2>&1

# Extract database ID from output
$dbId = $dbOutput | Select-String -Pattern 'database_id = "?([a-f0-9\-]+)' | ForEach-Object { $_.Matches[0].Groups[1].Value }

if ([string]::IsNullOrEmpty($dbId)) {
    Write-Host "⚠️  Could not extract database ID automatically." -ForegroundColor Yellow
    Write-Host "Please run: npx wrangler d1 info $dbName" -ForegroundColor Yellow
    $dbId = Read-Host "Enter your database ID"
}

Write-Host ""
Write-Host "📝 Updating wrangler.toml with database ID..." -ForegroundColor Yellow

$wranglerPath = "wrangler.toml"
$content = Get-Content $wranglerPath -Raw
$content = $content -replace 'database_id = "REPLACE_WITH_YOUR_D1_DATABASE_ID"', "database_id = ""$dbId"""
Set-Content -Path $wranglerPath -Value $content

Write-Host "✅ Updated wrangler.toml" -ForegroundColor Green

Write-Host ""
Write-Host "──────────────────────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host "Step 2: Initialize Database Schema" -ForegroundColor Cyan
Write-Host "──────────────────────────────────────────────────────────────" -ForegroundColor Cyan

$initDb = Read-Host "Initialize database schema now? (y/n) [y]"
if ([string]::IsNullOrEmpty($initDb)) { $initDb = "y" }

if ($initDb -eq "y" -or $initDb -eq "Y") {
    Write-Host "Executing schema-d1.sql..." -ForegroundColor Yellow
    & wrangler d1 execute "$dbName" --file=./db/schema-d1.sql
    Write-Host "✅ Database schema initialized" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipping schema initialization" -ForegroundColor Yellow
    Write-Host "   Run later with: wrangler d1 execute $dbName --file=./db/schema-d1.sql" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "──────────────────────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host "Step 3: Set Environment Secrets" -ForegroundColor Cyan
Write-Host "──────────────────────────────────────────────────────────────" -ForegroundColor Cyan

$setSecrets = Read-Host "Set environment secrets now? (y/n) [y]"
if ([string]::IsNullOrEmpty($setSecrets)) { $setSecrets = "y" }

if ($setSecrets -eq "y" -or $setSecrets -eq "Y") {
    $envName = Read-Host "Environment (staging/production) [staging]"
    if ([string]::IsNullOrEmpty($envName)) { $envName = "staging" }
    
    # Core secret
    Write-Host "Enter APP_SECRET (or press Enter to generate):" -ForegroundColor Yellow
    $appSecret = Read-Host -AsSecureString
    
    if ($appSecret.Length -eq 0) {
        $appSecret = [System.Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
        Write-Host "Generated APP_SECRET: $appSecret" -ForegroundColor Green
    } else {
        $appSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($appSecret))
    }
    
    Write-Host "Setting APP_SECRET..." -ForegroundColor Yellow
    $appSecret | & wrangler pages secret put APP_SECRET --env "$envName"
    
    # Optional secrets
    Write-Host ""
    Write-Host "Set additional secrets (leave blank to skip):" -ForegroundColor Yellow
    
    Write-Host "STRIPE_SECRET_KEY:" -NoNewline
    $stripeSecret = Read-Host -AsSecureString
    if ($stripeSecret.Length -gt 0) {
        $stripeSecretPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($stripeSecret))
        $stripeSecretPlain | & wrangler pages secret put STRIPE_SECRET_KEY --env "$envName"
        Write-Host "✅ Set STRIPE_SECRET_KEY" -ForegroundColor Green
    }
    
    $vaultDomain = Read-Host "VAULT_DOMAIN [localhost:3000]"
    if ([string]::IsNullOrEmpty($vaultDomain)) { $vaultDomain = "localhost:3000" }
    $vaultDomain | & wrangler pages secret put VAULT_DOMAIN --env "$envName"
    Write-Host "✅ Set VAULT_DOMAIN" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "✅ Secrets configured" -ForegroundColor Green
    Write-Host "   Tip: Set more secrets with: wrangler pages secret put VARIABLE_NAME --env $envName" -ForegroundColor DarkGray
} else {
    Write-Host "⏭️  Skipping secret configuration" -ForegroundColor Yellow
    Write-Host "   Set secrets manually: npm run cf:db:info" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "──────────────────────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host "Step 4: Install Dependencies" -ForegroundColor Cyan
Write-Host "──────────────────────────────────────────────────────────────" -ForegroundColor Cyan

$installDeps = Read-Host "Install npm dependencies? (y/n) [y]"
if ([string]::IsNullOrEmpty($installDeps)) { $installDeps = "y" }

if ($installDeps -eq "y" -or $installDeps -eq "Y") {
    npm install
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    Setup Complete! ✅                         ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review wrangler.toml to confirm database_id is set" -ForegroundColor White
Write-Host "  2. Test locally: npm run dev" -ForegroundColor White
Write-Host "  3. Deploy: npm run deploy" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see: CLOUDFLARE_DEPLOYMENT.md" -ForegroundColor DarkGray
Write-Host ""
