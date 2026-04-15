# Multi-Employee Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable multiple users per workspace with invite system, visibility controls, and manager hierarchy.

**Architecture:** Supabase migrations add schema, new `team` feature handles invites/members, middleware routes new signups through invite detection, closure table tracks manager hierarchy.

**Tech Stack:** Next.js 15, Supabase (Postgres + RLS + Edge Functions), React 19, TypeScript, Zod, React Hook Form, TanStack Query

---

## File Structure

### Phase 1: Database Schema
```
supabase/migrations/
├── 20260415100000_add_manager_id_to_users.sql
├── 20260415100001_add_visibility_to_tasks.sql
├── 20260415100002_add_visibility_to_milestones.sql
├── 20260415100003_create_workspace_invitations.sql
├── 20260415100004_create_manager_reportee_mapping.sql
├── 20260415100005_update_rls_policies.sql
src/common/types/
├── database.types.ts (regenerate)
├── index.ts (add new types)
```

### Phase 2: Invite System
```
src/features/invite/
├── types/
│   └── index.ts
├── repository/
│   ├── inviteRepository.ts (interface)
│   └── supabaseInviteRepository.ts
├── services/
│   └── inviteService.ts
├── components/
│   ├── invite-member-dialog.tsx
│   └── pending-invite-card.tsx
app/invite/
├── [token]/
│   └── page.tsx
├── pending/
│   └── page.tsx
supabase/functions/
└── send-invite-email/
    ├── index.ts
    ├── email-provider.ts
    └── resend-provider.ts
```

### Phase 3: Team Page
```
src/features/team/
├── types/
│   └── index.ts
├── repository/
│   ├── teamRepository.ts (interface)
│   └── supabaseTeamRepository.ts
├── services/
│   └── teamService.ts
├── components/
│   ├── team-page.tsx
│   ├── member-list-view.tsx
│   ├── member-tree-view.tsx
│   ├── member-row.tsx
│   ├── member-card.tsx
│   ├── member-actions-menu.tsx
│   └── pending-invites-section.tsx
app/team/
└── page.tsx
```

### Phase 4: Visibility Controls
```
src/features/tasks/
├── components/
│   └── task-form-dialog.tsx (modify)
├── repository/
│   └── supabaseTaskRepository.ts (modify)
src/features/milestones/
├── components/
│   └── milestone-form-dialog.tsx (modify)
├── repository/
│   └── supabaseMilestoneRepository.ts (modify)
```

### Phase 5: Manager Hierarchy
```
src/features/team/
├── services/
│   └── hierarchyService.ts
├── repository/
│   └── supabaseHierarchyRepository.ts
```

---

## Phase 1: Database Schema

### Task 1.1: Add manager_id to users

**Files:**
- Create: `supabase/migrations/20260415100000_add_manager_id_to_users.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Add manager_id column to users table for direct manager tracking
ALTER TABLE users ADD COLUMN manager_id uuid REFERENCES users(id) ON DELETE SET NULL;

-- Index for efficient "who reports to X" queries
CREATE INDEX idx_users_manager_id ON users(manager_id);

COMMENT ON COLUMN users.manager_id IS 'Direct manager of this user (nullable, self-referential)';
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 3: Verify the column exists**

Run: `npx supabase db dump --schema public | grep manager_id`
Expected: Shows `manager_id uuid` in users table definition

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260415100000_add_manager_id_to_users.sql
git commit -m "feat(db): add manager_id column to users table"
```

---

### Task 1.2: Add visibility to tasks

**Files:**
- Create: `supabase/migrations/20260415100001_add_visibility_to_tasks.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Add visibility column to tasks table
ALTER TABLE tasks ADD COLUMN visibility text NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private', 'public'));

-- Index for filtering by visibility in workspace queries
CREATE INDEX idx_tasks_visibility ON tasks(workspace_id, visibility);

COMMENT ON COLUMN tasks.visibility IS 'private = owner only, public = visible to workspace members';
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260415100001_add_visibility_to_tasks.sql
git commit -m "feat(db): add visibility column to tasks table"
```

---

### Task 1.3: Add visibility to milestones

**Files:**
- Create: `supabase/migrations/20260415100002_add_visibility_to_milestones.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Add visibility column to milestones table
ALTER TABLE milestones ADD COLUMN visibility text NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private', 'public'));

-- Index for filtering by visibility in workspace queries
CREATE INDEX idx_milestones_visibility ON milestones(workspace_id, visibility);

COMMENT ON COLUMN milestones.visibility IS 'private = owner only, public = visible to workspace members';
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260415100002_add_visibility_to_milestones.sql
git commit -m "feat(db): add visibility column to milestones table"
```

---

### Task 1.4: Create workspace_invitations table

