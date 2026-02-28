# Feature: Matrix

## Overview
Eisenhower Matrix (urgent/important) for task prioritization with drag-and-drop between quadrants.

## Components
- `MatrixGrid` - 2x2 grid layout for the four quadrants
- `MatrixQuadrant` - Individual quadrant with task list
- `MatrixTaskCard` - Task card within a quadrant
- `MatrixFilters` - Date range and quadrant filter controls

## Services
- `matrixService` - Quadrant mapping logic, task bucketing by priority/urgency

## Repository
- Collection: `tasks` (shared with tasks feature)
- `MatrixRepository` interface with Firebase implementation

## Dependencies
- Depends on: tasks (shared collection, uses taskService for CRUD)
- Depended on by: none

## Data Model
- Uses `Task` type from common types
- `QuadrantType`: "q1" | "q2" | "q3" | "q4"
- `MatrixTasksData`: { q1: Task[], q2: Task[], q3: Task[], q4: Task[], uncategorized: Task[] }
