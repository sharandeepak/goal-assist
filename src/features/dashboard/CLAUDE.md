# Feature: dashboard

## Purpose
Main landing page (`/`) that orchestrates summary widgets from tasks, milestones, satisfaction, calendar, and standup. Aggregates data from multiple feature services — has no own service or repository.

## Key Files
- `app/page.tsx` — All dashboard logic (stub feature, no src/features/dashboard/components yet)

## No Own Service/Repository
Dashboard imports directly from other feature services:
```ts
import { getTodaysTaskSummary } from "@/features/tasks/services/taskService";
import { getPageMilestoneSummary } from "@/features/milestones/services/milestoneService";
import { getSatisfactionSummary } from "@/features/satisfaction/services/satisfactionService";
```

## Embedded Components
- `TaskSummary` from tasks feature
- `MilestoneProgress` + `MilestoneSummary` from milestones feature
- `SatisfactionCalendar` + `SatisfactionChart` from satisfaction feature
- `SmartCalendar` from calendar feature
- `StandupSummary` from standup feature

## Adding New Dashboard Widgets
1. Implement data fetching in the source feature's service
2. Create the UI component in that feature's `components/`
3. Import and place on `app/page.tsx`
4. Do NOT add business logic to `app/page.tsx` — keep it as a composition layer

## Dependencies
- Depends on: tasks, milestones, satisfaction, calendar, standup
- Depended on by: none (entry point)
