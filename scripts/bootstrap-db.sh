#!/usr/bin/env bash
# Destructive bootstrap: drops all tables and replays every migration from scratch.
# Requires the correct password to proceed. Set DB_BOOTSTRAP_PASSWORD env var to override default.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Load .env.local so DB_BOOTSTRAP_PASSWORD set there is picked up
if [ -f "$ROOT/.env.local" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT/.env.local"
  set +a
fi

EXPECTED_PASSWORD="${DB_BOOTSTRAP_PASSWORD:-goalassist-reset}"

echo ""
echo "⚠️  WARNING: This will DROP ALL TABLES and replay every migration from scratch."
echo "   All data in the local database will be permanently deleted."
echo ""
read -rsp "Enter bootstrap password to continue: " INPUT_PASSWORD
echo ""

if [ "$INPUT_PASSWORD" != "$EXPECTED_PASSWORD" ]; then
  echo "ERROR: Incorrect password. Aborting."
  exit 1
fi

echo ""
echo "Password accepted. Resetting local database..."
echo ""

cd "$ROOT"
supabase db reset

echo ""
echo "✓ Database reset complete — all migrations replayed."
echo "✓ Studio: http://127.0.0.1:54323"
echo ""
