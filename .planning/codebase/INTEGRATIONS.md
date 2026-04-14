# External Integrations

**Analysis Date:** 2026-04-15

## APIs & External Services

**Authentication & Database:**
- Supabase (PostgreSQL + Auth) - Primary data source and authentication provider
  - SDK: `@supabase/supabase-js` v2.78.0 (browser) + `@supabase/ssr` v0.8.0 (server)
  - Auth: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public keys, safe for frontend)
  - Auth methods: Email/password signup, email/password signin, Google OAuth
  - Clients: `src/common/lib/supabase/client.ts` (browser), `src/common/lib/supabase/server.ts` (server/middleware)

**OAuth Providers:**
- Google OAuth via Supabase - Sign in with Google
  - Configured through Supabase dashboard
  - Callback: `/auth/callback` (Google redirects here after OAuth flow)
  - Service: `src/features/auth/services/authService.ts` → `signInWithGoogle()`

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` (browser) + `SUPABASE_DB_URL` (server-side connection string)
  - Client: Supabase JS SDK (`@supabase/supabase-js`)
  - ORM: Sequelize (legacy, defined in `src/common/lib/sequelize/`)
  - Tables: workspaces, users, tasks, milestones, satisfaction_logs, standup_logs, time_entries, matrix_items (inferred from type definitions)
  - RLS (Row-Level Security): Enabled - all data scoped to `workspace_id`
  - Connection pooling: Sequelize pool: max 5, min 0 (from `src/common/lib/sequelize/config.ts`)

**File Storage:**
- Not detected - Local filesystem only (no S3, Firebase Storage, or Cloudinary integration)

**Caching:**
- TanStack React Query - In-memory cache for server state
  - Stale time: 1 minute
  - GC time: 5 minutes
  - No external caching service (Redis, Memcached) detected

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (custom implementation)
  - Email verification via Supabase-sent confirmation links
  - Session management via HTTP-only cookies (handled by `@supabase/ssr`)
  - Password reset flow supported (PKCE-based)
  - Multi-provider: Email/password + Google OAuth

**Session Handling:**
- SSR cookie-based (`@supabase/ssr`):
  - Middleware (`middleware.ts`) refreshes session on each request
  - Server components (`src/common/lib/supabase/server.ts`) read cookies directly
  - Browser clients (`src/common/lib/supabase/client.ts`) use auth state from Supabase
  - Cookie security: Handled by Next.js 15 and Supabase

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, DataDog, or similar service
- Errors handled via custom `AppError` class (`src/common/errors/AppError.ts`)
- Frontend console logging only for auth debug

**Logs:**
- Browser: `console.error()`, `console.log()` (auth flow)
- Server: Sequelize logging (enabled in dev via `config.ts`)
- No centralized logging service (e.g., CloudWatch, Stackdriver, ELK) detected

## CI/CD & Deployment

**Hosting:**
- Firebase Hosting (configured in `firebase.json`)
  - Output directory: `out/` (static export)
  - Deployment: `npm run deploy` script
  - Node.js runtime: 18 (from `firebase.json` functions config)

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or similar found
- No automated testing or linting enforced in deployment

**Database Migrations:**
- Supabase CLI (optional local):
  - `npm run db:push` - Push schema changes
  - `npm run db:migrate` - Run pending migrations
  - `npm run db:reset` - Reset database
  - `npm run db:status` - List migrations

## Environment Configuration

**Required env vars (public - safe for frontend):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (e.g., https://mboqmestvoyiobpffgeu.supabase.co)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public anon key (limited permissions via RLS)

**Required env vars (server-side only):**
- `SUPABASE_DB_URL` - PostgreSQL connection string (Sequelize direct connection)

**Optional env vars:**
- `NEXT_PUBLIC_API_BASE_URL` - Backend API base URL (defaults to `http://localhost:3001/api`)
- `NEXT_PUBLIC_SITE_URL` - Site URL for auth callbacks (defaults to `http://localhost:3311`)
- `NODE_ENV` - Set automatically by Next.js (development/production)

**Secrets location:**
- `.env.local` - Local development (not committed, contains actual keys)
- `.env.example` - Template for CI/deployment (no secrets, safe to commit)
- Environment variables injected at build/runtime by Firebase Hosting

## Webhooks & Callbacks

**Incoming:**
- `/auth/callback` (route: `app/auth/callback/route.ts`)
  - Receives: `?code=` from Supabase email verification
  - Receives: `?next=` for post-login redirect
  - Purpose: Exchanges PKCE code for session cookie, creates workspace/user record if needed
  - Triggered by: Email confirmation link from Supabase, OAuth redirect

**Outgoing:**
- None detected - No outbound webhooks to external services

**Database Triggers/RPC:**
- Supabase RPC functions (called from client):
  - `create_workspace_and_user()` - Called during signup to atomically create workspace + user
  - `get_accounts_by_email()` - Retrieve all workspaces a user belongs to by email
  - Implementation: Stored procedures on Supabase PostgreSQL (not visible in JS codebase, defined in migrations)

## API Clients

**Supabase JS API:**
- Real-time subscriptions: BaseRepository supports `.subscribe()` for real-time updates (not actively used in current features)
- Queries: All data access via `supabase.from("table").select/insert/update/delete()`
- RPC: Supabase stored procedures via `supabase.rpc(functionName, params)`

**Feature Service Pattern:**
- Each feature module (`src/features/*/services/*.ts`) wraps Supabase calls
- Central error handling with `AppError` class
- Data validation with Zod (forms) and custom validators

---

*Integration audit: 2026-04-15*
