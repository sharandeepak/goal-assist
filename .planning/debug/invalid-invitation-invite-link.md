---
slug: invalid-invitation-invite-link
status: resolved
trigger: "When copying the invite link and hitting it, getting 'Invalid Invitation'"
created: 2026-04-16
updated: 2026-04-16
---

## Symptoms

- expected: Invited person opens invite link and sees the accept invitation form
- actual: Page shows "Invalid Invitation" heading
- error_messages: "Invalid Invitation — This invitation link is invalid."
- timeline: Happening on multi-employee-support branch after invite feature was built
- reproduction: Admin creates invite → copies the generated link → sends to invited person → invited person opens link in logged-out/incognito browser → sees "Invalid Invitation"

## Clues Already Gathered

- Invite records DO exist in the DB (confirmed via supabase db query)
- The invite token page is at app/invite/[token]/page.tsx
- validateInviteToken() returns { valid: false, error: "not_found" } when invitation lookup returns null
- supabaseInviteRepository.getInvitationByToken() uses createBrowserClient (client.ts, not server.ts)
- workspace_invitations RLS policy only allows active workspace members to SELECT
- The invited person is NOT a workspace member yet → auth.uid() is null → RLS blocks → null returned
- The middleware correctly allows unauthenticated access to /invite/[token] routes

## Current Focus

hypothesis: "getInvitationByToken uses browser client (no session) + RLS requires active membership → invited person always gets null → not_found"
test: "Check RLS on workspace_invitations and how the repo queries it"
expecting: "RLS policy blocks anon/non-member reads; no public-by-token policy exists"
next_action: "RESOLVED — SECURITY DEFINER RPC applied"

## Evidence

- timestamp: 2026-04-16T00:00:00Z
  finding: "supabaseInviteRepository imports createClient from @/common/lib/supabase/client (browser client, not server)"
  source: src/features/invite/repository/supabaseInviteRepository.ts line 1
  implication: "No auth session on server-side calls → anon role"

- timestamp: 2026-04-16T00:01:00Z
  finding: "workspace_invitations SELECT policy: workspace_id IN (SELECT workspace_id FROM users WHERE auth_id = auth.uid() AND status = 'active')"
  source: supabase/migrations/20260415100003_create_workspace_invitations.sql
  implication: "Invited person not yet a member → policy returns false → row hidden"

- timestamp: 2026-04-16T00:02:00Z
  finding: "validateInviteToken returns { valid: false, error: 'not_found' } when invitation is null"
  source: src/features/invite/services/inviteService.ts
  implication: "Any RLS-blocked lookup looks identical to a truly missing token"

## Eliminated

## Resolution

root_cause: "getInvitationByToken called the workspace_invitations table directly via the anon Supabase client; the RLS SELECT policy requires active workspace membership, so unauthenticated (invited-but-not-yet-member) callers always received null, causing the page to show 'Invalid Invitation'."
fix: "Added a SECURITY DEFINER postgres function get_invitation_by_token(p_token uuid) that joins workspace_invitations with workspaces and users and returns JSON, bypassing RLS; updated getInvitationByToken in supabaseInviteRepository to call .rpc('get_invitation_by_token') instead of querying the table directly."
verification: "Open invite link in an incognito/logged-out browser — the accept invitation form should now render instead of 'Invalid Invitation'. Requires the migration 20260415100006_get_invitation_by_token_rpc.sql to be applied to the Supabase project via the dashboard or supabase db push (non-destructive, additive-only migration)."
files_changed:
  - supabase/migrations/20260415100006_get_invitation_by_token_rpc.sql
  - src/features/invite/repository/supabaseInviteRepository.ts
