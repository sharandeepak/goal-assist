# Goal Assist — Authentication Flow

> Comprehensive documentation of the signup, login, email verification, onboarding, logout, and route-protection flows.

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌───────────────────┐     ┌──────────────┐
│  UI Pages    │────▶│  authService │────▶│  authRepository   │────▶│   Supabase   │
│  (React)     │     │  (business)  │     │  (data access)    │     │   (DB/Auth)  │
└─────────────┘     └──────────────┘     └───────────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐
│  middleware   │  ← Server-side route guards (Next.js)
└──────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `app/auth/signup/page.tsx` | Signup form + "Check your email" view |
| `app/auth/signin/page.tsx` | Login form with friendly error mapping |
| `app/auth/callback/route.ts` | Server route that exchanges the email-verification code for a session |
| `app/onboarding/page.tsx` | Post-verification workspace setup (company name) |
| `middleware.ts` | Server-side route protection and redirect logic |
| `src/features/auth/services/authService.ts` | Business logic — signup, signin, signout, company+employee creation |
| `src/features/auth/repository/supabaseAuthRepository.ts` | DB operations for companies & employees |
| `src/common/providers/auth-provider.tsx` | Client-side auth context (user, employee, company state) |
| `src/common/components/sidebar.tsx` | Contains the Logout button |

---

## 1. Signup Flow

### Step-by-step

```
User fills form ──▶ signUpWithEmail() ──▶ Supabase auth.signUp() ──▶ Confirmation email sent
                                                                          │
UI transitions to "Check your inbox" view ◀────────────────────────────────┘
```

1. **User enters**: First Name, Last Name, Email, Password
2. **Client-side validation**:
   - First Name is `required` (HTML attribute)
   - Email is `required` + `type="email"` (HTML validation)
   - Password is `required` + `minLength={8}` (HTML attribute)
3. **Service-layer validation** (`authService.signUpWithEmail`):
   - Checks email and password are non-empty → throws `AUTH_MISSING_FIELDS`
   - Checks password length ≥ 8 → throws `AUTH_WEAK_PASSWORD`
4. **Supabase call**: `supabase.auth.signUp()` with `emailRedirectTo` pointing to `/auth/callback`
   - User metadata stored: `first_name`, `last_name`, `full_name`
5. **On success**: UI transitions to the **"Check your inbox"** view (step 2 indicator activates)
6. **On error**: Friendly error messages are shown:
   - "Already registered" → "An account with this email already exists."
   - Password-related → "Password must be at least 8 characters long."
   - Email-related → "Please enter a valid email address."
   - Fallback → "Something went wrong. Please try again."

### Resend Verification Email

From the "Check your inbox" view, users can click **"Resend verification email"** which calls `supabase.auth.resend({ type: "signup", email })`.

---

## 2. Email Verification (Callback)

```
User clicks email link ──▶ /auth/callback?code=xxx ──▶ exchangeCodeForSession()
                                                              │
                                                     ┌───────┴────────┐
                                                     │                │
                                             employee exists?   no employee
                                                     │                │
                                                     ▼                ▼
                                                redirect "/"    redirect "/onboarding"
```

1. Supabase sends an email with a link containing a `code` query parameter pointing to `/auth/callback`
2. The **server-side route** (`app/auth/callback/route.ts`) handles this:
   - Extracts the `code` from the URL
   - Calls `supabase.auth.exchangeCodeForSession(code)` to establish a valid session
   - On success: checks if the user has an active `employee` record
     - **Has employee** → redirect to `/` (dashboard)
     - **No employee** → redirect to `/onboarding`
   - On failure: redirects to `/auth/signin?error=callback_failed`

---

## 3. Onboarding Flow

```
/onboarding ──▶ User enters company name ──▶ createCompanyAndEmployee()
                                                      │
                                              ┌───────┴───────┐
                                              │               │
                                         creates company  creates employee
                                         (companies table) (employees table,
                                                           role='admin',
                                                           status='active')
                                              │
                                              ▼
                                          redirect "/"
```

1. Only accessible by **authenticated users without an employee record** (middleware enforces this)
2. User enters a **Workspace Name** (company name)
3. Calls `createCompanyAndEmployee()` from `authService`:
   - Creates a row in `companies` table with the user as `creator_id`
   - Creates a row in `employees` table with `role='admin'` and `status='active'`
4. On success → redirects to `/` (dashboard)

### Database Trigger

When a new Supabase auth user is created, a PostgreSQL trigger (`handle_new_user`) auto-inserts a row into the `public.users` table with the user's `id`, `email`, `full_name`, and `avatar_url`.

---

## 4. Login Flow

```
User fills email+password ──▶ signInWithEmail() ──▶ supabase.auth.signInWithPassword()
                                                              │
                                                     ┌───────┴────────┐
                                                     │                │
                                                  success          error
                                                     │                │
                                                     ▼                ▼
                                              router.push("/")  Friendly error shown
                                              router.refresh()
```

1. **User enters**: Email, Password
2. **Service-layer validation**: checks non-empty fields → `AUTH_MISSING_FIELDS`
3. **Supabase call**: `supabase.auth.signInWithPassword({ email, password })`
4. **On success**: `router.push("/")` + `router.refresh()` (middleware then decides dashboard vs onboarding)
5. **On error**: `friendlyAuthError()` maps raw Supabase errors:
   - `"email not confirmed"` → "Please verify your email before signing in." + hint about inbox
   - `"invalid login credentials"` → "Incorrect email or password."
   - `"user not found"` → "No account found. Try signing up."
   - `"too many requests"` → "Too many attempts. Please wait."
   - Fallback → "Sign in failed. Please try again."

