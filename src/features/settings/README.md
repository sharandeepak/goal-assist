# Feature: Settings

## Overview
Application settings including theme selection, reminder scheduling, and account deletion.

## Components
- `SettingsPage` - Full settings interface with theme toggle, reminders, and danger zone

## Services
- `settingsService` - Desktop notification scheduling, account deletion orchestration

## Repository
- None (orchestrates other feature services for deletion)

## Dependencies
- Depends on: tasks, milestones, satisfaction, standup (for account deletion cascade)
- Depended on by: none

## Data Model
- Uses localStorage for: reminderTime, reminderEnabled
- Uses Web Notification API for reminders