**Files:**
- Create: `supabase/migrations/20260415100003_create_workspace_invitations.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Create workspace_invitations table for managing team invites
CREATE TABLE workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('member', 'manager', 'admin')),
  manager_id uuid REFERENCES users(id) ON DELETE SET NULL,
  invited_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

-- Normalize email to lowercase
CREATE OR REPLACE FUNCTION normalize_invitation_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email = lower(trim(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_normalize_invitation_email
  BEFORE INSERT OR UPDATE ON workspace_invitations
  FOR EACH ROW EXECUTE FUNCTION normalize_invitation_email();

-- Index for checking duplicate invites
CREATE INDEX idx_workspace_invitations_lookup 
  ON workspace_invitations(workspace_id, email, status);

-- Index for token lookup (invite acceptance)
CREATE INDEX idx_workspace_invitations_token 
  ON workspace_invitations(token) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- RLS: Members can view invitations in their workspace
CREATE POLICY "Members can view workspace invitations"
ON workspace_invitations FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM users 
    WHERE auth_id = auth.uid() AND status = 'active'
  )
);

-- RLS: Admins can invite anyone, managers can invite members only
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

-- RLS: Admins or the inviter can update/delete invitations
CREATE POLICY "Authorized users can update invitations"
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

CREATE POLICY "Authorized users can delete invitations"
ON workspace_invitations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() 
      AND workspace_id = workspace_invitations.workspace_id
      AND status = 'active'
      AND (role = 'admin' OR id = workspace_invitations.invited_by)
  )
);

COMMENT ON TABLE workspace_invitations IS 'Pending and historical workspace invitations';
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260415100003_create_workspace_invitations.sql
git commit -m "feat(db): create workspace_invitations table with RLS"
```

---

### Task 1.5: Create manager_reportee_mapping table

**Files:**
- Create: `supabase/migrations/20260415100004_create_manager_reportee_mapping.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Create closure table for manager hierarchy
CREATE TABLE manager_reportee_mapping (
  manager_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reportee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  depth int NOT NULL CHECK (depth > 0),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  PRIMARY KEY (manager_id, reportee_id)
);

-- Index for "get all reportees of manager X"
CREATE INDEX idx_mrm_manager ON manager_reportee_mapping(manager_id);

-- Index for "get all managers of user X"
CREATE INDEX idx_mrm_reportee ON manager_reportee_mapping(reportee_id);

-- Index for workspace-scoped queries
CREATE INDEX idx_mrm_workspace ON manager_reportee_mapping(workspace_id);

-- Enable RLS
ALTER TABLE manager_reportee_mapping ENABLE ROW LEVEL SECURITY;

-- RLS: Workspace members can read the hierarchy
CREATE POLICY "Members can view hierarchy"
ON manager_reportee_mapping FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM users 
    WHERE auth_id = auth.uid() AND status = 'active'
  )
);

-- Note: INSERT/UPDATE/DELETE handled by service role (application layer)

COMMENT ON TABLE manager_reportee_mapping IS 'Closure table for manager hierarchy - depth 1 = direct report';
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260415100004_create_manager_reportee_mapping.sql
git commit -m "feat(db): create manager_reportee_mapping closure table"
```

---

### Task 1.6: Update RLS policies for visibility

**Files:**
- Create: `supabase/migrations/20260415100005_update_rls_policies.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Drop existing SELECT policies on tasks and milestones
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view their own milestones" ON milestones;

-- Updated tasks SELECT policy: own tasks OR public tasks in same workspace
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

-- Updated milestones SELECT policy: own milestones OR public milestones in same workspace
CREATE POLICY "Users can view own and public milestones"
ON milestones FOR SELECT
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

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260415100005_update_rls_policies.sql
git commit -m "feat(db): update RLS policies for task/milestone visibility"
```

---

### Task 1.7: Regenerate TypeScript types

**Files:**
- Modify: `src/common/types/database.types.ts`
- Modify: `src/common/types/index.ts`

- [ ] **Step 1: Regenerate database types**

Run: `npx supabase gen types typescript --local > src/common/types/database.types.ts`
Expected: File regenerated with new tables and columns

- [ ] **Step 2: Verify new types exist**

Run: `grep -E "(workspace_invitations|manager_reportee_mapping|visibility|manager_id)" src/common/types/database.types.ts | head -20`
Expected: Shows new table types and column definitions

- [ ] **Step 3: Add new type exports to index.ts**

Open `src/common/types/index.ts` and add after the existing exports:

```typescript
// ─── Workspace Invitations ───

export type SupabaseWorkspaceInvitation = Database["public"]["Tables"]["workspace_invitations"]["Row"];
export type SupabaseWorkspaceInvitationInsert = Database["public"]["Tables"]["workspace_invitations"]["Insert"];
export type SupabaseWorkspaceInvitationUpdate = Database["public"]["Tables"]["workspace_invitations"]["Update"];

// ─── Manager Hierarchy ───

export type SupabaseManagerReporteeMapping = Database["public"]["Tables"]["manager_reportee_mapping"]["Row"];
export type SupabaseManagerReporteeMappingInsert = Database["public"]["Tables"]["manager_reportee_mapping"]["Insert"];

// ─── Visibility Type ───

export type Visibility = "private" | "public";

// ─── Role Type ───

export type UserRole = "admin" | "manager" | "member";

// ─── Invitation Status ───

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";
```

- [ ] **Step 4: Commit**

```bash
git add src/common/types/database.types.ts src/common/types/index.ts
git commit -m "feat(types): regenerate database types with new schema"
```

