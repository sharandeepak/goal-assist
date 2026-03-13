# Feature: Milestones

## Purpose
Goal tracking with progress bars, deadlines, urgency levels, and linked task management.

## Key Files
- `services/milestoneService.ts` — Business logic, progress calculation, status transitions
- `repository/supabaseMilestoneRepository.ts` — Supabase queries
- `components/milestone-progress.tsx` — Progress bars for dashboard
- `components/milestone-summary.tsx` — Summary stats card
- `utils.ts` — Pure utility functions (days-left calculation, etc.)

## Data Model (`SupabaseMilestone` from `@/common/types`)
Key fields: `id`, `title`, `description`, `progress` (0–100), `urgency` (`"high" | "medium" | "low"`), `status` (`"active" | "completed" | "overdue"`), `start_date`, `end_date`, `company_id`, `user_id`

Extended types:
- `MilestoneProgressData` — adds `daysLeft?: number`
- `PageMilestoneSummary` — `{ id, title, urgency, daysLeft }`

## Service API
```ts
import * as milestoneService from "@/features/milestones/services/milestoneService";

milestoneService.addMilestone(data: SupabaseMilestoneInsert)
milestoneService.updateMilestone(id, partial)
milestoneService.deleteMilestone(id)              // cascades: deletes associated tasks
milestoneService.getMilestones()
milestoneService.getPageMilestoneSummary()        // returns PageMilestoneSummary[]
milestoneService.updateMilestoneProgress(id)      // recalculates % from task counts
milestoneService.getMilestonesEndingOnDate(date)
milestoneService.getNextActiveMilestone()
milestoneService.getUpcomingActiveMilestones(n)
```

## Progress Auto-Update
`updateMilestoneProgress(id)` is called automatically by `taskService` whenever tasks are added, completed, or deleted. Don't call it manually unless recalculating on demand.

## Dependencies
- **Depends on**: tasks (task counts for progress, cascade delete)
- **Depended on by**: calendar, dashboard, settings
