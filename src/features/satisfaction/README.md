# Feature: Satisfaction

## Overview

Tracks daily mood/satisfaction scores on a 1-10 scale with calendar visualization and trend charts.

## Components

- `SatisfactionTracker` - Displays recent satisfaction scores
- `SatisfactionCalendar` - Monthly calendar heatmap for satisfaction entries
- `SatisfactionChart` - Line chart showing satisfaction trends over time

## Services

- `satisfactionService` - Validation, one-per-day upsert logic, score change calculation

## Repository

- Collection: `satisfaction_logs`
- `SatisfactionRepository` interface with Firebase implementation

## Dependencies

- Depends on: none (standalone feature)
- Depended on by: dashboard, settings (for account deletion)

## Data Model

- `SatisfactionLog`: id, date, score (1-10), notes?, userId?
- `SatisfactionSummary`: currentScore, change
