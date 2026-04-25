#!/usr/bin/env bash
# Stops local Supabase and restores .env.local to production values.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROD_ENV="$ROOT/.env.production"

echo "Stopping local Supabase..."
supabase stop

if [ ! -f "$PROD_ENV" ]; then
  echo "WARNING: .env.production not found — .env.local was NOT restored."
  echo "Create .env.production with your production Supabase credentials."
  exit 1
fi

cp "$PROD_ENV" "$ROOT/.env.local"

echo ""
echo "✓ Local Supabase stopped"
echo "✓ .env.local restored → production Supabase"
