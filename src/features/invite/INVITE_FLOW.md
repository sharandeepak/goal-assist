# Invite Acceptance Flow — Reference

Source of truth for how a workspace invite is created, accepted, and how the
acceptee lands inside the invited workspace. Written because this flow has
**five separate RLS / state-sync gotchas** that are not obvious from the code.
Read this before touching `src/features/invite/**`, `app/invite/**`, or
`auth-provider.tsx`.

---

## Roles in the flow

| Actor                  | Code path                                                     |
| ---------------------- | ------------------------------------------------------------- |
| Inviter (admin/manager) | `app/settings/...` → `inviteService.createInvite()`           |
| Acceptee (browser)     | `/invite/[token]` → `invite-accept-form.tsx`                  |
| Acceptee server route  | `app/invite/[token]/page.tsx` (looks up token via RPC)        |
| DB                     | `users`, `workspace_invitations`, `manager_reportee_mapping`  |

---

## 1. Inviter creates an invite

`createInvite()` in `inviteService.ts` does three writes (browser client, inviter
is an active admin/manager so RLS allows them):

1. `INSERT workspace_invitations` (status=`pending`, generates `token` UUID)
2. `INSERT users` (status=`invited`, `auth_id=NULL`, placeholder `first_name`)
3. (optional) Edge function `send-invite-email`

Invite link: `${NEXT_PUBLIC_APP_URL}/invite/${token}`.

---

## 2. Acceptee opens `/invite/[token]`

`app/invite/[token]/page.tsx` (Server Component) calls
`validateInviteToken(token)` → `getInvitationByToken(token)`.

> ### Gotcha 1 — Anon SELECT on `workspace_invitations`
> The Server Component runs the **browser client** here, but with no session
> cookie attached server-side it executes as **anon**. RLS on
> `workspace_invitations` requires active workspace membership for SELECT, so
> a direct `.from("workspace_invitations").select(...)` returns `[]`.
>
> **Fix already in place:** `getInvitationByToken` calls the
> `get_invitation_by_token(p_token)` SECURITY DEFINER RPC
> (migration `20260415100006_get_invitation_by_token_rpc.sql`).

The page renders `InviteAcceptForm` with three flags:
- `isLoggedIn`: server-checked Supabase session
- `emailMatch`: logged-in email === invitation email

---

## 3. Acceptee clicks "Accept Invitation"

Two branches in `invite-accept-form.tsx`:

### 3a. Already logged in + email matches
Skips signUp/signIn entirely → calls `acceptInviteForUser(...)` →
`window.location.href = "/"`.

### 3b. Not logged in (typical flow)

1. `supabase.auth.signUp({ email, password })`
2. If response says **"already registered"** (or returns user with empty
   `identities[]`), fall back to `supabase.auth.signInWithPassword(...)`.

   > ### Gotcha 2 — `signUp` returns "already registered" for any prior auth.users row
   > Even if `public.users` was wiped, `auth.users` retains the row. To fully
   > reset a test user you must delete from BOTH tables:
   > ```sql
   > DELETE FROM public.workspace_invitations WHERE email = '<email>';
   > DELETE FROM public.users               WHERE email = '<email>';
   > DELETE FROM auth.users                 WHERE email = '<email>';
   > ```

3. Call `acceptInviteForUser(invitationId, email, workspaceId, authId, firstName, lastName)`.
4. **Hard-redirect** to `/`: `window.location.href = "/"`.

   > ### Gotcha 3 — Use hard navigation, not `router.push`
   > `router.push("/")` is client-side; `AuthProvider` keeps stale state
   > (`user: null` from before the RPC). Its useEffect then sees
   > `authUser && !user` on a non-`/invite` path and redirects to
   > `/onboarding` — bypassing the workspace the user just joined.
   >
   > A full reload makes middleware re-run, AuthProvider re-init, and the
   > now-active `users` row gets picked up.

---

## 4. `acceptInviteForUser` — the privileged write

Lives in `inviteService.ts`. **Single call** to
`accept_workspace_invitation(p_invitation_id, p_auth_id, p_first_name, p_last_name)`
(migration `20260415100009_fix_accept_invitation_updated_at.sql` — note that
`100008` defined an earlier broken version that referenced a non-existent
`workspace_invitations.updated_at` column; `100009` redefines it).

