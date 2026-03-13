# Feature: timesheet

## Purpose
Time tracking with a live running timer and weekly timesheet view. Users start/stop timers linked to tasks, log time entries manually, and review totals by week.

## Key Files
- `services/timeService.ts` — Timer operations and entry management
- `repository/supabaseTimeRepository.ts` — Supabase implementation
- `components/global-timer.tsx` — Floating timer widget (running entry indicator)
- `components/day-column.tsx` — Single day column in the weekly grid
- `components/entry-row.tsx` — Individual time entry row
- `components/add-entry-dialog.tsx` — Manual time entry form
- `components/view-entry-dialog.tsx` — Entry detail/edit view

## Data Model
```ts
// From @/common/types
SupabaseTimeEntry = {
  id: string;
  workspace_id: string;
  user_id: string;
  task_id?: string;
  task_title: string;
  emoji?: string;
  milestone_id?: string;
  tags?: string[];
  note?: string;
  start_time: string;    // ISO timestamp
  end_time?: string;     // null = timer currently running
  duration?: number;     // seconds
  entry_date: string;    // "YYYY-MM-DD"
}
```

## Service API
```ts
import * as timeService from "@/features/timesheet/services/timeService";

// Real-time subscriptions
timeService.subscribeToEntriesByDateRange(userId, startDay, endDay, callback)
timeService.subscribeToRunningEntry(userId, callback)  // null when no timer running

// Timer operations
timeService.startTimer({ userId, workspaceId, taskTitle, taskId?, emoji?, milestoneId?, tags?, note? })
timeService.stopTimer(entryId)

// Manual entries
timeService.addManualEntry(data: SupabaseTimeEntryInsert)
timeService.updateEntry(id, partial: SupabaseTimeEntryUpdate)
timeService.deleteEntry(id)
```

## Timer Rules
- Only one running timer per user at a time (`end_time IS NULL`)
- `startTimer` should stop any existing running entry before creating a new one
- Duration is calculated as `end_time - start_time` in seconds when stopping

## Dependencies
- Depends on: tasks (optional task linking), milestones (optional milestone tagging)
- Depended on by: none
