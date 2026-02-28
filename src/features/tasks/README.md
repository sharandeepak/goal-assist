# Feature: Tasks

## Overview
Core task management with CRUD operations, date-based filtering, priority levels, and milestone association.

## Components
- `TaskSummary` - Compact task list for dashboard showing today's tasks
- `TaskFormDialog` - Reusable dialog for creating and editing tasks

## Services
- `taskService` - Task validation, completion toggling with date tracking, milestone progress sync

## Repository
- Collection: `tasks`
- `TaskRepository` interface with Firebase implementation

## Dependencies
- Depends on: milestones (for progress updates on task changes)
- Depended on by: planner, calendar, matrix, milestones, dashboard, settings

## Data Model
- `Task`: id, title, completed, date?, completedDate?, priority?, urgency?, tags?, milestoneId?, userId?
