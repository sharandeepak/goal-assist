# Feature: Dashboard

## Overview
Main landing page that orchestrates summary cards and embedded components from tasks, milestones, satisfaction, calendar, and standup features.

## Components
- Page content currently in `app/page.tsx`

## Services
- None (orchestrates other feature services: taskService, milestoneService, satisfactionService)

## Repository
- None

## Dependencies
- Depends on: tasks (TaskSummary, getTodaysTaskSummary), milestones (MilestoneProgress, getPageMilestoneSummary), satisfaction (SatisfactionCalendar, getSatisfactionSummary), calendar (SmartCalendar), standup (StandupSummary)
- Depended on by: none (entry point)

## Data Model
- Composes data from: TaskSummaryData, MilestoneSummaryData, SatisfactionSummary