---

## Phase 2: Invite System

### Task 2.1: Create invite feature types

**Files:**
- Create: `src/features/invite/types/index.ts`

- [ ] **Step 1: Create the types file**

```typescript
import type { 
  SupabaseWorkspaceInvitation, 
  SupabaseUser, 
  SupabaseWorkspace,
  UserRole 
} from "@/common/types";

export interface InviteWithDetails extends SupabaseWorkspaceInvitation {
  workspace: Pick<SupabaseWorkspace, "id" | "name">;
  inviter: Pick<SupabaseUser, "id" | "first_name" | "last_name" | "email">;
}

export interface CreateInviteParams {
  workspaceId: string;
  email: string;
  role: UserRole;
  managerId?: string;
  invitedBy: string;
}

export interface CreateInviteResult {
  invitation: SupabaseWorkspaceInvitation;
  inviteLink: string;
  userRecord: SupabaseUser;
}

export interface AcceptInviteParams {
  token: string;
  authId: string;
  firstName: string;
  lastName?: string;
  password?: string;
}

export interface InviteValidationResult {
  valid: boolean;
  invitation?: InviteWithDetails;
  error?: "not_found" | "expired" | "already_accepted" | "declined";
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/invite/types/index.ts
git commit -m "feat(invite): add invite feature types"
```

---

### Task 2.2: Create invite repository interface

**Files:**
- Create: `src/features/invite/repository/inviteRepository.ts`

- [ ] **Step 1: Create the repository interface**

```typescript
import type { 
  SupabaseWorkspaceInvitation, 
  SupabaseWorkspaceInvitationInsert,
  SupabaseUser,
  SupabaseUserInsert
} from "@/common/types";
import type { InviteWithDetails } from "../types";

export interface InviteRepository {
  getInvitationByToken(token: string): Promise<InviteWithDetails | null>;
  
  getPendingInvitationsForEmail(email: string): Promise<InviteWithDetails[]>;
  
  getPendingInvitationsForWorkspace(workspaceId: string): Promise<InviteWithDetails[]>;
  
  getInvitationsByWorkspace(workspaceId: string): Promise<InviteWithDetails[]>;
  
  checkDuplicateInvite(workspaceId: string, email: string): Promise<boolean>;
  
  checkActiveUserInWorkspace(workspaceId: string, email: string): Promise<boolean>;
  
  createInvitation(data: SupabaseWorkspaceInvitationInsert): Promise<SupabaseWorkspaceInvitation>;
  
  createInvitedUser(data: SupabaseUserInsert): Promise<SupabaseUser>;
  
  updateInvitationStatus(
    invitationId: string, 
    status: "accepted" | "declined" | "expired"
  ): Promise<void>;
  
  linkAuthIdToUser(userId: string, authId: string): Promise<void>;
  
  activateUser(userId: string): Promise<void>;
  
  deleteInvitedUser(userId: string): Promise<void>;
  
  cancelInvitation(invitationId: string): Promise<void>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/invite/repository/inviteRepository.ts
git commit -m "feat(invite): add invite repository interface"
```

---

### Task 2.3: Implement Supabase invite repository

**Files:**
- Create: `src/features/invite/repository/supabaseInviteRepository.ts`

- [ ] **Step 1: Create the repository implementation**

