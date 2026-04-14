# Goal Assist

## What This Is

Goal Assist is a personal productivity and team goal management app built on Next.js 15 + Supabase. It helps individuals and teams track tasks, milestones, standups, time, and satisfaction — all scoped to a workspace. Currently single-user per workspace; this milestone adds multi-employee support.

## Core Value

Every person in a workspace can manage their own goals and tasks privately, with the owner able to grow and structure the team over time.

## Current Milestone: v1.0 Multi-Employee Workspace

**Goal:** Workspace owners can invite team members via email (env-gated), each member owns their tasks and goals with Private/Public visibility, backed by a pre-materialized closure table for scalable manager hierarchy.

**Target features:**
- Workspace invite system (email-optional via `INVITE_EMAIL_ENABLED` env flag)
- Multi-user workspace — multiple members share one workspace
- Task visibility — `private | public` per task (default: private)
- Goal/Milestone visibility — `private | public` per milestone (default: private)
- Scalable manager hierarchy — `users.manager_id` (direct parent) + `manager_reportee_mapping` closure table (pre-materialized all-depth relationships with `level` column)

## Requirements

### Validated

- ✓ Email/password authentication with Supabase sessions
- ✓ Workspace creation and single-user scoping via RLS
- ✓ Task CRUD with real-time subscriptions
- ✓ Milestone tracking with progress calculation
- ✓ Dashboard with activity overview
- ✓ Calendar view for date-based tasks
- ✓ Eisenhower matrix prioritization
- ✓ Daily standup workflow
- ✓ Time tracking (timesheet)
- ✓ Satisfaction logging
- ✓ Voice log capture
- ✓ Dark/light theme

### Active

- [ ] Workspace invite system (owner adds email → token → user joins)
- [ ] Multi-user workspace membership
- [ ] Task visibility (private | public)
- [ ] Milestone visibility (private | public)
- [ ] Manager hierarchy schema (closure table)
- [ ] Members directory in workspace settings

### Out of Scope

- Manager assignment UI (view/assign reportee tasks) — deferred to v1.1
- Role-based feature permissions — deferred to v1.1
- Notification system — separate milestone
- OAuth / SSO login — not planned
- Real-time collaborative editing — not planned

## Context

- Stack: Next.js 15 App Router, React 19, TypeScript, Supabase (PostgreSQL + RLS), shadcn/ui, TanStack Query
- 12 existing feature modules, 153 files, 16,569 lines
- `users` table already has `role: "admin" | "member" | "manager"` and `status: "invited" | "active"` — schema was partially anticipated
- All data is workspace-scoped via RLS; adding members means RLS policies need updating
- Invite email is env-gated (`INVITE_EMAIL_ENABLED`): when false, user discovers invite by signing in with invited email and following token link

## Constraints

- **Cost**: Project runs free-tier — no paid email provider required; email sending is optional
- **Auth**: Supabase Auth is the identity provider; custom invite tokens stored in DB (not Supabase admin invite API, which always sends email)
- **Hierarchy**: Closure table (`manager_reportee_mapping`) — no recursive SQL at read time; writes denormalize the tree on assignment

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Closure table over adjacency list recursion | User explicitly requested pre-materialized mapping; O(1) reads for manager hierarchy | — Pending |
| Custom invite tokens over Supabase `inviteUserByEmail` | Supabase always sends email; env-gated email requires full control of token flow | — Pending |
| Default visibility = private | Users should control what teammates see; opt-in sharing is safer | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-15 — Milestone v1.0 started*
