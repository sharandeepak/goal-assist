# Multi-Employee Workspace Design

**Date:** 2026-04-15  
**Status:** Approved  
**Milestone:** v1.0  
**Related:** `.planning/REQUIREMENTS.md`

## Overview

Extend Goal Assist to support multiple users per workspace. Workspace owners can invite team members via email or shareable link. Members own their tasks and milestones with visibility controls (private/public). A manager hierarchy enables future team oversight features.

## Decisions Log

| Topic | Decision |
|-------|----------|
| Non-email invite flow | Both: manual link sharing + magic login detection |
| Signup with pending invite | Modal prompt to accept/decline |
| Role assignment at invite | Owner can assign any role (member/manager/admin) |
| Invite permissions | Admins invite any role; Managers invite members only |
| Manager at invite | Optional selection from existing members |
| Decline handling | Status = 'declined', visible to owner |
| Team page location | Dedicated sidebar item ("Team") |
| Email architecture | Supabase Edge Functions + Resend, factory pattern for provider abstraction |
| Team page views | Both flat list + tree view with toggle |
| Invite acceptance architecture | Middleware + Server Action (Approach B) |

---

## 1. Database Schema

### Modified Tables

**`users`**
```sql
ALTER TABLE users ADD COLUMN manager_id uuid REFERENCES users(id);
```

**`tasks`**
```sql
ALTER TABLE tasks ADD COLUMN visibility text NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private', 'public'));
```

**`milestones`**
```sql
ALTER TABLE milestones ADD COLUMN visibility text NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private', 'public'));
```

### New Tables

**`workspace_invitations`**

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| workspace_id | uuid | FK → workspaces, NOT NULL |
| email | text | NOT NULL, lowercase/trimmed |
| token | uuid | UNIQUE, NOT NULL, default gen_random_uuid() |
| role | text | NOT NULL, CHECK IN ('member', 'manager', 'admin') |
| manager_id | uuid | FK → users, nullable |
| invited_by | uuid | FK → users, NOT NULL |
| status | text | NOT NULL, CHECK IN ('pending', 'accepted', 'declined', 'expired') |
| created_at | timestamptz | NOT NULL, default now() |
| expires_at | timestamptz | NOT NULL, default now() + interval '7 days' |

Index: `(workspace_id, email, status)` for duplicate checking.

**`manager_reportee_mapping`** (closure table)

| Column | Type | Constraints |
|--------|------|-------------|
| manager_id | uuid | FK → users, NOT NULL |
| reportee_id | uuid | FK → users, NOT NULL |
| depth | int | NOT NULL, CHECK > 0 |
| workspace_id | uuid | FK → workspaces, NOT NULL |
| **PK** | | (manager_id, reportee_id) |

Index: `(manager_id)` for "get all reportees" queries.  
Index: `(reportee_id)` for "get all managers" queries.

---

## 2. Invite System Flow

### Creating an Invite

1. User opens Team page → clicks "Invite Member"
2. Dialog collects: email (required), role (dropdown), manager (optional dropdown)
3. `inviteService.createInvite()`:
   - Validate inviter permissions (admin → any role, manager → member only)
   - Check no active user with this email in workspace
   - Check no pending invite for this email in workspace
   - Insert `workspace_invitations` record (status: 'pending')
   - Insert `users` record (status: 'invited', role: assigned, auth_id: null)
   - If `INVITE_EMAIL_ENABLED=true` → invoke Edge Function
4. UI shows success with copyable invite link

### Accepting via Direct Link (`/invite/[token]`)

1. Server validates token:
   - Not found → error page
   - Expired → "Invite expired" message
   - Already accepted → "Already joined" with workspace link
   - Valid + pending → continue
2. Check if user is logged in:
   - Yes, same email → accept immediately, link auth_id
   - Yes, different email → show mismatch message
   - No → show signup form (email pre-filled, disabled)
3. On accept:
   - Create Supabase auth user (if new)
   - Update `users`: set auth_id, status = 'active'
   - Update `workspace_invitations`: status = 'accepted'
   - Populate `manager_reportee_mapping` if manager_id set
   - Redirect to workspace dashboard

---

