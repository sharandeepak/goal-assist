# Requirements: Goal Assist

**Defined:** 2026-04-15
**Milestone:** v1.0 — Multi-Employee Workspace
**Core Value:** Every person in a workspace can manage their own goals and tasks privately, with the owner able to grow and structure the team over time.

## v1.0 Requirements

### Database Schema

- [ ] **DB-01**: `users` table gains `manager_id uuid` column (nullable, self-referential FK) for direct parent tracking
- [ ] **DB-02**: `tasks` table gains `visibility text` column (`'private' | 'public'`, default `'private'`)
- [ ] **DB-03**: `milestones` table gains `visibility text` column (`'private' | 'public'`, default `'private'`)
- [ ] **DB-04**: `workspace_invitations` table created with `id`, `workspace_id`, `email`, `token` (uuid, unique), `invited_by`, `created_at`, `expires_at`, `status ('pending'|'accepted'|'expired')`
- [ ] **DB-05**: `manager_reportee_mapping` table created with `manager_id`, `reportee_id`, `level` (int), `workspace_id`, unique constraint on `(manager_id, reportee_id)`
- [ ] **DB-06**: RLS policies updated — workspace members can read public tasks/milestones of other members in same workspace; private items visible to owner only
- [ ] **DB-07**: TypeScript database types (`database.types.ts`) updated to reflect all new columns and tables

### Invite System

- [ ] **INV-01**: Workspace owner can add a member by entering their email address in workspace settings
- [ ] **INV-02**: System creates a `workspace_invitations` record with a unique token (expires in 7 days)
- [ ] **INV-03**: System creates a `users` record with `status: 'invited'` and `role: 'member'` for the invited email
- [ ] **INV-04**: When `INVITE_EMAIL_ENABLED=true`, an invite email is sent containing the token link (`/invite/[token]`)
- [ ] **INV-05**: When `INVITE_EMAIL_ENABLED=false`, no email is sent; invited user must navigate to `/invite/[token]` manually or be given the link
- [ ] **INV-06**: Invite acceptance page (`/invite/[token]`) validates token is pending and not expired, then prompts user to set a password
- [ ] **INV-07**: On password set, Supabase auth user is created, `users.auth_id` is linked, `users.status` set to `'active'`, invitation `status` set to `'accepted'`
- [ ] **INV-08**: Expired or already-accepted tokens show a clear error with option to contact workspace owner
- [ ] **INV-09**: Workspace owner can see list of pending invites and cancel/resend them

### Multi-User Workspace

- [ ] **MEM-01**: Workspace settings page shows a members list with name, email, role, and status for all workspace users
- [ ] **MEM-02**: Workspace owner can remove a member (sets status to inactive or deletes user record, cascades tasks to private)
- [ ] **MEM-03**: Each workspace member can only create/edit/delete their own tasks and milestones
- [ ] **MEM-04**: Auth context (`useRequiredAuth`) continues to return `userId` and `workspaceId`; multi-user does not break existing single-user flows

### Task Visibility

- [ ] **TASK-01**: Task creation form includes a visibility toggle: Private (default) or Public
- [ ] **TASK-02**: Task edit form allows changing visibility at any time
- [ ] **TASK-03**: In planner/calendar views, user sees their own tasks (all) plus public tasks of other workspace members
- [ ] **TASK-04**: Private tasks of other members are never returned in queries for that user

### Milestone Visibility

- [ ] **MILE-01**: Milestone creation form includes a visibility toggle: Private (default) or Public
- [ ] **MILE-02**: Milestone edit form allows changing visibility at any time
- [ ] **MILE-03**: Milestones page shows user's own milestones (all) plus public milestones of other workspace members
- [ ] **MILE-04**: Private milestones of other members are never returned in queries for that user

### Manager Hierarchy

- [ ] **MGR-01**: When a user's `manager_id` is set (or changed), `manager_reportee_mapping` is automatically updated: insert all ancestor→user rows with correct depth levels
- [ ] **MGR-02**: When a user is removed from a workspace or manager changes, stale `manager_reportee_mapping` rows are cleaned up
- [ ] **MGR-03**: Query `manager_reportee_mapping WHERE manager_id = X` returns all direct and indirect reportees of X with their depth level — no recursive SQL needed at query time

## v2 Requirements

### Manager Assignment UI

- **MGRAS-01**: Manager can view tasks and milestones of all their direct and indirect reportees
- **MGRAS-02**: Manager can assign tasks to reportees
- **MGRAS-03**: Manager dashboard shows team progress aggregated across reportees

### Notifications

- **NOTF-01**: User receives in-app notification when invited to workspace
- **NOTF-02**: User receives email notification when assigned a task by a manager

## Out of Scope

| Feature | Reason |
|---------|--------|
| Manager assignment UI (view/assign reportee tasks) | Deferred to v1.1 — hierarchy schema is built now |
| OAuth / SSO login | Scope creep — email/password sufficient |
| Role-based feature permissions (per-feature gates) | Deferred to v1.1 after roles are established |
| Real-time collaborative editing | Not a goal-tracking feature |
| Supabase `inviteUserByEmail` admin API | Always sends email — incompatible with env-gated email requirement |
| Closure table auto-maintained via DB trigger | Managed in service layer for simplicity and testability |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DB-01 | Phase 1 | Pending |
| DB-02 | Phase 1 | Pending |
| DB-03 | Phase 1 | Pending |
| DB-04 | Phase 1 | Pending |
| DB-05 | Phase 1 | Pending |
| DB-06 | Phase 1 | Pending |
| DB-07 | Phase 1 | Pending |
| INV-01 | Phase 2 | Pending |
| INV-02 | Phase 2 | Pending |
| INV-03 | Phase 2 | Pending |
| INV-04 | Phase 2 | Pending |
| INV-05 | Phase 2 | Pending |
| INV-06 | Phase 2 | Pending |
| INV-07 | Phase 2 | Pending |
| INV-08 | Phase 2 | Pending |
| INV-09 | Phase 2 | Pending |
| MEM-01 | Phase 3 | Pending |
| MEM-02 | Phase 3 | Pending |
| MEM-03 | Phase 3 | Pending |
| MEM-04 | Phase 3 | Pending |
| TASK-01 | Phase 4 | Pending |
| TASK-02 | Phase 4 | Pending |
| TASK-03 | Phase 4 | Pending |
| TASK-04 | Phase 4 | Pending |
| MILE-01 | Phase 4 | Pending |
| MILE-02 | Phase 4 | Pending |
| MILE-03 | Phase 4 | Pending |
| MILE-04 | Phase 4 | Pending |
| MGR-01 | Phase 5 | Pending |
| MGR-02 | Phase 5 | Pending |
| MGR-03 | Phase 5 | Pending |

**Coverage:**
- v1.0 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-15*
*Last updated: 2026-04-15 after initial definition*
