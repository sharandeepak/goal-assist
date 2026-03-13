# Feature: settings

## Purpose
User preferences (theme, reminders) and data management (reset all user data). Notification reminders use the browser Notification API with a timeout-based scheduler.

## Key Files
- `services/settingsService.ts` — `SettingsService` class: `scheduleReminder()`, `clearReminder()`, data deletion orchestration
- `components/settings-page.tsx` — Settings UI

## Service API
```ts
import { settingsService } from "@/features/settings/services/settingsService";

// Browser notification reminder at a specific time (HH:mm)
await settingsService.scheduleReminder("09:00");
settingsService.clearReminder();

// Data reset — calls delete methods across all features
await settingsService.deleteAllUserData();
// Internally calls:
//   taskService.deleteAllUserTasks()
//   milestoneService.deleteAllUserMilestones()
//   satisfactionService.deleteAllUserSatisfactionLogs()
//   standupService.deleteAllUserStandupLogs()
```

## Notification Permissions
- Requests `Notification.requestPermission()` if not yet granted
- Error codes: `NOTIFICATION_NOT_SUPPORTED`, `NOTIFICATION_DENIED`
- Always check `"Notification" in window` before calling (SSR guard)

## Dependencies
- Depends on: tasks, milestones, satisfaction, standup (for data deletion)
- Depended on by: none