### Callback Error Handling

If the URL contains `?error=callback_failed` (from a failed email verification), a banner shows: "Something went wrong with authentication. Please try again."

---

## 5. Google OAuth Flow

```
User clicks "Continue with Google" ──▶ signInWithGoogle()
        ──▶ supabase.auth.signInWithOAuth({ provider: 'google' })
        ──▶ Redirect to Google consent screen
        ──▶ Google redirects back to /auth/callback
        ──▶ Same callback logic as email verification
```

Available on both the signup and signin pages.

---

## 6. Logout Flow

```
User clicks "Logout" (sidebar) ──▶ signOut() ──▶ supabase.auth.signOut()
                                                        │
                                                        ▼
                                              window.location.href = "/auth/signin"
                                              (hard redirect, clears client state)
```

1. The `Sidebar` component calls `useAuth().signOut()`
2. `signOut()` in `auth-provider.tsx` calls `supabase.auth.signOut()` and resets local state
3. The sidebar handler also does `window.location.href = "/auth/signin"` for a hard redirect

---

## 7. Middleware (Route Protection)

The middleware runs on every request (except static assets) and enforces these rules:

| # | Condition | Action |
|---|-----------|--------|
| 1 | **Not logged in** + not on auth/onboarding route | Redirect → `/auth/signin` |
| 2 | **Not logged in** + trying to access `/onboarding` | Redirect → `/auth/signin` |
| 3 | **Logged in** + on auth route (signin/signup/callback) | Check employee record: has one → `/`, no employee → `/onboarding` |
| 4 | **Logged in** + on main app (not auth/onboarding) | Check employee record: no employee → `/onboarding` |

### Matcher

```ts
"/((?!_next/static|_next/image|favicon.ico|target.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
```

Excludes static assets, images, and Next.js internals.

---

## 8. Auth Provider (Client-Side State)

The `AuthProvider` wraps the entire app and provides:

- `user` — Supabase Auth user object
- `employee` — the active employee record (from `employees` table)
- `company` — the company the employee belongs to
- `isLoading` — true while initial auth check is in progress
- `signOut()` — signs out and clears state
- `refreshProfile()` — re-fetches employee & company data

It listens to `supabase.auth.onAuthStateChange()` for real-time session updates.

---

## 9. Database Schema (Auth-Related)

### `companies` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, auto-generated |
| `name` | text | Company/workspace name |
| `creator_id` | uuid | FK → users.id |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto |

### `employees` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, auto-generated |
| `company_id` | uuid | FK → companies.id |
| `user_id` | uuid | FK → users.id (nullable for invited employees) |
| `first_name` | text | Required |
| `last_name` | text | Optional |
| `email` | text | Required |
| `role` | text | `'admin'` / `'member'` / `'manager'` |
| `status` | text | `'invited'` / `'active'` |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto |

**Unique constraint**: `(company_id, email)` — prevents duplicate employees per company.

### RLS Policies
- **Companies**: Creator has full access; employees can read their own company.
- **Employees**: Members can read own company's employees; admins can manage.
- **Data tables** (tasks, milestones, etc.): Tenant isolation via `get_accessible_employee_ids()` function.

---

## 10. Error Handling

All errors go through the `AppError` class:

```ts
class AppError extends Error {
  errorCode: string;      // e.g. "AUTH_SIGNUP_ERROR"
  errorMessage: string;   // Human-readable message
  httpStatusCode: number; // 400, 404, 409, 500
}
```

The UI layers (signup/signin pages) catch these errors and map them to user-friendly messages before displaying.

---

## Flow Diagram (Complete)

```
                    ┌──────────────┐
                    │   /auth/     │
                    │   signup     │
                    └──────┬───────┘
                           │ signUpWithEmail()
                           ▼
                    ┌──────────────┐
                    │  Supabase    │
                    │  auth.signUp │
                    └──────┬───────┘
                           │ sends verification email
                           ▼
                    ┌──────────────┐
                    │ "Check your  │
                    │   inbox"     │
                    └──────┬───────┘
                           │ user clicks email link
                           ▼
                    ┌──────────────┐
                    │ /auth/       │
                    │ callback     │──── error ───▶ /auth/signin?error=callback_failed
                    └──────┬───────┘
                           │ exchangeCodeForSession()
                           │
                    ┌──────┴──────┐
                    │             │
              has employee?   no employee
                    │             │
                    ▼             ▼
              ┌─────────┐  ┌────────────┐
              │    /     │  │ /onboarding│──▶ createCompanyAndEmployee() ──▶ /
              │(dashboard│  └────────────┘
              └─────────┘

                    ┌──────────────┐
                    │   /auth/     │
                    │   signin     │
                    └──────┬───────┘
                           │ signInWithEmail()
                           ▼
                    ┌──────────────┐
                    │  Supabase    │
                    │  signIn      │──── error ───▶ Friendly error shown
                    └──────┬───────┘
                           │ success
                           ▼
                    ┌──────────────┐
                    │ middleware   │
                    │ decides      │──▶ / (has employee) or /onboarding (no employee)
                    └──────────────┘
```
