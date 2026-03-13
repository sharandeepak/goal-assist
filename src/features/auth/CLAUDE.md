# Feature: Auth

> Full flow documented in `/docs/AUTH_FLOW.md`

## Purpose
Supabase-based authentication with multi-tenant workspace/user model.

## Key Files
- `services/authService.ts` — signUp, signIn, signInWithGoogle, signOut, createWorkspaceAndUser, inviteUsers, getUserProfile
- `repository/supabaseAuthRepository.ts` — Supabase queries for workspaces/users
- `app/auth/signin/page.tsx`, `app/auth/signup/page.tsx` — UI pages
- `app/auth/callback/route.ts` — Email verification code exchange
- `app/onboarding/page.tsx` — Post-signup workspace creation
- `middleware.ts` — Route guard logic

## Data Model
```
workspaces: id, name, creator_id, created_at
users: id, workspace_id, auth_user_id, first_name, last_name, email, role, status
  role:   "admin" | "member"
  status: "active" | "invited"
```
- `auth_user_id` links Supabase Auth user → user record.
- All app data is scoped to `workspace_id` via Supabase RLS.

## User Flow
1. Sign up → Supabase sends confirmation email
2. Click link → `/auth/callback?code=…` exchanges code for session
3. No user record → `/onboarding` → `createWorkspaceAndUser()` creates both rows
4. Has user record → `/` (dashboard)

## Auth Context (use in components)
```ts
import { useRequiredAuth } from "@/common/hooks/use-auth";
const { userId, workspaceId } = useRequiredAuth();
// Both are non-null strings inside protected routes
```

## Service Pattern
```ts
// Always wrap Supabase calls in try/catch and throw AppError
if (error) throw AppError.badRequest("AUTH_SIGNIN_ERROR", error.message);
```
