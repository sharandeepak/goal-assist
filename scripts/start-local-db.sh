#!/usr/bin/env bash
# Starts local Supabase and wires .env.local to point at it.
# Run once after cloning or whenever you want to switch to local dev.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Starting local Supabase..."
OUTPUT=$(supabase start 2>&1)
echo "$OUTPUT"

# Parse credentials from supabase start output
API_URL=$(echo "$OUTPUT" | grep -E "Project URL\s*│" | awk -F'│' '{print $3}' | tr -d ' ')
ANON_KEY=$(echo "$OUTPUT" | grep -E "Publishable\s*│" | awk -F'│' '{print $3}' | tr -d ' ')

# Fallback: already running — grab from supabase status
if [ -z "$API_URL" ] || [ -z "$ANON_KEY" ]; then
  echo "Fetching credentials via supabase status..."
  STATUS=$(supabase status 2>&1)
  API_URL=$(echo "$STATUS" | grep -E "Project URL\s*│" | awk -F'│' '{print $3}' | tr -d ' ')
  ANON_KEY=$(echo "$STATUS" | grep -E "Publishable\s*│" | awk -F'│' '{print $3}' | tr -d ' ')
fi

if [ -z "$API_URL" ] || [ -z "$ANON_KEY" ]; then
  echo "ERROR: Could not parse local Supabase credentials. Check Docker and supabase start output."
  exit 1
fi

cat > "$ROOT/.env.local" <<EOF
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_DB_PASSWORD=postgres
EOF

echo ""
echo "✓ .env.local updated → local Supabase ($API_URL)"
echo "✓ Studio: http://127.0.0.1:54323"
echo ""
