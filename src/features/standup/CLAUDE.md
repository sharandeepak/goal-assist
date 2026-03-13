# Feature: standup

## Purpose
Daily standup log — employees record what they did yesterday, what they plan today, and any blockers. Shown as a summary on the dashboard.

## Key Files
- `services/standupService.ts` — Standup CRUD and validation
- `repository/supabaseStandupRepository.ts` — Supabase implementation
- `components/standup-summary.tsx` — Dashboard widget showing last 2 standup entries

## Data Model
```ts
// From @/common/types
SupabaseStandupLog = {
  id: string;
  company_id: string;
  employee_id: string;
  log_date: string;        // ISO date — required
  yesterday?: string;
  today?: string;
  blockers?: string;
  created_at: string;
}
```

## Service API
```ts
import * as standupService from "@/features/standup/services/standupService";

// Real-time — returns last 2 entries
standupService.subscribeToRecentStandups(callback, onError)

// Async
standupService.getRecentStandups(limit?)
standupService.addStandupLog(data: SupabaseStandupLogInsert)
standupService.deleteAllUserStandupLogs()
```

## Validation
Both `log_date` and `employee_id` are required. Error codes: `STANDUP_DATE_REQUIRED`, `STANDUP_EMPLOYEE_REQUIRED`.

## Dependencies
- Depends on: none
- Depended on by: dashboard, settings (data deletion)
