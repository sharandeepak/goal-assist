# Feature: Timesheet

## Overview

Time tracking with manual entries and a live timer, organized by day with week/month views.

## Components

- `AddEntryDialog` - Create/edit time entries (duration or time range)
- `ViewEntryDialog` - Read-only entry details
- `EntryRow` - Single time entry display
- `DayColumn` - Day view with entry list
- `WeekSelector` - Week/month navigation controls
- `GlobalTimer` - Persistent timer in the navbar

## Services

- `timeService` - Duration computation, one-timer-per-user rule, weekly aggregation

## Repository

- Collection: `timeEntries`
- `TimeRepository` interface with Firebase implementation

## Dependencies

- Depends on: none (standalone for DB; GlobalTimer is embedded in common Navbar)
- Depended on by: none

## Data Model

- `TimeEntry`: id, userId, taskId, taskTitleSnapshot, emoji?, note?, source, startedAt, endedAt, durationSec, day, createdAt, updatedAt
