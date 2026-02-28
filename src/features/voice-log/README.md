# Feature: Voice Log

## Overview
Voice recording using Web Speech API for quick standup notes, task creation, or milestone logging.

## Components
- Page content currently in `app/voice-log/page.tsx`

## Services
- None (in-memory log storage, uses browser Speech API)

## Repository
- None

## Dependencies
- Depends on: none (standalone feature)
- Depended on by: none

## Data Model
- In-memory log entries: { id, date, content, type }
