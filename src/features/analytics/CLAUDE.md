# Feature: analytics

## Purpose
Read-only dashboard visualizing satisfaction trends, task completion rates, and weekly progress using Recharts. Currently uses mock/inline data — no repository or service layer.

## Key Files
- `app/analytics/page.tsx` — All component logic lives here (stub feature, no src/features/analytics/components yet)
- No service or repository — add them here when connecting real data

## Current State
This feature is a **stub**. Charts render with hardcoded sample data. When implementing:
1. Create `services/analyticsService.ts` — fetch aggregated data from task/satisfaction/milestone services
2. Create `repository/supabaseAnalyticsRepository.ts` if custom SQL aggregations are needed
3. Move page logic into `components/analytics-dashboard.tsx`

## Data Sources (when real data is wired)
- Task completion rates → `taskService.getTasksByDateRange()`
- Satisfaction trends → `satisfactionService` subscribe or fetch methods
- Milestone progress → `milestoneService.getMilestones()`

## Charts Library
Uses **Recharts** (`recharts` package). Import chart components directly from `recharts`.

## Dependencies
- Depends on: tasks, satisfaction, milestones (future — currently none)
- Depended on by: none