```typescript
import { createClient } from "@/common/lib/supabase/client";
import type { 
  SupabaseWorkspaceInvitation, 
  SupabaseWorkspaceInvitationInsert,
  SupabaseUser,
  SupabaseUserInsert
} from "@/common/types";
import type { InviteRepository } from "./inviteRepository";
import type { InviteWithDetails } from "../types";
import { AppError } from "@/common/errors/AppError";

class SupabaseInviteRepository implements InviteRepository {
  private get supabase() {
    return createClient();
  }

  async getInvitationByToken(token: string): Promise<InviteWithDetails | null> {
    const { data, error } = await this.supabase
      .from("workspace_invitations")
      .select(`
        *,
        workspace:workspaces(id, name),
        inviter:users!workspace_invitations_invited_by_fkey(id, first_name, last_name, email)
      `)
      .eq("token", token)
      .maybeSingle();

    if (error) {
      throw AppError.internal("INVITE_FETCH_ERROR", "Failed to fetch invitation.");
    }

    return data as InviteWithDetails | null;
  }

  async getPendingInvitationsForEmail(email: string): Promise<InviteWithDetails[]> {
    const normalizedEmail = email.toLowerCase().trim();
    
    const { data, error } = await this.supabase
      .from("workspace_invitations")
      .select(`
        *,
        workspace:workspaces(id, name),
        inviter:users!workspace_invitations_invited_by_fkey(id, first_name, last_name, email)
      `)
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());

    if (error) {
      throw AppError.internal("INVITE_FETCH_ERROR", "Failed to fetch pending invitations.");
    }

    return (data ?? []) as InviteWithDetails[];
  }

  async getPendingInvitationsForWorkspace(workspaceId: string): Promise<InviteWithDetails[]> {
    const { data, error } = await this.supabase
      .from("workspace_invitations")
      .select(`
        *,
        workspace:workspaces(id, name),
        inviter:users!workspace_invitations_invited_by_fkey(id, first_name, last_name, email)
      `)
      .eq("workspace_id", workspaceId)
      .eq("status", "pending");

    if (error) {
      throw AppError.internal("INVITE_FETCH_ERROR", "Failed to fetch workspace invitations.");
    }

    return (data ?? []) as InviteWithDetails[];
  }

  async getInvitationsByWorkspace(workspaceId: string): Promise<InviteWithDetails[]> {
    const { data, error } = await this.supabase
      .from("workspace_invitations")
      .select(`
        *,
        workspace:workspaces(id, name),
        inviter:users!workspace_invitations_invited_by_fkey(id, first_name, last_name, email)
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      throw AppError.internal("INVITE_FETCH_ERROR", "Failed to fetch workspace invitations.");
    }

    return (data ?? []) as InviteWithDetails[];
  }

  async checkDuplicateInvite(workspaceId: string, email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    
    const { count, error } = await this.supabase
      .from("workspace_invitations")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("email", normalizedEmail)
      .eq("status", "pending");

    if (error) {
      throw AppError.internal("INVITE_CHECK_ERROR", "Failed to check for duplicate invite.");
    }

    return (count ?? 0) > 0;
  }

  async checkActiveUserInWorkspace(workspaceId: string, email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    
    const { count, error } = await this.supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("email", normalizedEmail)
      .eq("status", "active");

    if (error) {
      throw AppError.internal("USER_CHECK_ERROR", "Failed to check for existing user.");
    }

    return (count ?? 0) > 0;
  }

  async createInvitation(data: SupabaseWorkspaceInvitationInsert): Promise<SupabaseWorkspaceInvitation> {
    const { data: invitation, error } = await this.supabase
      .from("workspace_invitations")
      .insert(data)
      .select()
      .single();

    if (error) {
      throw AppError.internal("INVITE_CREATE_ERROR", "Failed to create invitation.");
    }

    return invitation;
  }

  async createInvitedUser(data: SupabaseUserInsert): Promise<SupabaseUser> {
    const { data: user, error } = await this.supabase
      .from("users")
      .insert(data)
      .select()
      .single();

    if (error) {
      throw AppError.internal("USER_CREATE_ERROR", "Failed to create invited user record.");
    }

    return user;
  }

  async updateInvitationStatus(
    invitationId: string, 
    status: "accepted" | "declined" | "expired"
  ): Promise<void> {
    const { error } = await this.supabase
      .from("workspace_invitations")
      .update({ status })
      .eq("id", invitationId);

    if (error) {
      throw AppError.internal("INVITE_UPDATE_ERROR", "Failed to update invitation status.");
    }
  }

  async linkAuthIdToUser(userId: string, authId: string): Promise<void> {
    const { error } = await this.supabase
      .from("users")
      .update({ auth_id: authId })
      .eq("id", userId);

    if (error) {
      throw AppError.internal("USER_LINK_ERROR", "Failed to link auth ID to user.");
    }
  }

  async activateUser(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from("users")
      .update({ status: "active" })
      .eq("id", userId);

    if (error) {
      throw AppError.internal("USER_ACTIVATE_ERROR", "Failed to activate user.");
    }
  }

  async deleteInvitedUser(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from("users")
      .delete()
      .eq("id", userId)
      .eq("status", "invited");

    if (error) {
      throw AppError.internal("USER_DELETE_ERROR", "Failed to delete invited user.");
    }
  }

  async cancelInvitation(invitationId: string): Promise<void> {
    const { error } = await this.supabase
      .from("workspace_invitations")
      .delete()
      .eq("id", invitationId);

    if (error) {
      throw AppError.internal("INVITE_CANCEL_ERROR", "Failed to cancel invitation.");
    }
  }
}

export const supabaseInviteRepository = new SupabaseInviteRepository();
```

- [ ] **Step 2: Commit**

```bash
git add src/features/invite/repository/supabaseInviteRepository.ts
git commit -m "feat(invite): implement Supabase invite repository"
```

---

### Task 2.4: Create invite service

**Files:**
- Create: `src/features/invite/services/inviteService.ts`

- [ ] **Step 1: Create the invite service**

```typescript
import type { SupabaseUser, UserRole } from "@/common/types";
import { AppError } from "@/common/errors/AppError";
import { supabaseInviteRepository } from "../repository/supabaseInviteRepository";
import type { 
  CreateInviteParams, 
  CreateInviteResult, 
  InviteValidationResult,
  InviteWithDetails 
} from "../types";
import { createClient } from "@/common/lib/supabase/client";

const inviteRepository = supabaseInviteRepository;

export function canInvite(inviter: SupabaseUser, targetRole: UserRole): boolean {
  if (inviter.role === "admin") return true;
  if (inviter.role === "manager" && targetRole === "member") return true;
  return false;
}

