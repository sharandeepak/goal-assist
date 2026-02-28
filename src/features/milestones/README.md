# Feature: Milestones

## Overview
Goal tracking with progress bars, deadlines, urgency levels, and associated task management.

## Components
- `MilestoneProgress` - Progress bars for active milestones on dashboard
- `MilestoneSummary` - Summary card showing milestone stats

## Services
- `milestoneService` - Days-left calculation, progress tracking, auto-status transitions, validation

## Repository
- Collection: `milestones`
- `MilestoneRepository` interface with Firebase implementation

## Dependencies
- Depends on: tasks (for task counts and cascade deletion)
- Depended on by: calendar, dashboard, settings

## Data Model
- `Milestone`: id, title, description?, progress (0-100), urgency, status, startDate?, endDate?, tasks?, userId?
- `MilestoneProgressData`: extends Milestone with daysLeft
- `PageMilestoneSummary`: id, title, urgency, daysLeft
