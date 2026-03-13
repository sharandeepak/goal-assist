# Feature: voice-log

## Purpose
Voice recording via the Web Speech API for quick standup notes, task creation, or milestone logging. Transcribed text is stored in-memory (no persistence) and optionally dispatched to other features.

## Key Files
- `app/voice-log/page.tsx` — All component logic (stub feature, no src/features/voice-log/components yet)

## Current State
**In-memory only.** Log entries are:
```ts
{ id: string; date: Date; content: string; type: "standup" | "task" | "milestone" }
```
Entries are lost on page navigation. No repository or service exists yet.

## Browser API Used
`window.SpeechRecognition` / `window.webkitSpeechRecognition` — requires HTTPS and microphone permission. Guard with `if (typeof window !== "undefined" && "SpeechRecognition" in window)`.

## When Implementing Persistence
1. Create `services/voiceLogService.ts` — parse transcript, detect intent (task vs standup)
2. Route to `taskService.addTask()` or `standupService.addStandupLog()` based on detected type
3. Optionally create a `voice_logs` Supabase table for raw transcript history

## Dependencies
- Depends on: none (currently standalone)
- Future: tasks, standup
