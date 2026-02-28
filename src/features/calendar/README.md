# Feature: Calendar

## Overview
Interactive calendar for viewing tasks and milestones by date, with working-day calculations and upcoming deadlines.

## Components
- `SmartCalendar` - Dashboard-embeddable calendar with task/milestone overlay

## Services
- None (uses taskService and milestoneService from their respective features)

## Repository
- None

## Dependencies
- Depends on: tasks (getTasksForDate, addTask), milestones (getMilestonesEndingOnDate, getNextActiveMilestone, getUpcomingActiveMilestones)
- Depended on by: dashboard

## Data Model
- Uses `Task` and `Milestone` types from common types