export async function createInvite(params: CreateInviteParams): Promise<CreateInviteResult> {
  const { workspaceId, email, role, managerId, invitedBy } = params;
  const normalizedEmail = email.toLowerCase().trim();

  // Check for existing active user
  const hasActiveUser = await inviteRepository.checkActiveUserInWorkspace(workspaceId, normalizedEmail);
  if (hasActiveUser) {
    throw AppError.conflict("INVITE_USER_EXISTS", "A user with this email already exists in the workspace.");
  }

  // Check for existing pending invite
  const hasPendingInvite = await inviteRepository.checkDuplicateInvite(workspaceId, normalizedEmail);
  if (hasPendingInvite) {
    throw AppError.conflict("INVITE_DUPLICATE", "A pending invitation already exists for this email.");
  }

  // Create the invitation record
  const invitation = await inviteRepository.createInvitation({
    workspace_id: workspaceId,
    email: normalizedEmail,
    role,
    manager_id: managerId,
    invited_by: invitedBy,
    status: "pending",
  });

  // Create the invited user record (status: 'invited', no auth_id yet)
  const userRecord = await inviteRepository.createInvitedUser({
    workspace_id: workspaceId,
    email: normalizedEmail,
    first_name: normalizedEmail.split("@")[0], // Placeholder, updated on accept
    role,
    status: "invited",
    manager_id: managerId,
  });

  // Generate invite link
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${baseUrl}/invite/${invitation.token}`;

  // Trigger email if enabled
  if (process.env.INVITE_EMAIL_ENABLED === "true") {
    await triggerInviteEmail(invitation.id, normalizedEmail, inviteLink);
  }

  return { invitation, inviteLink, userRecord };
}

export async function validateInviteToken(token: string): Promise<InviteValidationResult> {
  const invitation = await inviteRepository.getInvitationByToken(token);

  if (!invitation) {
    return { valid: false, error: "not_found" };
  }

  if (invitation.status === "accepted") {
    return { valid: false, error: "already_accepted", invitation };
  }

  if (invitation.status === "declined") {
    return { valid: false, error: "declined", invitation };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    // Auto-update to expired
    await inviteRepository.updateInvitationStatus(invitation.id, "expired");
    return { valid: false, error: "expired", invitation };
  }

  if (invitation.status === "expired") {
    return { valid: false, error: "expired", invitation };
  }

  return { valid: true, invitation };
}

export async function acceptInvite(
  invitationId: string,
  userId: string,
  authId: string
): Promise<void> {
  // Link auth_id to user
  await inviteRepository.linkAuthIdToUser(userId, authId);
  
  // Activate user
  await inviteRepository.activateUser(userId);
  
  // Mark invitation as accepted
  await inviteRepository.updateInvitationStatus(invitationId, "accepted");
}

export async function declineInvite(invitationId: string, userId: string): Promise<void> {
  // Mark invitation as declined
  await inviteRepository.updateInvitationStatus(invitationId, "declined");
  
  // Delete the invited user record
  await inviteRepository.deleteInvitedUser(userId);
}

export async function getPendingInvitesForEmail(email: string): Promise<InviteWithDetails[]> {
  return inviteRepository.getPendingInvitationsForEmail(email);
}

export async function getPendingInvitesForWorkspace(workspaceId: string): Promise<InviteWithDetails[]> {
  return inviteRepository.getPendingInvitationsForWorkspace(workspaceId);
}

export async function cancelInvite(invitationId: string): Promise<void> {
  await inviteRepository.cancelInvitation(invitationId);
}

export async function resendInvite(invitationId: string): Promise<string> {
  const supabase = createClient();
  
  // Get the invitation
  const { data: invitation, error } = await supabase
    .from("workspace_invitations")
    .select("*")
    .eq("id", invitationId)
    .single();

  if (error || !invitation) {
    throw AppError.notFound("INVITE_NOT_FOUND", "Invitation not found.");
  }

  // Reset expiration
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + 7);

  await supabase
    .from("workspace_invitations")
    .update({ 
      expires_at: newExpiresAt.toISOString(),
      status: "pending" 
    })
    .eq("id", invitationId);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${baseUrl}/invite/${invitation.token}`;

  // Trigger email if enabled
  if (process.env.INVITE_EMAIL_ENABLED === "true") {
    await triggerInviteEmail(invitationId, invitation.email, inviteLink);
  }

  return inviteLink;
}