The RPC atomically:
1. Validates invite is pending and not expired
2. Looks up `users` row by `(email, workspace_id, status='invited')`
3. UPDATE that row: `auth_id`, `status='active'`, name fields, `updated_at`
4. UPDATE invitation: `status='accepted'`
5. Returns `{ success, user_id, manager_id, workspace_id }`

> ### Gotcha 4 — Why a SECURITY DEFINER RPC, not direct UPDATEs
> The invited `users` row has `auth_id = NULL`. RLS policy "Admins manage
> users" calls `get_my_admin_workspace_ids()` which queries
> `users WHERE auth_id = auth.uid()` — that returns nothing for the freshly
> signed-in acceptee, so the policy returns no rows and **all UPDATEs
> silently affect 0 rows with no error**. `signInWithPassword` succeeded but
> the activation does not happen. The acceptee is then bumped to onboarding
> and creates a new workspace.
>
> SECURITY DEFINER bypasses this entirely. Granted to `anon, authenticated`.

> ### Gotcha 5 — Don't pre-flight `findInvitedUserByEmail()` from the browser
> An earlier version SELECTed the invited `users` row from the browser before
> calling the RPC, in order to get `manager_id` for the hierarchy step. The
> RLS policy on `users` requires active membership in the workspace — which
> the acceptee does not yet have — so the SELECT returned 0 rows
> (`PGRST116 — Cannot coerce the result to a single JSON object`).
>
> **Fix:** the RPC returns `manager_id` and `workspace_id` directly. The
> service uses those values for `addManagerRelationship(...)` after the user
> is active.

If `manager_id` is non-null, `addManagerRelationship(managerId, userId, workspaceId)`
runs from the browser client. The user is now `status='active'` with the
matching `auth_id`, so the manager-mapping insert succeeds under normal RLS.

---

## 5. Pending-invites page — `/invite/pending`

Reached when an authenticated user has no active `users` row (middleware
redirect at `middleware.ts:106`). It calls `getPendingInvitesForEmail(email)`
which uses the `get_pending_invitations_for_email(p_email)` RPC for the same
RLS reason as Gotcha 1.

---

## Migration timeline (must apply in order)

| File                                                                  | What it does                                                              |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `20260415100003_create_workspace_invitations.sql`                     | Creates `workspace_invitations` (no `updated_at`)                         |
| `20260415100006_get_invitation_by_token_rpc.sql`                      | RPC for anon token lookup                                                 |
| `20260415100007_accept_invitation_rpcs.sql`                           | First version of `accept_workspace_invitation` + `get_pending_invitations_for_email` |
| `20260415100008_accept_invitation_returns_manager.sql`                | Adds `manager_id`/`workspace_id` to RPC return — **but** referenced non-existent `workspace_invitations.updated_at` |
| `20260415100009_fix_accept_invitation_updated_at.sql`                 | Removes the bad `updated_at` reference — current canonical version       |

---

## Test reset cheat sheet

```sql
-- Clean a single test email across all three tables.
DELETE FROM public.workspace_invitations WHERE email = '<email>';
DELETE FROM public.users               WHERE email = '<email>';
DELETE FROM auth.users                 WHERE email = '<email>';
```

Then: re-invite from admin UI → open invite link in incognito → fill form →
land on `/` inside invited workspace.

---

## Files involved (high-signal touch points)

- `app/invite/[token]/page.tsx` — server-side token validation + `InviteAcceptForm` render
- `app/invite/[token]/invite-accept-form.tsx` — signUp/signInWithPassword + `acceptInviteForUser`, **hard navigation only**
- `app/invite/pending/page.tsx` — pending-invite landing page
- `src/features/invite/services/inviteService.ts` — `createInvite`, `acceptInviteForUser`, `validateInviteToken`
- `src/features/invite/repository/supabaseInviteRepository.ts` — RPC wrappers (`getInvitationByToken`, `getPendingInvitationsForEmail`, `acceptInviteViaRpc`)
- `src/common/providers/auth-provider.tsx:173` — onboarding redirect with `/invite` carve-out
- `middleware.ts:60` — invite route allow-list for unauthenticated users
- `supabase/migrations/2026041510000{6,7,9}_*.sql` — the three RPCs that make this work
