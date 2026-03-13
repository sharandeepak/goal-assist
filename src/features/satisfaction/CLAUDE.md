# Feature: satisfaction

## Purpose
Daily mood/satisfaction tracking (score 1–10) with a 7-day rolling view, monthly calendar heatmap, and trend chart. Each user logs one score per day.

## Key Files
- `services/satisfactionService.ts` — All satisfaction logic
- `repository/supabaseSatisfactionRepository.ts` — Supabase implementation
- `components/satisfaction-tracker.tsx` — Input UI for logging today's score
- `components/satisfaction-chart.tsx` — 7-day trend line/bar chart (Recharts)
- `components/satisfaction-calendar.tsx` — Monthly calendar with score colors

## Data Model
```ts
// From @/common/types
SupabaseSatisfactionLog = {
  id: string;
  workspace_id: string;
  user_id: string;
  score: number;        // 1–10
  note?: string;
  log_date: string;     // ISO date "YYYY-MM-DD"
  created_at: string;
}

SatisfactionSummary = {
  currentScore: number | null;
  change: number | null;   // delta vs previous entry
}
```

## Service API
```ts
import * as satisfactionService from "@/features/satisfaction/services/satisfactionService";

// Real-time subscriptions
satisfactionService.subscribeToSatisfactionLogs(callback, onError)         // last 7 days
satisfactionService.subscribeToSatisfactionForMonth(year, month, cb, onError)

// Async
satisfactionService.getSatisfactionSummary()   // returns SatisfactionSummary
satisfactionService.addSatisfactionLog(data: SupabaseSatisfactionLogInsert)
satisfactionService.deleteAllUserSatisfactionLogs()
```

## Validation
- `score` is required and must be provided on insert
- Error code: `SATISFACTION_SCORE_REQUIRED`

## Dependencies
- Depends on: none
- Depended on by: dashboard, analytics, settings (data deletion)