## 3. Magic Login Detection Flow

For users who sign up independently but have pending invitations.

### Middleware Logic

```typescript
// middleware.ts
if (session && !hasActiveUserRecord) {
  if (pathname.startsWith('/onboarding') || pathname.startsWith('/invite')) {
    return next();
  }
  return NextResponse.redirect('/invite/pending');
}
```

### `/invite/pending` Page

1. Server component fetches auth user's email
2. Query pending, non-expired invitations for that email
3. If none → redirect to `/onboarding`
4. If invites exist → render prompt UI

### Prompt UI

- Shows workspace name, inviter name, assigned role
- Accept / Decline buttons per invitation
- If multiple invites, list all with individual actions

### Server Actions

**Accept:**
1. Link auth_id to existing `users` record
2. Set `users.status = 'active'`
3. Set `workspace_invitations.status = 'accepted'`
4. Populate `manager_reportee_mapping`
5. Redirect to dashboard

**Decline:**
1. Set `workspace_invitations.status = 'declined'`
2. Delete `users` record (status: 'invited')
3. If more pending invites → re-render; else → redirect to `/onboarding`

---

## 4. Email Provider Architecture

Factory pattern for provider abstraction.

### Interface

```typescript
// src/features/email/types/email-provider.ts
interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailProvider {
  send(message: EmailMessage): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}
```

### Factory

```typescript
// src/features/email/factory/email-factory.ts
type ProviderType = 'resend' | 'sendgrid' | 'smtp';

function createEmailProvider(type: ProviderType): EmailProvider {
  switch (type) {
    case 'resend':
      return new ResendProvider(process.env.RESEND_API_KEY!);
    case 'smtp':
      return new SmtpProvider({ /* config from env */ });
    default:
      throw new Error(`Unknown email provider: ${type}`);
  }
}
```

### Edge Function

```typescript
// supabase/functions/send-invite-email/index.ts
Deno.serve(async (req) => {
  const { email, workspaceName, inviterName, inviteLink } = await req.json();
  
  const provider = createEmailProvider(
    Deno.env.get('EMAIL_PROVIDER') as ProviderType
  );
  
  const result = await provider.send({
    to: email,
    subject: `You're invited to join ${workspaceName}`,
    html: renderInviteEmailTemplate({ workspaceName, inviterName, inviteLink }),
  });
  
  return new Response(JSON.stringify(result));
});
```

### Environment Variables

```env
INVITE_EMAIL_ENABLED=true|false
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxx
```

---

## 5. Team Page UI

### Location

Dedicated sidebar item: "Team" (top-level, alongside Planner, Milestones)

### Views

Toggle between:
- **List View**: Flat table with Name, Email, Role, Status, Manager columns
- **Tree View**: Visual hierarchy showing reporting structure

### Components

```
src/features/team/
├── components/
│   ├── team-page.tsx
│   ├── invite-member-dialog.tsx
│   ├── member-list-view.tsx
│   ├── member-tree-view.tsx
│   ├── member-row.tsx
│   ├── member-card.tsx
│   ├── member-actions-menu.tsx
│   └── pending-invites-section.tsx
├── services/
│   └── teamService.ts
├── repository/
│   └── teamRepository.ts
└── types/
    └── index.ts