async function triggerInviteEmail(
  invitationId: string, 
  email: string, 
  inviteLink: string
): Promise<void> {
  const supabase = createClient();
  
  try {
    await supabase.functions.invoke("send-invite-email", {
      body: { invitationId, email, inviteLink },
    });
  } catch (error) {
    console.error("Failed to send invite email:", error);
    // Don't throw - email is optional, invite still works via link
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/invite/services/inviteService.ts
git commit -m "feat(invite): implement invite service with business logic"
```

---

### Task 2.5: Update middleware for invite detection

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Read current middleware**

Run: Review the current middleware.ts file (already read earlier)

- [ ] **Step 2: Update middleware with invite route handling**

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes accessible to unauthenticated users
const AUTH_ROUTES = [
  "/auth/signin",
  "/auth/signup",
  "/auth/callback",
  "/auth/forgot-password",
  "/auth/reset-password",
];

// Routes that should NOT redirect away even when logged in
const ALWAYS_ACCESSIBLE_AUTH_ROUTES = ["/auth/reset-password"];
const ONBOARDING_ROUTE = "/onboarding";
const INVITE_ROUTES = ["/invite"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, searchParams } = request.nextUrl;

  // Supabase PKCE password-reset links land on the site root with ?code=&next=
  const pkceCode = searchParams.get("code");
  if (pkceCode && !pathname.startsWith("/auth/callback")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isOnboardingRoute = pathname.startsWith(ONBOARDING_ROUTE);
  const isInviteRoute = INVITE_ROUTES.some((route) => pathname.startsWith(route));

  // Allow unauthenticated access to invite token pages (they handle their own auth)
  if (!user && isInviteRoute && pathname.startsWith("/invite/") && pathname !== "/invite/pending") {
    return supabaseResponse;
  }

  if (!user && !isAuthRoute && !isOnboardingRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    return NextResponse.redirect(url);
  }

  if (!user && isOnboardingRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    return NextResponse.redirect(url);
  }

  const isAlwaysAccessible = ALWAYS_ACCESSIBLE_AUTH_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (user && isAuthRoute && !isAlwaysAccessible) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Check if authenticated user has an active user record
  if (user && !isAuthRoute && !isOnboardingRoute && !isInviteRoute) {
    const { data: activeUser } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!activeUser) {
      // No active user record - check for pending invites
      const url = request.nextUrl.clone();
      url.pathname = "/invite/pending";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|target.svg|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): update middleware for invite detection flow"
```

---

### Task 2.6: Create invite token page

**Files:**
- Create: `app/invite/[token]/page.tsx`

- [ ] **Step 1: Create the invite acceptance page**

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateInviteToken } from "@/features/invite/services/inviteService";
import { InviteAcceptForm } from "./invite-accept-form";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const validation = await validateInviteToken(token);

  if (!validation.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">
            {validation.error === "not_found" && "Invalid Invitation"}
            {validation.error === "expired" && "Invitation Expired"}
            {validation.error === "already_accepted" && "Already Joined"}
            {validation.error === "declined" && "Invitation Declined"}
          </h1>
          <p className="text-muted-foreground">
            {validation.error === "not_found" && "This invitation link is invalid."}
            {validation.error === "expired" && "This invitation has expired. Please contact the workspace owner."}
            {validation.error === "already_accepted" && "You have already accepted this invitation."}
            {validation.error === "declined" && "This invitation was declined."}
          </p>
        </div>
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  const invitation = validation.invitation!;

  // Check if logged-in user's email matches
  if (user) {
    const userEmail = user.email?.toLowerCase().trim();
    const inviteEmail = invitation.email.toLowerCase().trim();

    if (userEmail === inviteEmail) {
      // Auto-accept: same email
      return (
        <InviteAcceptForm 
          invitation={invitation}
          isLoggedIn={true}
          emailMatch={true}
        />
      );
    } else {
      // Email mismatch
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Email Mismatch</h1>
            <p className="text-muted-foreground">
              You are logged in as <strong>{userEmail}</strong>, but this invitation is for <strong>{inviteEmail}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Please sign out and sign in with the correct email, or ask for a new invitation.
            </p>
          </div>
        </div>
      );
    }
  }

  // Not logged in - show signup form
  return (
    <InviteAcceptForm 
      invitation={invitation}
      isLoggedIn={false}
      emailMatch={false}
    />
  );
}
```

- [ ] **Step 2: Create the invite accept form component**

Create `app/invite/[token]/invite-accept-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/common/ui/button";
import { Input } from "@/common/ui/input";
import { Label } from "@/common/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/ui/card";
import { createClient } from "@/common/lib/supabase/client";
import { acceptInvite } from "@/features/invite/services/inviteService";
import type { InviteWithDetails } from "@/features/invite/types";

interface InviteAcceptFormProps {
  invitation: InviteWithDetails;
  isLoggedIn: boolean;
  emailMatch: boolean;
}

