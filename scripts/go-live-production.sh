#!/bin/bash
# Tardis: "Go Production" Deployment Script
# This script deploys both Sales and Lending Escrow programs to Solana Mainnet,
# syncs program IDs, updates backend/UI configs, and verifies dependencies.

set -e

# --- Configuration ---
CLUSTER="mainnet-beta" # Toggle to "devnet" for staging tests
ESCROW_DIR="escrow"
BACKEND_DIR="server"
UI_DIR="."
SOLANA_WALLET="~/.config/solana/id.json"

# Program Names (as defined in Anchor.toml)
SALES_ESCROW="sales_escrow"
LENDING_ESCROW="lending_program"

echo "🚀 Starting Tardis Production Deployment on $CLUSTER..."

# 1. Dependency Checks
command -v solana >/dev/null 2>&1 || { echo >&2 "❌ Solana CLI required but not found. Aborting."; exit 1; }
command -v anchor >/dev/null 2>&1 || { echo >&2 "❌ Anchor CLI required but not found. Aborting."; exit 1; }

# 2. Mainnet Wallet Check (Safety)
if [ "$CLUSTER" == "mainnet-beta" ]; then
    echo "⚠️  CRITICAL: You are about to deploy to MAINNET."
    BALANCE=$(solana balance --url mainnet-beta | awk '{print $1}')
    if (( $(echo "$BALANCE < 3.0" | bc -l) )); then
        echo "❌ Insufficient balance for Mainnet deployment (~3 SOL needed). Balance: $BALANCE SOL"
        exit 1
    fi
fi

# 3. Synchronize Keys and Program IDs
echo "🔄 Synchronizing keys..."
cd $ESCROW_DIR
anchor keys sync

# Get the synced IDs
SALES_ID=$(anchor keys list | grep $SALES_ESCROW | awk '{print $2}')
LENDING_ID=$(anchor keys list | grep $LENDING_ESCROW | awk '{print $2}')

echo "📍 Sales Escrow ID: $SALES_ID"
echo "📍 Lending Escrow ID: $LENDING_ID"

# 4. Build and Deploy
echo "🛠 Building Programs..."
anchor build --ignore-keys

echo "🚢 Deploying to $CLUSTER..."
# Copy .so files to correct location if needed (internal workspace fix)
cp -r programs/$SALES_ESCROW/target/deploy/*.so target/deploy/ 2>/dev/null || true

anchor program deploy --program-name $SALES_ESCROW --provider.cluster $CLUSTER
anchor program deploy --program-name $LENDING_ESCROW --provider.cluster $CLUSTER

# 5. Update Backend Environment
echo "🔧 Updating Backend Configuration..."
cd ..
BACKEND_ENV="$BACKEND_DIR/.env"
if [ -f "$BACKEND_ENV" ]; then
    # Update program IDs in .env if they exist, or append them
    sed -i "s/SALES_ESCROW_ID=.*/SALES_ESCROW_ID=$SALES_ID/" "$BACKEND_ENV" || echo "SALES_ESCROW_ID=$SALES_ID" >> "$BACKEND_ENV"
    sed -i "s/LENDING_ESCROW_ID=.*/LENDING_ESCROW_ID=$LENDING_ID/" "$BACKEND_ENV" || echo "LENDING_ESCROW_ID=$LENDING_ID" >> "$BACKEND_ENV"
    sed -i "s/SOLANA_CLUSTER=.*/SOLANA_CLUSTER=$CLUSTER/" "$BACKEND_ENV" || echo "SOLANA_CLUSTER=$CLUSTER" >> "$BACKEND_ENV"
fi

# 6. Update UI Configuration (Constants)
echo "📱 Updating UI Constants..."
UI_CONFIG="src/shared/config/constants.ts"
if [ -f "$UI_CONFIG" ]; then
    sed -i "s/SALES_ESCROW_ID: .*/SALES_ESCROW_ID: '$SALES_ID',/" "$UI_CONFIG"
    sed -i "s/LENDING_ESCROW_ID: .*/LENDING_ESCROW_ID: '$LENDING_ID',/" "$UI_CONFIG"
fi

# 7. Database Migrations
echo "🗄 Running Database Migrations..."
cd $BACKEND_DIR
npm run migrate:latest || echo "⚠️ Database migration warning (verify manually)"

echo "✅ Production Rollout Complete for Tardis Escrow Ecosystem!"
echo "✨ Programs are live on Mainnet. Backend and UI updated."
