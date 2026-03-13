# Feature: Matrix

## Purpose
Eisenhower Matrix view — tasks bucketed into 4 quadrants by `urgency` + `priority` with drag-and-drop reordering.

## Key Files
- `services/matrixService.ts` — Quadrant mapping logic, task bucketing
- `repository/supabaseMatrixRepository.ts` — Reads from `tasks` table (shared with tasks feature)
- `components/matrix-grid.tsx` — 2×2 layout
- `components/matrix-quadrant.tsx` — Single quadrant with task list
- `components/matrix-task-card.tsx` — Individual task card
- `components/matrix-filters.tsx` — Date range + quadrant filter controls

## Quadrant Mapping
| Quadrant | urgency | priority |
|----------|---------|----------|
| Q1 — Do First | high | high |
| Q2 — Schedule | low | high |
| Q3 — Delegate | high | low |
| Q4 — Eliminate | low | low |
| uncategorized | missing either field |

## Data Types
```ts
type QuadrantType = "q1" | "q2" | "q3" | "q4";
interface MatrixTasksData {
  q1: SupabaseTask[];
  q2: SupabaseTask[];
  q3: SupabaseTask[];
  q4: SupabaseTask[];
  uncategorized: SupabaseTask[];
}
```

## Dependencies
- **Depends on**: tasks (shared `tasks` table, uses `taskService` for CRUD)
- **Depended on by**: none (standalone view)

## Note
Matrix does not have its own task storage — it reads and mutates tasks via `taskService`. Moving a card between quadrants updates `priority`/`urgency` on the task.