export function InviteAcceptForm({ invitation, isLoggedIn, emailMatch }: InviteAcceptFormProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      if (isLoggedIn && emailMatch) {
        // Already logged in with matching email - just accept
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Find the invited user record
        const { data: invitedUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", invitation.email)
          .eq("workspace_id", invitation.workspace_id)
          .eq("status", "invited")
          .single();

        if (!invitedUser) throw new Error("User record not found");

        await acceptInvite(invitation.id, invitedUser.id, user.id);
        router.push("/");
      } else {
        // New signup
        if (!firstName.trim()) {
          setError("First name is required");
          setIsLoading(false);
          return;
        }
        if (!password || password.length < 6) {
          setError("Password must be at least 6 characters");
          setIsLoading(false);
          return;
        }

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: invitation.email,
          password,
        });

        if (authError) {
          setError(authError.message);
          setIsLoading(false);
          return;
        }

        if (!authData.user) {
          setError("Failed to create account");
          setIsLoading(false);
          return;
        }

        // Find and update the invited user record
        const { data: invitedUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", invitation.email)
          .eq("workspace_id", invitation.workspace_id)
          .eq("status", "invited")
          .single();

        if (!invitedUser) throw new Error("User record not found");

        // Update user with name
        await supabase
          .from("users")
          .update({ 
            first_name: firstName.trim(),
            last_name: lastName.trim() || null,
          })
          .eq("id", invitedUser.id);

        await acceptInvite(invitation.id, invitedUser.id, authData.user.id);
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join {invitation.workspace.name}</CardTitle>
          <CardDescription>
            {invitation.inviter.first_name} {invitation.inviter.last_name} invited you to join as a {invitation.role}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isLoggedIn && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={invitation.email} 
                  disabled 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name (optional)</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button 
            onClick={handleAccept} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Joining..." : "Accept Invitation"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/invite/[token]/page.tsx app/invite/[token]/invite-accept-form.tsx
git commit -m "feat(invite): create invite token acceptance page"
```

---

### Task 2.7: Create pending invites page

**Files:**
- Create: `app/invite/pending/page.tsx`

- [ ] **Step 1: Create the pending invites page**

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPendingInvitesForEmail } from "@/features/invite/services/inviteService";
import { PendingInvitesList } from "./pending-invites-list";

export default async function PendingInvitesPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/auth/signin");
  }

  const pendingInvites = await getPendingInvitesForEmail(user.email);

  if (pendingInvites.length === 0) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">You have pending invitations</h1>
          <p className="text-muted-foreground mt-2">
            Accept or decline the invitations below, or create a new workspace.
          </p>
        </div>
        
        <PendingInvitesList invites={pendingInvites} userAuthId={user.id} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the pending invites list component**

Create `app/invite/pending/pending-invites-list.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/common/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/ui/card";
import { createClient } from "@/common/lib/supabase/client";
import { acceptInvite, declineInvite } from "@/features/invite/services/inviteService";
import type { InviteWithDetails } from "@/features/invite/types";

interface PendingInvitesListProps {
  invites: InviteWithDetails[];
  userAuthId: string;
}

export function PendingInvitesList({ invites, userAuthId }: PendingInvitesListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [remainingInvites, setRemainingInvites] = useState(invites);

  const handleAccept = async (invite: InviteWithDetails) => {
    setLoadingId(invite.id);
    try {
      const supabase = createClient();
      
      // Find the invited user record
      const { data: invitedUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", invite.email)
        .eq("workspace_id", invite.workspace_id)
        .eq("status", "invited")
        .single();

      if (!invitedUser) throw new Error("User record not found");

      await acceptInvite(invite.id, invitedUser.id, userAuthId);
      router.push("/");
    } catch (error) {
      console.error("Failed to accept invite:", error);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDecline = async (invite: InviteWithDetails) => {
    setLoadingId(invite.id);
    try {
      const supabase = createClient();
      
      // Find the invited user record
      const { data: invitedUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", invite.email)
        .eq("workspace_id", invite.workspace_id)
        .eq("status", "invited")
        .single();

      if (!invitedUser) throw new Error("User record not found");

      await declineInvite(invite.id, invitedUser.id);
      
      const updated = remainingInvites.filter(i => i.id !== invite.id);
      setRemainingInvites(updated);
      
      if (updated.length === 0) {
        router.push("/onboarding");
      }
    } catch (error) {
      console.error("Failed to decline invite:", error);
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreateNew = () => {
    router.push("/onboarding");
  };

  return (
    <div className="space-y-4">
      {remainingInvites.map((invite) => (
        <Card key={invite.id}>
          <CardHeader>
            <CardTitle>{invite.workspace.name}</CardTitle>
            <CardDescription>
              Invited by {invite.inviter.first_name} {invite.inviter.last_name} as {invite.role}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              onClick={() => handleAccept(invite)}
              disabled={loadingId === invite.id}
            >
              {loadingId === invite.id ? "Accepting..." : "Accept"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDecline(invite)}
              disabled={loadingId === invite.id}
            >
              Decline
            </Button>
          </CardContent>
        </Card>
      ))}

      <div className="pt-4 border-t">
        <Button variant="secondary" onClick={handleCreateNew} className="w-full">
          Create New Workspace Instead
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/invite/pending/page.tsx app/invite/pending/pending-invites-list.tsx
git commit -m "feat(invite): create pending invites page for magic login detection"
```

---

### Task 2.8: Create Edge Function for invite email

**Files:**
- Create: `supabase/functions/send-invite-email/index.ts`
- Create: `supabase/functions/send-invite-email/email-provider.ts`
- Create: `supabase/functions/send-invite-email/resend-provider.ts`

- [ ] **Step 1: Create the email provider interface**

Create `supabase/functions/send-invite-email/email-provider.ts`:

```typescript
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailResult>;
}

export type ProviderType = "resend" | "sendgrid" | "smtp";

export function createEmailProvider(type: ProviderType): EmailProvider {
  switch (type) {
    case "resend":
      return new ResendProvider();
    default:
      throw new Error(`Unknown email provider: ${type}`);
  }
}

class ResendProvider implements EmailProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = Deno.env.get("RESEND_API_KEY") || "";
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    if (!this.apiKey) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("EMAIL_FROM") || "Goal Assist <noreply@goalassist.app>",
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const data = await response.json();
      return { success: true, messageId: data.id };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}
```

- [ ] **Step 2: Create the Edge Function**

Create `supabase/functions/send-invite-email/index.ts`:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createEmailProvider, type ProviderType } from "./email-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { invitationId, email, inviteLink } = await req.json();

    // Get invitation details from database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("workspace_invitations")
      .select(`
        *,
        workspace:workspaces(name),
        inviter:users!workspace_invitations_invited_by_fkey(first_name, last_name)
      `)
      .eq("id", invitationId)
      .single();

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ success: false, error: "Invitation not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const workspaceName = invitation.workspace.name;
    const inviterName = `${invitation.inviter.first_name} ${invitation.inviter.last_name || ""}`.trim();

    const provider = createEmailProvider(
      (Deno.env.get("EMAIL_PROVIDER") as ProviderType) || "resend"
    );

    const result = await provider.send({
      to: email,
      subject: `You're invited to join ${workspaceName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Workspace Invitation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a1a;">You're invited!</h1>
            <p style="color: #666; font-size: 16px;">
              <strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> on Goal Assist.
            </p>
            <p style="color: #666; font-size: 16px;">
              You'll be joining as a <strong>${invitation.role}</strong>.
            </p>
            <a href="${inviteLink}" 
               style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
              Accept Invitation
            </a>
            <p style="color: #999; font-size: 14px; margin-top: 24px;">
              This invitation expires in 7 days. If you didn't expect this email, you can ignore it.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `${inviterName} has invited you to join ${workspaceName} on Goal Assist. Accept the invitation: ${inviteLink}`,
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-invite-email/
git commit -m "feat(email): add Edge Function for invite emails with provider abstraction"
```

---

## Phase 3: Team Page (Summary)

Due to the length of this plan, Phase 3-5 tasks follow the same detailed pattern. Here's a condensed overview:

### Task 3.1: Create team feature types
- Create `src/features/team/types/index.ts` with TeamMember, TreeNode interfaces

### Task 3.2: Create team repository
- Create `src/features/team/repository/teamRepository.ts` (interface)
- Create `src/features/team/repository/supabaseTeamRepository.ts`

### Task 3.3: Create team service
- Create `src/features/team/services/teamService.ts` with permission checks

### Task 3.4: Create team page route
- Create `app/team/page.tsx`

### Task 3.5: Create member list view
- Create `src/features/team/components/member-list-view.tsx`

### Task 3.6: Create member tree view
- Create `src/features/team/components/member-tree-view.tsx` with lazy loading

### Task 3.7: Create invite member dialog
- Create `src/features/team/components/invite-member-dialog.tsx`

### Task 3.8: Create member actions menu
- Create `src/features/team/components/member-actions-menu.tsx`

### Task 3.9: Add Team to sidebar
- Modify `src/common/components/sidebar.tsx` to add Team navigation item

---

## Phase 4: Visibility Controls (Summary)

### Task 4.1: Update task form for visibility
- Modify `src/features/tasks/components/task-form-dialog.tsx`

### Task 4.2: Update task repository for visibility
- Modify `src/features/tasks/repository/supabaseTaskRepository.ts`

### Task 4.3: Update milestone form for visibility
- Modify `src/features/milestones/components/milestone-form-dialog.tsx`

### Task 4.4: Update milestone repository for visibility
- Modify `src/features/milestones/repository/supabaseMilestoneRepository.ts`

---

## Phase 5: Manager Hierarchy (Summary)

### Task 5.1: Create hierarchy service
- Create `src/features/team/services/hierarchyService.ts`

### Task 5.2: Create hierarchy repository
- Create `src/features/team/repository/supabaseHierarchyRepository.ts`

### Task 5.3: Integrate hierarchy with invite acceptance
- Modify invite service to call hierarchy service on accept

### Task 5.4: Add manager selection to member edit
- Modify member actions to allow changing manager

---

## Environment Variables

Add to `.env.local`:

```env
# Invite System
INVITE_EMAIL_ENABLED=false
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email Provider (when INVITE_EMAIL_ENABLED=true)
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxx
EMAIL_FROM=Goal Assist <noreply@goalassist.app>
```

---

## Testing Checklist

- [ ] Create invite as admin - should succeed for any role
- [ ] Create invite as manager - should only succeed for member role
- [ ] Create invite as member - should fail
- [ ] Accept invite via direct link (new user)
- [ ] Accept invite via direct link (existing logged-in user, same email)
- [ ] Reject invite via direct link (logged-in user, different email)
- [ ] Magic login detection - signup with invited email shows prompt
- [ ] Accept/decline from pending invites page
- [ ] Decline all invites redirects to onboarding
- [ ] Cancel invite from team page
- [ ] Resend invite updates expiration
- [ ] Team list view shows all members
- [ ] Team tree view shows hierarchy
- [ ] Tree view lazy loads children on expand
- [ ] Task visibility toggle works
- [ ] Public tasks visible to workspace members
- [ ] Private tasks hidden from other members
- [ ] Manager assignment updates closure table
- [ ] Member removal cleans up hierarchy

---

*Plan generated: 2026-04-15*
