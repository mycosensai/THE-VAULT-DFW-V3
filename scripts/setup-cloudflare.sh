#!/bin/bash

# THE VAULT - Cloudflare Deployment Setup Script
# This script automates the initial setup for Cloudflare Pages deployment

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     THE VAULT - Cloudflare Pages Deployment Setup            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if Wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -D wrangler
fi

# Check if user is logged in
echo "📌 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please log in to Cloudflare:"
    wrangler login
else
    echo "✅ Already authenticated with Cloudflare"
fi

echo ""
echo "──────────────────────────────────────────────────────────────"
echo "Step 1: Create D1 Database"
echo "──────────────────────────────────────────────────────────────"

read -p "Database name [thevault-db]: " DB_NAME
DB_NAME=${DB_NAME:-thevault-db}

echo "Creating D1 database: $DB_NAME..."
DB_OUTPUT=$(wrangler d1 create "$DB_NAME" --binding=DB 2>&1)
echo "$DB_OUTPUT"

# Extract database ID from output
DB_ID=$(echo "$DB_OUTPUT" | grep -oP 'database_id = "?\K[a-f0-9\-]+' | head -1)

if [ -z "$DB_ID" ]; then
    echo "⚠️  Could not extract database ID automatically."
    echo "Please run: npx wrangler d1 info $DB_NAME"
    read -p "Enter your database ID: " DB_ID
fi

echo ""
echo "📝 Updating wrangler.toml with database ID..."
sed -i.bak \
  -e "s/database_id = \"REPLACE_WITH_YOUR_D1_DATABASE_ID\"/database_id = \"$DB_ID\"/g" \
  -e "s/database_id = \"REPLACE_WITH_REAL_D1_DATABASE_ID\"/database_id = \"$DB_ID\"/g" \
  wrangler.toml
rm -f wrangler.toml.bak
echo "✅ Updated wrangler.toml"

echo ""
echo "──────────────────────────────────────────────────────────────"
echo "Step 2: Initialize Database Schema"
echo "──────────────────────────────────────────────────────────────"

read -p "Initialize database schema now? (y/n) [y]: " INIT_DB
INIT_DB=${INIT_DB:-y}

if [ "$INIT_DB" = "y" ] || [ "$INIT_DB" = "Y" ]; then
    echo "Executing schema-d1.sql..."
    wrangler d1 execute "$DB_NAME" --file=./db/schema-d1.sql
    echo "✅ Database schema initialized"
else
    echo "⏭️  Skipping schema initialization"
    echo "   Run later with: wrangler d1 execute $DB_NAME --file=./db/schema-d1.sql"
fi

echo ""
echo "──────────────────────────────────────────────────────────────"
echo "Step 3: Set Environment Secrets"
echo "──────────────────────────────────────────────────────────────"

read -p "Set environment secrets now? (y/n) [y]: " SET_SECRETS
SET_SECRETS=${SET_SECRETS:-y}

if [ "$SET_SECRETS" = "y" ] || [ "$SET_SECRETS" = "Y" ]; then
    read -p "Environment (staging/production) [staging]: " ENV_NAME
    ENV_NAME=${ENV_NAME:-staging}
    
    # Core secret
    read -sp "Enter APP_SECRET (or press Enter to generate): " APP_SECRET
    if [ -z "$APP_SECRET" ]; then
        APP_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        echo ""
        echo "Generated: $APP_SECRET"
    fi
    echo "Setting APP_SECRET..."
    echo "$APP_SECRET" | wrangler pages secret put APP_SECRET --env "$ENV_NAME"
    
    # Optional secrets
    echo ""
    echo "Set additional secrets (leave blank to skip):"
    
    read -sp "STRIPE_SECRET_KEY: " STRIPE_SECRET
    if [ ! -z "$STRIPE_SECRET" ]; then
        echo "$STRIPE_SECRET" | wrangler pages secret put STRIPE_SECRET_KEY --env "$ENV_NAME"
        echo "✅ Set STRIPE_SECRET_KEY"
    fi
    
    read -p "VAULT_DOMAIN [localhost:3000]: " VAULT_DOMAIN
    VAULT_DOMAIN=${VAULT_DOMAIN:-localhost:3000}
    echo "$VAULT_DOMAIN" | wrangler pages secret put VAULT_DOMAIN --env "$ENV_NAME"
    echo "✅ Set VAULT_DOMAIN"
    
    echo ""
    echo "✅ Secrets configured"
    echo "   Tip: Set more secrets with: wrangler pages secret put VARIABLE_NAME --env $ENV_NAME"
else
    echo "⏭️  Skipping secret configuration"
    echo "   Set secrets manually: npm run cf:db:info"
fi

echo ""
echo "──────────────────────────────────────────────────────────────"
echo "Step 4: Install Dependencies"
echo "──────────────────────────────────────────────────────────────"

read -p "Install npm dependencies? (y/n) [y]: " INSTALL_DEPS
INSTALL_DEPS=${INSTALL_DEPS:-y}

if [ "$INSTALL_DEPS" = "y" ] || [ "$INSTALL_DEPS" = "Y" ]; then
    npm install
    echo "✅ Dependencies installed"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete! ✅                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Review wrangler.toml to confirm database_id is set"
echo "  2. Test locally: npm run dev"
echo "  3. Deploy: npm run deploy"
echo ""
echo "For detailed instructions, see: CLOUDFLARE_DEPLOYMENT.md"
echo ""
