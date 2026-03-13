# Feature: Auth

> Full flow documented in `/docs/AUTH_FLOW.md`

## Purpose
Supabase-based authentication with multi-tenant company/employee model.

## Key Files
- `services/authService.ts` — signUp, signIn, signInWithGoogle, signOut, createCompanyAndEmployee, inviteEmployees, getEmployeeProfile
- `repository/supabaseAuthRepository.ts` — Supabase queries for companies/employees
- `app/auth/signin/page.tsx`, `app/auth/signup/page.tsx` — UI pages
- `app/auth/callback/route.ts` — Email verification code exchange
- `app/onboarding/page.tsx` — Post-signup workspace creation
- `middleware.ts` — Route guard logic

## Data Model
```
companies: id, name, creator_id, created_at
employees: id, company_id, user_id, first_name, last_name, email, role, status
  role:   "admin" | "member"
  status: "active" | "invited"
```
- `user_id` links Supabase Auth user → employee record.
- All app data is scoped to `company_id` via Supabase RLS.

## User Flow
1. Sign up → Supabase sends confirmation email
2. Click link → `/auth/callback?code=…` exchanges code for session
3. No employee record → `/onboarding` → `createCompanyAndEmployee()` creates both rows
4. Has employee record → `/` (dashboard)

## Auth Context (use in components)
```ts
import { useRequiredAuth } from "@/common/hooks/use-auth";
const { userId, companyId, employeeId } = useRequiredAuth();
// All three are non-null strings inside protected routes
```

## Service Pattern
```ts
// Always wrap Supabase calls in try/catch and throw AppError
if (error) throw AppError.badRequest("AUTH_SIGNIN_ERROR", error.message);
```
