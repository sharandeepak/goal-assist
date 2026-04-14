# Architecture

**Analysis Date:** 2026-04-15

## Pattern Overview

**Overall:** Layered modular architecture with feature-driven domain separation and centralized shared layer.

**Key Characteristics:**
- Feature-module isolation: Each feature (`tasks`, `milestones`, `auth`, etc.) owns its domain logic, components, and data access
- Clean separation: Business logic (`services/`), data access (`repository/`), and UI (`components/`) never mixed
- Centralized auth and validation: Single source of truth for authentication (`AuthProvider`), types (`src/common/types/`), and errors (`AppError`)
- Next.js App Router: Server-first routing with `app/` directory; thin route handlers delegate to feature services
- Supabase + RLS: Multi-tenant database with Row-Level Security policies ensuring workspace isolation
- Real-time subscriptions: Supabase real-time channels for live task and milestone data sync

## Layers

**Presentation Layer (app/ and features/*/components/):**
- Purpose: User interface and user interaction
- Location: `app/{route}/page.tsx` for route-level pages; `src/features/{feature}/components/` for feature-specific UI
- Contains: React components (typically client-side, marked with `"use client"`), form handling, state management via React Query
- Depends on: Services (`@/features/{feature}/services`), hooks (`@/common/hooks`), UI primitives (`@/common/ui`)
- Used by: Next.js routing system, direct user interactions

**Service Layer (features/*/services/):**
- Purpose: Business logic, validation, data orchestration, cross-feature coordination
- Location: `src/features/{feature}/services/{featureName}Service.ts`
- Contains: CRUD operations, validation rules, error handling with `AppError`, inter-feature calls (e.g., `taskService` calls `milestoneService.updateMilestoneProgress()`)
- Depends on: Repository layer, `AppError` for standardized error handling, dependent feature services
- Used by: Route handlers, client components via React Query mutations

