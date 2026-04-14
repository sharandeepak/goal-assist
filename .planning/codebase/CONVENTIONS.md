# Coding Conventions

**Analysis Date:** 2025-04-15

## Naming Patterns

**Files:**
- **Components**: Kebab-case with `.tsx` extension (e.g., `task-form-dialog.tsx`, `task-summary.tsx`)
- **Services**: Camel-case with `.ts` extension, always suffixed with `Service` (e.g., `taskService.ts`, `milestoneService.ts`, `authService.ts`)
- **Repositories**: Camel-case with `.ts` extension
  - Interface: `{Entity}Repository` (e.g., `taskRepository.ts` → exports `TaskRepository` interface)
  - Implementation: `supabase{Entity}Repository.ts` (e.g., `supabaseTaskRepository.ts` → exports `SupabaseTaskRepository`)
- **Styles**: Camel-case with `.ts` extension, suffixed with `.styles` (e.g., `TaskFormDialog.styles.ts`)
- **Types/Interfaces**: Capitalized in `index.ts` files (e.g., `SupabaseTask`, `AppError`)

**Functions:**
- **Service functions**: Camel-case, descriptive action verbs
  - Examples: `addTask()`, `updateTaskCompletion()`, `getTasksByDateRange()`, `subscribeToTaskSummary()`, `deleteTasksForMilestone()`
- **React component functions**: PascalCase for exported components (e.g., `TaskFormDialog()`, `TaskSummary()`)
- **Helper/utility functions**: Camel-case (e.g., `calculateDaysLeft()`, `formatDate()`, `normalizeText()`)
- **Callback functions**: Suffixed with handler name when used as props (e.g., `handleTaskToggle()`, `handleValueChange()`, `handleSubmit()`)

**Variables:**
- **State variables**: Camel-case, descriptive names
  - Examples: `formData`, `isSubmitting`, `toggleError`, `tasks`, `loading`
  - Boolean prefixes: `is*` or `has*` (e.g., `isOpen`, `isSubmitting`, `addMultipleTasks`)
- **Type-specific prefixes**: 
  - Errors: `error`, `toggleError`, `setError` (singular)
  - Loading states: `loading`, `isLoading`, `setLoading` (use `is*` or base form)
- **Constants**: All-caps with underscores (e.g., `MAX_WORKSPACES`, `SELECTED_WORKSPACE_KEY`, `PROFILE_CACHE_KEY`, `OVERDUE_LOOKBACK_DAYS`)

**Types:**
- **Database types**: Prefixed with `Supabase` (e.g., `SupabaseTask`, `SupabaseUser`, `SupabaseWorkspace`)
- **Insert/Update types**: Suffixed with operation (e.g., `SupabaseTaskInsert`, `SupabaseTaskUpdate`)
- **Domain interfaces**: Custom names without prefix (e.g., `TaskRepository`, `AuthContext`, `DashboardSnapshot`)
- **Props interfaces**: Suffixed with `Props` (e.g., `TaskFormDialogProps`)

## Code Style

**Formatting:**
- No explicit linter configured (next lint points to Next.js defaults)
- TypeScript strict mode enabled (`strict: true` in `tsconfig.json`)
- Implicit return types preferred in arrow functions when obvious
- Explicit return types required for exported functions and service methods
- Use `as const` for style object exports to preserve literal types

**Indentation:**
- Observed: Mixed indentation (2 and 4 spaces) across files
- Component files: Typically use tabs for indentation
- Configuration files: Typically use 2 spaces

**Braces & Spacing:**
- K&R style: Opening brace on same line (e.g., `if (error) {`)
- Space before opening brace in control structures
- No trailing commas in single-line constructs; trailing commas in multi-line objects/arrays are standard

**String Quotes:**
- Double quotes in JSX and general code
- Backticks for template literals and multi-line strings

## Import Organization

**Order:**
1. **External libraries** (React, Next.js, third-party packages)
   ```typescript
   import { useState, useEffect } from "react";
   import { useRouter, usePathname } from "next/navigation";
   import type { AuthChangeEvent } from "@supabase/supabase-js";
   ```

2. **Shared utilities and types** (from `@/common/`)
   ```typescript
   import { useRequiredAuth } from "@/common/hooks/use-auth";
   import type { SupabaseTask } from "@/common/types";
   import { AppError } from "@/common/errors/AppError";
   import { cn } from "@/common/lib/utils";
   ```

