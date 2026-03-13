# Feature: calendar

## Purpose
Interactive calendar that overlays tasks and milestones by date. Embedded in the dashboard via `SmartCalendar`. Supports working-day calculations and upcoming deadline highlights.

## Key Files
- `components/smart-calendar.tsx` — Main embeddable calendar component
- `styles/SmartCalendar.styles.ts` — Tailwind style constants

## No Own Service/Repository
This feature has **no service or repository**. It reads data directly from:
- `taskService.getTasksForDate(date)` — tasks on a selected day
- `taskService.addTask(data)` — quick task creation from calendar
- `milestoneService.getMilestonesEndingOnDate(date)`
- `milestoneService.getNextActiveMilestone()`
- `milestoneService.getUpcomingActiveMilestones(n)`

## SmartCalendar Component Props
Used on the dashboard (`app/page.tsx`). Receives no external data — fetches internally on date selection.

## Dependencies
- Depends on: tasks, milestones
- Depended on by: dashboard