**Repository Layer (features/*/repository/):**
- Purpose: Data access abstraction and Supabase queries
- Location: `src/features/{feature}/repository/{featureName}Repository.ts` (interface) + `supabase{FeatureName}Repository.ts` (implementation)
- Contains: Supabase `.select()`, `.insert()`, `.update()` calls; real-time subscription setup; workspace scoping via RLS
- Depends on: Supabase client (`@/common/lib/supabase`), database types (`Database` from generated `database.types.ts`)
- Used by: Service layer exclusively

**Domain Types (src/common/types/):**
- Purpose: Shared TypeScript definitions for all features
- Location: `src/common/types/index.ts` (primary), `src/common/types/database.types.ts` (Supabase-generated)
- Contains: `SupabaseTask`, `SupabaseMilestone`, `SupabaseUser`, `SupabaseWorkspace`, `AuthContext`, etc.
- Depends on: Supabase database types
- Used by: All layers (services, repositories, components)

**Shared Infrastructure (src/common/):**
- Purpose: Cross-cutting concerns and UI primitives
- Location: `src/common/{hooks,providers,lib,errors,ui,components,styles}`
- Contains:
  - `hooks/use-auth.ts`: `useAuth()` and `useRequiredAuth()` for auth context
  - `providers/auth-provider.tsx`: Session management, workspace switching, profile caching
  - `providers/query-provider.tsx`: TanStack React Query setup
  - `providers/theme-provider.tsx`: next-themes dark mode
  - `lib/supabase/client.ts`: Browser Supabase client
  - `lib/supabase/server.ts`: Server-side Supabase client
  - `errors/AppError.ts`: Central error class with static factories (`.badRequest()`, `.notFound()`, `.conflict()`, `.internal()`)
  - `ui/`: 52 shadcn/ui primitives (Button, Dialog, Tabs, Input, etc.)
  - `components/app-shell.tsx`: Root layout wrapper with sidebar, header, spotlight
- Used by: All features and routes

## Data Flow

**Feature-Level Request Flow (Example: Add Task):**

1. User clicks "Add Task" in planner (`app/planner/page.tsx`)
2. Component opens `TaskFormDialog` and collects form data
3. On submit, component calls `taskService.addTask(data)` via mutation handler
4. Service validates input, throws `AppError` if invalid
5. Service calls `taskRepository.addTask()` to persist to Supabase
6. Repository executes Supabase insert, returns inserted row
7. Service calls `milestoneService.updateMilestoneProgress(milestoneId)` if task has milestone
8. Milestone service recalculates progress from task counts
9. React Query cache invalidates, subscriptions fire new data
10. Components re-render with updated state
11. Optimistic updates in UI immediately show new task

**Real-Time Subscription Flow (Example: Task Updates):**

1. Component mounts in `app/planner/page.tsx`
2. `useEffect` calls `subscribeToTasksByDateRange(start, end, callback, onError)`
3. Service delegates to `taskRepository.subscribeTasks()`
4. Repository sets up Supabase real-time channel with date range filter
5. Initial query fetches tasks; callback fires with data
6. User adds/completes/deletes task in another tab or client
7. Supabase real-time broadcasts change
8. Subscription callback fires with new task list
9. Component state updates, UI re-renders
10. Return value is unsubscribe function; cleanup on unmount

**Authentication Flow:**

1. User visits app without session
2. Middleware (`middleware.ts`) checks Supabase session
3. No session → redirect to `/auth/signin`
4. User signs in via `AuthProvider` context
5. Supabase sends confirmation email with `?code=` link
6. Link points to `/auth/callback?code=...`
7. Route handler exchanges code for session
8. Redirect to `/` if user record exists, else `/onboarding`
9. `AuthProvider` refreshes user profile
10. User sees dashboard or onboarding

**State Management:**

- **Auth/Session**: `AuthProvider` (context + localStorage cache)
- **App Data**: React Query (TanStack) with automatic refetching and background sync
- **Real-time**: Supabase subscriptions (push to cache/state)
- **UI Local State**: Component `useState` for form values, tab selection, dialog open/closed
- **Workspace Scoping**: `useRequiredAuth()` returns `{ userId, workspaceId }` for all queries; RLS policies enforce

## Key Abstractions

**AppError:**
- Purpose: Standardized error class for all features
- Examples: `src/common/errors/AppError.ts`
- Pattern: Static factories with HTTP status codes
  ```typescript
  throw AppError.badRequest("TASK_TITLE_REQUIRED", "Task title is required."); // 400
  throw AppError.notFound("TASK_NOT_FOUND", "Task not found."); // 404
  throw AppError.conflict("WORKSPACE_NAME_TAKEN", "..."); // 409
  throw AppError.internal("DB_ERROR", "..."); // 500
  ```

**Repository Interface:**
- Purpose: Data access contract for each feature
- Examples: `src/features/tasks/repository/taskRepository.ts`, `src/features/milestones/repository/milestoneRepository.ts`
- Pattern: Interface defines all CRUD and query methods; `supabase{Feature}Repository.ts` implements
  ```typescript
  export interface TaskRepository {
    subscribeTasks(...): () => void;
    addTask(taskData): Promise<SupabaseTask>;
    updateTask(id, data): Promise<void>;
    deleteTask(id): Promise<void>;
    // ...
  }
  ```

**Service Module Pattern:**
- Purpose: Business logic orchestration with error handling
- Examples: `src/features/tasks/services/taskService.ts`
- Pattern: Functions export public API; delegate to repository; wrap errors
  ```typescript
  export const addTask = async (data) => {
    if (!data.title) throw AppError.badRequest(...);
    try {
      const task = await repository.addTask(data);
      if (data.milestone_id) await updateMilestoneProgress(data.milestone_id);
      return task;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("FEATURE_CODE", "...");
    }
  };
  ```

**AuthContext Hook:**
- Purpose: Centralized access to authenticated user and workspace
- Examples: `src/common/providers/auth-provider.tsx`, `src/common/hooks/use-auth.ts`
- Pattern: Two hooks with different guarantees
  ```typescript
  const { authUser, user, workspace, isLoading, signOut } = useAuth();
  // May return nulls; use in loading-aware components
  
  const { userId, workspaceId } = useRequiredAuth();
  // Throws if not authenticated; use inside protected pages
  ```

**Supabase Client Abstraction:**
- Purpose: Consistent client setup for browser and server contexts
- Examples: `src/common/lib/supabase/client.ts`, `src/common/lib/supabase/server.ts`
- Pattern: Factory functions return configured clients
  ```typescript
  // In client components
  import { createClient } from "@/common/lib/supabase/client";
  const supabase = createClient();
  
  // In server components / route handlers
  import { createServerClient } from "@supabase/ssr";
  ```

## Entry Points

**Root Application Entry (`app/layout.tsx`):**
- Location: `app/layout.tsx`
- Triggers: All app requests
- Responsibilities:
  - Sets up global providers: `QueryProvider`, `ThemeProvider`, `AuthProvider`
  - Wraps with `AppShell` (layout, sidebar, header)
  - Loads fonts and global styles

**Authentication Entry (`middleware.ts`):**
- Location: `middleware.ts` at project root
- Triggers: All requests (via matcher pattern)
- Responsibilities:
  - Checks Supabase session via server-side cookie
  - Redirects unauthenticated users to `/auth/signin`
  - Redirects authenticated users without user record to `/onboarding`
  - Handles PKCE password-reset code exchange
  - Rule: Session → pass through; no session + auth route → allow; no session + app route → deny

**Route Pages (`app/{route}/page.tsx`):**
- Location: `app/{route}/page.tsx` (e.g., `app/planner/page.tsx`, `app/milestones/page.tsx`)
- Triggers: User navigation to route
- Responsibilities:
  - Thin wrapper around feature component
  - Calls `useRequiredAuth()` to enforce protection
  - Delegates all logic to `src/features/{feature}/components`

**Feature Entry Components (`src/features/{feature}/components/{Feature}.tsx`):**
- Location: `src/features/{feature}/components/{feature}.tsx` (e.g., `src/features/tasks/components/task-list.tsx`)
- Triggers: Route page renders
- Responsibilities:
  - Fetch and manage feature state via React Query / subscriptions
  - Orchestrate sub-components (lists, forms, dialogs)
  - Handle user events and call service functions

## Error Handling

**Strategy:** Centralized error class (`AppError`) with typed error codes for all features.

**Patterns:**

1. **Service Layer Validation:**
   ```typescript
   export const addTask = async (data: SupabaseTaskInsert) => {
     if (!data.title) {
       throw AppError.badRequest("TASK_TITLE_REQUIRED", "Task title is required.");
     }
     // ...
   };
   ```

2. **Repository to Service Error Wrapping:**
   ```typescript
   try {
     const task = await repository.addTask(data);
   } catch (error) {
     if (error instanceof AppError) throw error;
     throw AppError.internal("TASK_ADD_ERROR", "Failed to add task.");
   }
   ```

3. **Component Error Display:**
   - Errors stored in local state and displayed as toasts or error cards
   - Example: `app/planner/page.tsx` shows destructive card on task operation failure
   - User can retry or dismiss

4. **Async Boundary Error Handling:**
   - React `error.tsx` boundary at route level catches unexpected errors
   - Example: `app/error.tsx` provides fallback UI
   - Features render error states in components (e.g., loading error message in card)

## Cross-Cutting Concerns

**Logging:** Console-based; `console.error()` for service errors, `console.log()` for debug info. No centralized logging configured.

**Validation:**
- **Schema Validation:** Zod (React Hook Form)
- **Business Logic Validation:** Service functions check required fields and constraints before database calls
- **Database Constraints:** Supabase table constraints enforce not-null, unique, foreign key rules

**Authentication:**
- Middleware redirects to `/auth/signin` if no session
- `useRequiredAuth()` throws if user not authenticated
- Supabase RLS policies scope all data queries to authenticated user's workspace
- Session managed by `AuthProvider` (localStorage cache + Supabase client session cookies)

**Authorization:**
- Workspace scoping: All queries filtered by `workspace_id` via RLS
- User role: `users.role` field supports "admin" | "member" (not yet fully enforced in routes)
- Feature-level: No feature-specific permission gates (all authenticated users can access all features)

**Real-Time Sync:**
- Supabase real-time channels broadcast changes (subscribe → callback on change)
- React Query cache invalidation on mutations triggers re-fetch or optimistic updates
- Components clean up subscriptions on unmount

**Caching:**
- Browser localStorage: Auth profile cache (user, workspace selection)
- React Query: App data cache (auto-refetch on stale time, background sync)
- Supabase session: Stored in secure cookies

---

*Architecture analysis: 2026-04-15*
