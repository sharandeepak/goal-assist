# Feature: Standup

## Overview
Manages daily standup logs including what was completed, planned items, and blockers.

## Components
- `StandupSummary` - Displays recent standup logs with completed tasks and quick notes

## Services
- `standupService` - Validation and business logic for standup log operations

## Repository
- Collection: `standup_logs`
- `StandupRepository` interface with Firebase implementation

## Dependencies
- Depends on: none (standalone feature)
- Depended on by: dashboard, settings (for account deletion)

## Data Model
- `StandupLog`: id, date, completed[], planned[], blockers[], notes?, userId?