3. **Feature imports** (from `@/features/`)
   ```typescript
   import { subscribeToTaskSummary, updateTaskCompletion } from "@/features/tasks/services/taskService";
   import { styles } from "../styles/TaskSummary.styles";
   ```

4. **Local/relative imports** (within feature)
   ```typescript
   import type { TaskRepository } from "./taskRepository";
   ```

**Path Aliases:**
- Always use `@/` for absolute imports; never use relative `../../../` paths
- `@/common/…` for shared code
- `@/features/…` for feature-specific code
- Examples:
  - ✅ `import { Button } from "@/common/ui/button"`
  - ✅ `import { taskService } from "@/features/tasks/services/taskService"`
  - ❌ `import { Button } from "../../../common/ui/button"`

**Type Imports:**
- Use `import type` for TypeScript-only imports to reduce bundle size
- Example: `import type { SupabaseTask, TaskRepository } from "@/features/tasks/repository/taskRepository"`

## Error Handling

**Pattern:**
All errors must be wrapped using `AppError` from `@/common/errors/AppError.ts`. Never throw raw Error objects from services or repositories.

**In Services:**
```typescript
import { AppError } from "@/common/errors/AppError";

export const addTask = async (taskData: SupabaseTaskInsert): Promise<SupabaseTask> => {
  if (!taskData.title) {
    throw AppError.badRequest("TASK_TITLE_REQUIRED", "Task title is required.");
  }
  
  try {
    const task = await taskRepository.addTask(taskData);
    return task;
  } catch (error) {
    if (error instanceof AppError) throw error;  // Re-throw known errors
    throw AppError.internal("TASK_ADD_ERROR", "Failed to add task.");  // Wrap unknown errors
  }
};
```

**Factory Methods:**
- `AppError.badRequest(code, message)` → HTTP 400
- `AppError.notFound(code, message)` → HTTP 404
- `AppError.conflict(code, message)` → HTTP 409
- `AppError.internal(code, message)` → HTTP 500 (default)

**Error Codes:**
- All-caps with underscores (e.g., `TASK_TITLE_REQUIRED`, `TASK_ADD_ERROR`, `AUTH_SIGNIN_ERROR`)
- First part is feature/entity name, second is specific issue (e.g., `WORKSPACE_LIMIT_REACHED`, `MILESTONE_STATUS_REQUIRED`)

**In Components:**
```typescript
const [error, setError] = useState<string | null>(null);

try {
  await updateTaskCompletion(taskId, newCompleted, workspaceId);
} catch (err) {
  console.error("Failed to update task completion:", err);
  setError("Failed to update task.");
}
```

## Logging

**Framework:** `console` (no dedicated logging framework)

**Patterns:**
- **Error logging**: Use `console.error()` only in catch blocks when gracefully handling errors
  - Example: `console.error("Failed to update task completion from summary:", err);`
- **Debug info**: Minimal; used in auth provider for state changes (localStorage caching)
- **No info/warn logging**: Not observed in the codebase

