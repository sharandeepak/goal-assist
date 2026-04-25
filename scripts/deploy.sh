#!/usr/bin/env bash
# Production deploy: loads .env.production, builds Next.js, deploys to Firebase.
# .env.local is never touched — local dev stays untouched.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROD_ENV="$ROOT/.env.production"

if [ ! -f "$PROD_ENV" ]; then
  echo "ERROR: .env.production not found. Create it with your production Supabase credentials."
  exit 1
fi

echo "Loading production environment from .env.production..."
set -a
# shellcheck source=/dev/null
source "$PROD_ENV"
set +a

echo "Building for production (URL: $NEXT_PUBLIC_SUPABASE_URL)..."
cd "$ROOT"
npm run build

echo "Deploying to Firebase..."
firebase deploy --only hosting

echo ""
echo "✓ Deployed successfully to Firebase"
