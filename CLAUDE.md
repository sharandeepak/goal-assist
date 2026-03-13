# Goal Assist — Project Context

## Stack
- **Framework**: Next.js 15 App Router, React 19, TypeScript
- **Auth & DB**: Supabase (PostgreSQL, RLS, SSR cookies)
- **UI**: shadcn/ui (`src/common/ui/`) + Radix UI + Tailwind CSS
- **Server state**: TanStack React Query
- **Forms**: React Hook Form + Zod

## Directory Layout
```
app/           → Next.js routes (one page.tsx + loading.tsx per route)
src/
  common/      → Shared components, hooks, providers, types, errors, UI
  features/    → 12 feature modules (tasks, milestones, auth, matrix, …)
middleware.ts  → Route protection + onboarding redirect (Supabase SSR)
```

## Feature Module Pattern
Every feature in `src/features/{name}/` follows:
```
components/   UI only — no business logic
services/     Business logic, validation, error handling
repository/   Supabase data access (interface + supabase implementation)
types/        TypeScript types for this feature
styles/       Tailwind style objects (exported constants, not inline)
```

## Key Shared Files
- `src/common/types/index.ts` — All domain types (`SupabaseTask`, `SupabaseMilestone`, `SupabaseEmployee`, `SupabaseCompany`, `AuthContext`, etc.)
- `src/common/errors/AppError.ts` — Central error class (see below)
- `src/common/providers/auth-provider.tsx` — `useAuth()` / `useRequiredAuth()`
- `src/common/lib/supabase/client.ts` — Browser Supabase client
- `src/common/lib/supabase/server.ts` — Server Supabase client

## Error Handling — Always Use AppError
```ts
import { AppError } from "@/common/errors/AppError";

throw AppError.badRequest("FEATURE_CODE", "User-facing message.");  // 400
throw AppError.notFound("FEATURE_CODE", "...");                      // 404
throw AppError.conflict("FEATURE_CODE", "...");                      // 409
throw AppError.internal("FEATURE_CODE", "...");                      // 500

// In services: re-throw AppError, wrap unknown errors
if (error instanceof AppError) throw error;
throw AppError.internal("FEATURE_X_ERROR", "Friendly message.");
```

## Auth Pattern
```ts
const { userId, companyId, employeeId } = useRequiredAuth();
// All data is scoped to companyId via Supabase RLS policies.
```

## Middleware Rules (`middleware.ts`)
1. No session → redirect to `/auth/signin`
2. Session but no active employee record → redirect to `/onboarding`
3. Session + employee → allow through to app routes

## Path Aliases
`@/` maps to the project root. Use `@/common/…`, `@/features/…`, never `../../../`.

## Module-Specific Context
See `CLAUDE.md` inside each feature directory and `src/common/CLAUDE.md` for details loaded only when relevant.
