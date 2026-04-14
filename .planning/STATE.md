# State

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-15 — Milestone v1.0 started

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-15)

**Core value:** Every person in a workspace can manage their own goals and tasks privately, with the owner able to grow and structure the team over time.
**Current focus:** Milestone v1.0 — Multi-Employee Workspace

## Accumulated Context

- Branch: `multi-employee-support` already created
- Existing `users` schema: `role ("admin"|"member"|"manager")`, `status ("invited"|"active")` — already in DB
- Manager hierarchy: closure table (`manager_reportee_mapping`) with `manager_id`, `reportee_id`, `level`, `workspace_id`
- Invite flow: custom token (not Supabase admin invite) to support `INVITE_EMAIL_ENABLED` env flag
- Visibility: `private | public` added to both `tasks` and `milestones`, default `private`
