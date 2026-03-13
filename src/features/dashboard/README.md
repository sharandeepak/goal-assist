# Feature: Dashboard

## Overview
Main landing page that composes workspace-aware KPIs, insights, and execution widgets
from tasks, milestones, satisfaction, standups, and timesheet services.

## Components
- `app/page.tsx` (route entry, thin wrapper)
- `src/features/dashboard/components/dashboard-home.tsx` (homepage UI and interactions)

## Services
- `src/features/dashboard/services/dashboardSnapshotService.ts`
  - Composes typed dashboard data from:
    - tasks (`getTasksByDateRange`)
    - milestones (`getPageMilestoneSummary`)
    - satisfaction (`getSatisfactionSummary`)
    - standups (`getRecentStandups`)
    - timesheet (`getEntriesForDateRange`, `getRunningEntry`)

## Repository
- None

## Dependencies
- Depends on: tasks, milestones, satisfaction, standup, timesheet, workspace
- Depended on by: none (entry point)

## Data Model
- `DashboardSnapshot`
  - `kpis.todayCompletion` (`completed/total/%`)
  - `kpis.activeMilestones` (`count`, nearest deadline)
  - `kpis.mood` (`score`, day-over-day delta)
  - `kpis.focusTime` (today or week-to-date fallback)
  - `insights.overdueTasks` (attention-needed)
  - `insights.upcomingMilestones` (next 3)
  - `insights.standup` (recent blockers + notes)
  - `execution.todayTasks` + `execution.runningTimer`

## Placeholder-to-Product Mapping
- `Add Project` -> `Add Task` (`/planner?action=add`)
- `Import Data` -> `Log Mood` quick action (`#mood-logging`)
- `Total/Ended/Running/Pending Projects` cards -> real KPI row (tasks, milestones, mood, focus time)
- fake `Project Analytics` bars -> overdue tasks and upcoming milestone insights
- static `Reminders` meeting card -> standup blockers/notes insight
- `Project` list -> real today task execution list (toggle completion)
- fake `Time Tracker` widget -> live timer state + start/stop via timesheet flow