**Guidance:**
- Log errors that are caught and handled (don't escalate)
- Don't log on happy path
- Include context: function name or action being performed

## Comments

**When to Comment:**
- **Complex business logic**: Explain the "why" not the "what"
  - Example (from middleware.ts): `// Supabase PKCE password-reset links land on the site root with ?code=&next=`
- **Non-obvious workarounds**: When a solution is counterintuitive
  - Example (from task-summary.tsx): `// Optimistic update — flip immediately`
- **Inline constants**: Explain magic values with context
  - Example: `const MAX_WORKSPACES = 5;` (no comment needed; name is clear)
  - Example: `const OVERDUE_LOOKBACK_DAYS = 180;` (no comment needed)

**When NOT to Comment:**
- Self-documenting code (clear naming)
- Simple control flow
- Standard patterns (error handling, state updates)

**JSDoc/TSDoc:**
- Not used in the codebase
- TypeScript types serve as documentation

**Comment Style:**
- Single-line: `// Comment text`
- Multi-line blocks: Observed in auth-provider for explaining logic flow
  - Example: Comments explaining cache validation logic

## Function Design

**Size:**
- Typical service functions: 5-15 lines
- Keep functions focused on single responsibility
- Extract validation into early guards (e.g., empty title check at start of `addTask`)

**Parameters:**
- Favor explicit parameters over config objects in service signatures
  - Example: `getTasksByDateRange(workspaceId, startDate, endDate)` not `getTasksByDateRange(config)`
- Use object parameters when there are 3+ related parameters
  - Example: `subscribeToTaskSummary(workspaceId, callback, onError)` (short, explicit)

**Return Values:**
- Always explicitly type return values in services (no `any`)
- Use generic types for collections: `Promise<SupabaseTask[]>` not `Promise<any>`
- Return early on error to reduce nesting:
  ```typescript
  if (!query.trim()) return [];
  try {
    return await taskRepository.searchTasksByTitle(workspaceId, query.trim());
  } catch (error) {
    // ...
  }
  ```

**Async/Await:**
- Prefer `async/await` over `.then()` chains
- Always wrap in try/catch for Supabase calls
- No unhandled promise rejections

## Module Design

**Exports:**
- Services export named functions (not default exports)
  - Example: `export const addTask = async (...) => { ... }`
- Repositories export named class instances (Supabase implementation as singleton)
  - Example: `export const supabaseTaskRepository = new SupabaseTaskRepository()`
- Types exported as named types from interface files
  - Example: `export interface TaskRepository { ... }`

**Barrel Files:**
- Not used in this codebase
- Each directory is accessed directly
- No re-exports at directory index level

**Singletons:**
- Supabase client instance cached in repository
  ```typescript
  let clientInstance: SupabaseClient<Database> | null = null;
  
  function getClient(): SupabaseClient<Database> {
    if (!clientInstance) {
      clientInstance = createClient();
    }
    return clientInstance;
  }
  ```

**Dependency Injection:**
- Used in repositories: Client injected via constructor or function parameter
- Services consume repository singletons directly
  ```typescript
  const taskRepository = supabaseTaskRepository;
  ```

## React Component Patterns

**Client Components:**
- Always include `"use client"` directive at top of file
- Use hooks for state and effects
- Keep components thin; delegate business logic to services

**Props:**
- Always define `Props` interface explicitly
  - Example: `interface TaskFormDialogProps { isOpen: boolean; onOpenChange: ...; }`
- Destructure props in function signature
  ```typescript
  export function TaskFormDialog({ isOpen, onOpenChange, onSubmit, initialData }: TaskFormDialogProps) {
  ```

**State Management:**
- Form state: `useState` with type inference
  - Example: `const [formData, setFormData] = useState<TaskFormData>({})`
- Effect dependencies: Always include complete dependency array
  ```typescript
  useEffect(() => {
    // ...
  }, [isOpen, initialData, requireUrgency]);
  ```

**Styling:**
- All inline styles as imported constants from `styles/` files
  - Example: `<div className={styles.sheetContent}>`
- Styles exported as `const styles = { ... } as const` objects
  - Enables proper type inference for className props
  - Example (TaskFormDialog.styles.ts):
    ```typescript
    export const styles = {
      sheetContent: "sm:max-w-[425px] flex flex-col h-full",
      formBody: "flex-grow py-4 space-y-6 overflow-y-auto",
      // ...
    } as const;
    ```

**Icons:**
- Use FontAwesome icons via `@fortawesome/react-fontawesome`
  - Example: `<FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4" />`

## Validation

**Input Validation:**
- Always validate at service entry points
- Use explicit type checks before operations:
  ```typescript
  if (!taskData.title) {
    throw AppError.badRequest("TASK_TITLE_REQUIRED", "Task title is required.");
  }
  if (!taskData.workspace_id) {
    throw AppError.badRequest("TASK_WORKSPACE_REQUIRED", "Workspace ID is required.");
  }
  ```
- Use form validation with React Hook Form + Zod in components (if applicable)

**Null/Undefined Handling:**
- Explicit checks: `if (!value)`, `if (!value?.field)`
- Optional chaining: `value?.property`
- Nullish coalescing: `value ?? fallback`

## Repository Pattern

**Interface:**
- Defined in `{entity}Repository.ts` (e.g., `taskRepository.ts`)
- Lists all public methods with full signatures
- Returns types are explicit (no `any`)
  ```typescript
  export interface TaskRepository {
    addTask(taskData: SupabaseTaskInsert): Promise<SupabaseTask>;
    getTasksByDateRange(workspaceId: string, startDate: Date, endDate: Date): Promise<SupabaseTask[]>;
  }
  ```

**Implementation:**
- In `supabase{Entity}Repository.ts` (e.g., `supabaseTaskRepository.ts`)
- Extends `BaseRepository<"table_name">` from `@/common/repository/base.repository.ts`
- Implements the interface
- Contains all Supabase RLS-scoped queries
- Wraps Supabase errors in AppError

**Instance:**
- Exported as singleton: `export const supabaseTaskRepository = new SupabaseTaskRepository()`

---

*Convention analysis: 2025-04-15*