```

### List View Features

- Search/filter members
- Columns: Name, Email, Role, Manager, Status
- Pending invites section at bottom
- Row actions: Edit Role, Change Manager, Remove

### Tree View Features

- Hierarchical display rooted at admins/owners
- Unassigned members shown in separate section
- Pending invites shown under their assigned manager (or unassigned)
- Click to expand/collapse branches
- **Collapse by default**: Only top 2 levels expanded on initial load
- **Lazy loading**: Children fetched on expand, not pre-loaded (keeps initial payload small)

---

## 6. Permissions & RLS

### Permission Matrix

| Action | Admin | Manager | Member |
|--------|-------|---------|--------|
| Invite admin | Yes | No | No |
| Invite manager | Yes | No | No |
| Invite member | Yes | Yes | No |
| Remove member | Yes | No | No |
| Change roles | Yes | No | No |
| Assign manager | Yes | No | No |
| Cancel/resend invite | Yes | Own | No |
| View all members | Yes | Yes | Yes |
| View public tasks | Yes | Yes | Yes |

### RLS Policies

**`workspace_invitations` SELECT:**
```sql
CREATE POLICY "Members can view workspace invitations"
ON workspace_invitations FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM users 
    WHERE auth_id = auth.uid() AND status = 'active'
  )
);
```

**`workspace_invitations` INSERT:**
```sql
CREATE POLICY "Authorized users can create invitations"
ON workspace_invitations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() 
      AND workspace_id = workspace_invitations.workspace_id
      AND status = 'active'
      AND (
        role = 'admin' 
        OR (role = 'manager' AND workspace_invitations.role = 'member')
      )
  )
);
```

**`workspace_invitations` UPDATE/DELETE:**
```sql
CREATE POLICY "Authorized users can manage invitations"
ON workspace_invitations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() 
      AND workspace_id = workspace_invitations.workspace_id
      AND status = 'active'
      AND (role = 'admin' OR id = workspace_invitations.invited_by)
  )
);
```

**`tasks` SELECT (updated):**
```sql
CREATE POLICY "Users can view own and public tasks"
ON tasks FOR SELECT
USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  OR (
    visibility = 'public' 
    AND workspace_id IN (
      SELECT workspace_id FROM users 
      WHERE auth_id = auth.uid() AND status = 'active'
    )
  )
);
```

**`milestones`** — same pattern as tasks.

**`manager_reportee_mapping`:**
```sql
-- SELECT: workspace members can read
CREATE POLICY "Members can view hierarchy"
ON manager_reportee_mapping FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM users 
    WHERE auth_id = auth.uid() AND status = 'active'
  )
);

-- INSERT/UPDATE/DELETE: service role only
```

### Service-Layer Checks

```typescript
function canInvite(inviter: SupabaseUser, targetRole: Role): boolean {
  if (inviter.role === 'admin') return true;
  if (inviter.role === 'manager' && targetRole === 'member') return true;
  return false;
}

function canManageMember(actor: SupabaseUser, target: SupabaseUser): boolean {
  if (actor.role !== 'admin') return false;
  if (actor.id === target.id) return false;
  return true;
}
```

---

## 7. Closure Table Maintenance

The `manager_reportee_mapping` table is maintained by the service layer (not DB triggers) for simplicity and testability.

### On Manager Assignment

When `user.manager_id` changes from A to B:

1. Delete all rows where `reportee_id = user.id`
2. If B is not null:
   - Insert `(B, user.id, 1)` — direct report
   - For each ancestor of B (query `WHERE reportee_id = B`):
     - Insert `(ancestor.manager_id, user.id, ancestor.depth + 1)`

### On User Removal

When a user is removed from workspace:
1. Delete all rows in `manager_reportee_mapping` where `reportee_id = user.id`
2. Delete all rows in `manager_reportee_mapping` where `manager_id = user.id`
3. Orphaned reportees have their `manager_id` set to null
4. User's tasks: set `visibility = 'private'` (they become invisible to workspace)
5. User's milestones: set `visibility = 'private'`
6. Set `users.status = 'inactive'` (soft delete, preserves audit trail)
7. Do NOT delete tasks/milestones — data retained for potential re-invitation or export

---

## 8. Implementation Phases

From `.planning/REQUIREMENTS.md`:

| Phase | Focus | Requirements |
|-------|-------|--------------|
| 1 | Database Schema | DB-01 through DB-07 |
| 2 | Invite System | INV-01 through INV-09 |
| 3 | Multi-User Workspace | MEM-01 through MEM-04 |
| 4 | Task/Milestone Visibility | TASK-01–04, MILE-01–04 |
| 5 | Manager Hierarchy | MGR-01 through MGR-03 |

---

## Out of Scope (v1.0)

- Manager viewing/assigning reportee tasks (v2)
- OAuth/SSO login
- Role-based feature permissions (per-feature gates)
- Real-time collaborative editing
- In-app notifications for invites

---

## Open Questions

None — all clarified during brainstorming session.

---

*Design approved: 2026-04-15*
