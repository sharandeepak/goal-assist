# Feature: Tasks

## Purpose
Core task management — CRUD, date filtering, priority/urgency, milestone association, real-time subscriptions.

## Key Files
- `services/taskService.ts` — All business logic and validation
- `repository/supabaseTaskRepository.ts` — Supabase queries
- `repository/taskRepository.ts` — `TaskRepository` interface + `TaskSummaryData` type
- `components/task-summary.tsx` — Compact list for dashboard
- `components/task-form-dialog.tsx` — Create/edit dialog

## Data Model (`SupabaseTask` from `@/common/types`)
Key fields: `id`, `title`, `completed`, `date`, `completed_date`, `priority`, `urgency`, `tags`, `milestone_id`, `company_id`, `user_id`

## Service API
```ts
import * as taskService from "@/features/tasks/services/taskService";

taskService.addTask(data: SupabaseTaskInsert)           // validates title, syncs milestone progress
taskService.updateTask(id, partial)                     // forbidden: id, completed, created_at
taskService.updateTaskCompletion(id, completed, milestoneId?)  // toggles + syncs milestone
taskService.deleteTask(id, milestoneId?)
taskService.getTasksForDate(date)
taskService.getTasksByDateRange(start, end)
taskService.getTodaysTaskSummary()                      // returns TaskSummaryData
taskService.getTasksForMilestone(milestoneId)
taskService.subscribeToTasksByDateRange(start, end, cb, onError)  // returns unsubscribe fn
```

## Milestone Sync
Whenever a task is added, completed, or deleted with a `milestone_id`, the service automatically calls `updateMilestoneProgress(milestoneId)` from the milestones feature.

## Dependencies
- **Depends on**: `milestones/services/milestoneService` (progress sync)
- **Depended on by**: planner, calendar, matrix, milestones, dashboard, settings
