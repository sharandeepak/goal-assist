# app/ — Next.js App Router Context

## Route Structure
```
app/
  page.tsx              → Dashboard (/)  — orchestrates tasks, milestones, satisfaction, calendar
  layout.tsx            → Root layout: AuthProvider, QueryProvider, ThemeProvider, AppShell
  globals.css
  auth/
    signin/page.tsx     → Email + Google sign-in
    signup/page.tsx     → Email registration
    callback/route.ts   → Supabase email verification handler (exchanges code for session)
  onboarding/page.tsx   → Workspace creation (shown to users without a user record)
  analytics/page.tsx
  calendar/page.tsx
  matrix/page.tsx
  milestones/page.tsx
  planner/page.tsx
  settings/page.tsx
  timesheet/page.tsx
  voice-log/page.tsx
```

## Conventions
- Every route has a co-located `loading.tsx` for skeleton UI (Next.js Suspense boundary).
- Route pages are thin — they import and render the feature component from `src/features/`.
- Server components fetch initial data; client components handle interactivity.
- `"use client"` only where needed (state, effects, browser APIs).

## Middleware Flow (`middleware.ts` at root)
| Condition | Action |
|-----------|--------|
| No session, non-auth route | Redirect → `/auth/signin` |
| No session, `/onboarding` | Redirect → `/auth/signin` |
| Session, auth route | Redirect → `/` or `/onboarding` |
| Session, no user record | Redirect → `/onboarding` |
| Session + user | Pass through |

## Auth Callback (`app/auth/callback/route.ts`)
Exchanges the `?code=` param from Supabase email confirmation for a session cookie, then redirects to `/`.

## Adding a New Route
1. Create `app/{route}/page.tsx` (and `loading.tsx`).
2. Add route to `middleware.ts` matcher if it needs special protection.
3. Implement feature logic in `src/features/{route}/`.
4. Add a `CLAUDE.md` to `src/features/{route}/`.
