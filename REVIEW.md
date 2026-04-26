# Code Review — `multi-employee-support` branch

**Reviewed:** 2026-04-26  
**Depth:** Deep (cross-file analysis)  
**Files Reviewed:** 22  
**Branch:** `multi-employee-support`  
**Focus:** Security, assignee logic bugs, refetch/cache invalidation

---

## Summary

This branch adds `assignee_id` to tasks and milestones, introduces new team components (`AssigneeBadge`, `AssigneePicker`), adds a React Query hook (`useWorkspaceMembers`), and ships two Supabase migrations. The core assignee validation logic in both services is sound. However, several significant issues exist across three categories:

1. **Security** — The `getMemberById` validation call in `taskService` and `milestoneService` has no workspace scope, allowing cross-workspace assignee injection. The `deleteAllTasks` repository method is a catastrophic unscoped delete. Several queries cross-workspace-pollute due to missing `workspace_id` filters.
2. **Assignee logic** — `updateTask` skips assignee validation when `assignee_id` is explicitly set to `null` (unassign), but the real bug is that clearing the assignee does NOT reset visibility, permanently leaking tasks/milestones to the workspace. The RLS UPDATE policy allows assignees to reassign tasks to arbitrary users.
3. **Data integrity** — The calendar page and milestone page perform fire-and-forget refetches after mutations (not awaited, error swallowed), meaning the UI can silently show stale data after failures. The `subscribeToTaskSummary` channel is workspace-unscoped in its realtime subscription.

---

## CRITICAL Issues

### CR-01: Cross-workspace assignee injection — `getMemberById` has no workspace_id filter

**File:** `src/features/tasks/services/taskService.ts:14-25` and `src/features/milestones/services/milestoneService.ts:16-23`

**Issue:** `validateAssigneeInWorkspace` calls `supabaseTeamRepository.getMemberById(assigneeId)` which performs a bare `.eq("id", memberId)` lookup with no `workspace_id` filter (see `supabaseTeamRepository.ts:65-81`). The validator then checks `member.workspace_id !== workspaceId` — so the intent is correct — but the fetch itself is a cross-workspace read. A user can craft a request where `assignee_id` points to a user in a *different* workspace; Supabase RLS on the `users` table may or may not block this depending on whether a SELECT policy exists on `users`. If the RLS policy allows any authenticated user to read any user row by id (a common pattern for name resolution), this validator can be bypassed by passing an id of a user in a different workspace whose `status` happens to be `active`.

More importantly, if RLS on `users` ever returns `null` for a cross-workspace id (because the policy blocks it), the validator at line 16 treats `null` as "invalid" and throws an error — but the *correct* attacker path is to find a user who *is* readable cross-workspace (e.g., via a service-role context or a permissive users policy).

**Fix:** Fetch with both `id` and `workspace_id` filters to guarantee the lookup never crosses workspace boundaries, eliminating the entire class of attack:

```ts
// In supabaseTeamRepository.ts — add a workspace-scoped lookup
async getMemberByIdInWorkspace(memberId: string, workspaceId: string): Promise<SupabaseUser | null> {
  const { data, error } = await getClient()
    .from("users")
    .select("*")
    .eq("id", memberId)
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .maybeSingle();
  if (error && error.code !== "PGRST116") throw AppError.internal("TEAM_MEMBER_ERROR", error.message);
  return data as SupabaseUser | null;
}

// Then in validateAssigneeInWorkspace (both taskService and milestoneService):
const validateAssigneeInWorkspace = async (
  assigneeId: string | null | undefined,
  workspaceId: string
): Promise<void> => {
  if (!assigneeId) return;
  const member = await supabaseTeamRepository.getMemberByIdInWorkspace(assigneeId, workspaceId);
  if (!member) {
    throw AppError.badRequest(
      "TASK_ASSIGNEE_INVALID",
      "Selected assignee is not an active member of this workspace."
    );
  }
};
```

---

### CR-02: `deleteAllTasks` performs a completely unscoped delete — no workspace_id, no user_id filter

**File:** `src/features/tasks/repository/supabaseTaskRepository.ts:314-322`

**Issue:** `deleteAllTasks` executes `.delete().neq("id", "")` — the `neq("id", "")` condition is a no-op filter that matches every row. Without a `workspace_id` or `user_id` predicate, this deletes **every task in every workspace** unless RLS is sufficiently restrictive. Even with RLS, an admin-level auth_id calling this would wipe their entire workspace. A single accidental call from the settings page would be catastrophic. The `_workspaceId` parameter on the service-level wrapper (`deleteTasksForMilestone`) is already prefixed with an underscore indicating it was intentionally ignored — the same neglect applies here.

**Fix:**

```ts
async deleteAllTasks(workspaceId: string): Promise<void> {
  if (!workspaceId) throw AppError.badRequest("TASK_WORKSPACE_REQUIRED", "Workspace ID required.");
  try {
    const { error } = await this.table.delete().eq("workspace_id", workspaceId);
    if (error) throw AppError.internal("TASK_DELETE_ALL_ERROR", error.message);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("TASK_DELETE_ALL_ERROR", "Failed to delete all tasks.");
  }
}
```

Update the interface in `taskRepository.ts` and the service wrapper accordingly.

---

### CR-03: RLS UPDATE policy allows an assignee to reassign a task to any arbitrary user

**File:** `supabase/migrations/20260427000001_assignee_rls.sql:25-31`

**Issue:** The Tasks UPDATE policy allows `assignee_id IN (SELECT id FROM users WHERE auth_id = auth.uid())` — meaning any assignee can update *any column* on the task, including `assignee_id` itself. An assignee can therefore reassign the task to a third party (even to `user_id` of another workspace member if they know the UUID), change `visibility`, change `title`, or change `priority`. There is no `WITH CHECK` clause to restrict what values can be written.

**Fix:** Add a `WITH CHECK` clause that prevents an assignee from escalating their own privilege or reassigning to arbitrary users:

```sql
CREATE POLICY "Users can update own tasks"
ON tasks FOR UPDATE
USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  OR assignee_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
)
WITH CHECK (
  -- Only the task owner can change the assignee or workspace_id
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  -- Assignee can only update completion, date, and priority (not structural fields)
  OR (
    assignee_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    AND workspace_id = workspace_id  -- unchanged
    AND user_id = user_id            -- unchanged
  )
);
```

A more robust approach is to create separate policies for owner-writes vs. assignee-writes, or handle assignee-specific mutations through service-role RPC functions that enforce column-level restrictions.

---

### CR-04: Milestones UPDATE RLS policy is also missing `WITH CHECK` — same escalation risk

**File:** `supabase/migrations/20260427000001_assignee_rls.sql:48-55`

**Issue:** Same structural problem as CR-03 but for milestones. An assignee can update `user_id`, `workspace_id`, `visibility`, or reassign to another member.

**Fix:** Mirror the fix from CR-03 for the milestones UPDATE policy.

---

## HIGH Issues

### HI-01: Clearing `assignee_id` (unassign) never resets `visibility` — tasks/milestones are permanently leaked to the workspace

**File:** `src/features/tasks/services/taskService.ts:132-142` and `src/features/milestones/services/milestoneService.ts:153-161`

**Issue:** When a task is assigned to another user, `visibility` is auto-flipped to `"public"`. However, when `assignee_id` is set back to `null` (unassign), neither service resets `visibility` to `"private"`. The condition in `updateTask` at line 133 reads `if (dataToUpdate.assignee_id !== undefined && dataToUpdate.assignee_id !== null)` — it deliberately skips the `null` case. Result: once a task has ever been assigned to someone else, it permanently remains `"public"` even after unassigning. The same gap exists in `milestoneService.updateMilestone` at line 153.

**Fix:**

```ts
// In updateTask — handle the null (unassign) case:
if (dataToUpdate.assignee_id !== undefined) {
  if (dataToUpdate.assignee_id !== null) {
    const existing = await taskRepository.getTaskById(taskId);
    if (!existing) throw AppError.notFound("TASK_NOT_FOUND", `Task ${taskId} not found.`);
    await validateAssigneeInWorkspace(dataToUpdate.assignee_id, existing.workspace_id);
    if (dataToUpdate.assignee_id !== existing.user_id) {
      dataToUpdate.visibility = "public";
    }
  } else {
    // Unassigning — revert visibility to private only if it was auto-promoted
    // (leave it public if the user explicitly set it public via the toggle)
    // At minimum, document the intentional choice here.
    // If auto-revert is desired:
    // dataToUpdate.visibility = "private";
  }
}
```

At a minimum, this must be a deliberate, documented decision. Currently it is an unintentional omission that leaks data.

---

### HI-02: `subscribeToTaskSummary` realtime channel subscribes to ALL task changes regardless of workspace

**File:** `src/features/tasks/repository/supabaseTaskRepository.ts:53-76`

**Issue:** `subscribeTaskSummary` calls `this.subscribe("*", callback)` without filtering the realtime subscription by `workspace_id`. The `BaseRepository.subscribe` method likely sets up a Postgres Changes listener on the whole `tasks` table. This means any change to any task in any workspace (by any user) will trigger a re-fetch for this component. In a multi-tenant environment, this is a cross-tenant data visibility issue: the re-fetch correctly scopes the query to `workspace_id`, so no data leaks in the final result, but the trigger itself is workspace-unscoped, causing unnecessary re-fetches. More critically, if `BaseRepository.subscribe` returns data in the callback payload, that payload could contain another workspace's task row.

**Fix:** Use a filtered realtime channel with `filter: \`workspace_id=eq.${workspaceId}\`` to restrict the subscription trigger.

---

### HI-03: `updateTask` service skips assignee validation when `workspace_id` is not loaded for update-without-assignee-change path

**File:** `src/features/tasks/services/taskService.ts:133-141`

**Issue:** `updateTask` only fetches the existing task (`getTaskById`) when `assignee_id` is being changed. But the service accepts arbitrary fields including `workspace_id` in the `dataToUpdate` object (the type `Partial<Omit<SupabaseTask, "id" | "completed" | "created_at" | "milestone_id">>` allows `workspace_id` updates). A caller could move a task to another workspace by updating `workspace_id` directly. The forbidden fields list at line 121 does not include `workspace_id`.

**Fix:** Add `"workspace_id"` and `"user_id"` to the `forbiddenFields` array:

```ts
const forbiddenFields: (keyof SupabaseTask)[] = ["id", "completed", "created_at", "workspace_id", "user_id"];
```

---

### HI-04: `AssigneePicker` renders `invited` users in `AssigneeBadge` but filters them out in picker — inconsistency enables phantom assignments

**File:** `src/features/team/components/assignee-picker.tsx:83-86` vs `src/features/team/repository/supabaseTeamRepository.ts:44`

**Issue:** `getWorkspaceMembers` returns users with both `"active"` and `"invited"` status. `AssigneePicker` filters to only `m.status === "active"` members (line 84), so invited-but-not-yet-activated members cannot be selected in the picker. However, `AssigneeBadge` does no such filter — it resolves the name from the full `data` array including `invited` members. This inconsistency means:

1. If an `invited` user was previously assignable (e.g., data was saved before the filter was added), the badge shows their name.  
2. The `validateAssigneeInWorkspace` in the service also checks `member.status !== "active"` and would reject the assignment at the API layer — so the picker-level filter is the only guard.

But there is a timing gap: between when a user is invited (status = `invited`) and when they accept (status = `active`), they cannot be assigned via the picker, but if an id slips through any other path, the service rejects it. This is correct behavior — but it should be documented and the badge should visually indicate "pending" status differently from "unknown" status.

---

## MEDIUM Issues

### ME-01: Calendar page `handleAddTaskSubmit` fires a fire-and-forget refetch that silently fails

**File:** `app/calendar/page.tsx:177-183`

**Issue:** After `await addTask(taskToAdd)` succeeds, the dialog closes and then:

```ts
getTasksForDate(workspaceId, date)
  .then(setSelectedDateTasks)
  .catch((err) => {
    console.error("Error refetching tasks after add:", err);
    setError("Failed to refresh tasks after adding.");
  });
fetchUpcoming(); // not awaited either
```

`getTasksForDate(...)` and `fetchUpcoming()` are both fire-and-forget. If the refetch fails, the `setError` in the catch is called *after* `setIsAddTaskDialogOpen(false)` has already closed the dialog, and the user sees the error banner for a stale-data condition they can't easily correlate with the task-add action. More subtly, `fetchUpcoming()` has no `.catch()` at the call site here — its internal error handling sets its own error state, but the calendar page's error concatenation logic (`setError((prev) => prev + " Failed to...")`) will produce compound error messages.

**Fix:** Use `await` inside the try block, or use a single merged re-fetch:

```ts
try {
  await addTask(taskToAdd);
  setIsAddTaskDialogOpen(false);
  await Promise.all([
    getTasksForDate(workspaceId, date).then(setSelectedDateTasks),
    fetchUpcoming(),
  ]);
} catch (err) {
  throw err instanceof Error ? err : new Error("Failed to add task.");
}
```

---

### ME-02: Milestone page `handleAddTaskSubmit` and `handleUpdateTaskSubmit` use fire-and-forget refetches

**File:** `app/milestones/page.tsx:285-290` and `app/milestones/page.tsx:315-318`

**Issue:** After `await addTask(taskToAdd)` succeeds on line 285, the local task list is refreshed via:

```ts
getTasksForMilestone(workspaceId, milestone.id)
  .then(setTasks)
  .catch(() => setTaskError("Failed to refresh tasks after add."));
```

This is fire-and-forget. If this promise rejects between the task being added and the list being updated, `setTasks` is never called — the user's task list is stale (shows the old list without the new task) and only `setTaskError` is set, overwriting any previous task error. The same pattern appears in `handleUpdateTaskSubmit` (line 315-318) and `handleDeleteTask` (line 357-359). These should all be awaited or handled with explicit loading state.

**Fix:** Make all post-mutation refetches synchronous within the try block, or add explicit loading state around the refetch.

---

### ME-03: `milestoneService.updateMilestone` strips `progress` from update payload but does not prevent the caller from passing `status: "completed"` manually, bypassing the automatic progress-based transition

**File:** `src/features/milestones/services/milestoneService.ts:132-137`

**Issue:** The forbidden fields list includes `"progress"` and `"start_date"`, correctly preventing manual progress manipulation. However, `status` is not forbidden — a UI caller can set `status: "completed"` on a milestone that is 0% complete. The milestone-card edit form in `app/milestones/page.tsx:400-409` allows selecting "Completed" status from a dropdown. This bypasses the automatic `progress === 100 → status = "completed"` logic in `updateMilestoneProgress`, creating inconsistent state (a "completed" milestone with 0% progress shown in the UI).

**Fix:** Either prohibit manual `status` transitions to `"completed"` when `progress < 100`, or recalculate progress after a status change to `"completed"` by setting `progress: 100` automatically:

```ts
if (dataToUpdate.status === "completed") {
  dataToUpdate.progress = 100; // but 'progress' is in forbidden list!
}
```

This requires removing `"progress"` from the forbidden list when it is being set as a consequence of a status transition, or moving the status-change logic entirely to the service.

---

### ME-04: `useWorkspaceMembers` caches for 60 seconds — stale assignee shown immediately after a member is removed

**File:** `src/features/team/hooks/use-workspace-members.ts:13-19`

**Issue:** `staleTime: 60_000` means the workspace members list is cached for up to 60 seconds. If a member is removed from the workspace (via the team management UI), any `AssigneeBadge` or `AssigneePicker` elsewhere in the app will continue showing that removed member for up to 60 seconds. More critically, the `AssigneePicker` will still offer the removed member as a valid assignment target for up to 60 seconds, and the user can select them. The service-level `validateAssigneeInWorkspace` will catch this at the DB layer, but only after a failed submit — the UX is poor and confusing.

**Fix:** When a member is removed via the settings/team page, explicitly invalidate `["workspace-members", workspaceId]` in the React Query cache. Alternatively, reduce `staleTime` for this query or use a subscription instead of polling.

---

### ME-05: `milestoneService.updateMilestone` forbids `start_date` updates but the Supabase `Update` type allows it — schema/service contract mismatch

**File:** `src/features/milestones/services/milestoneService.ts:132`

**Issue:** `start_date` is in the `forbiddenFields` list and gets silently deleted from `dataToUpdate`. However, nothing in the TypeScript type system enforces this — callers receive no compile-time error if they pass `start_date`. The field is silently dropped, which could confuse callers. Additionally, the `SupabaseMilestoneUpdate` type (from `database.types.ts:190`) includes `start_date` as a valid update field. This mismatch between what the type system allows and what the service accepts can lead to hard-to-debug silent data loss.

**Fix:** Create a narrower update DTO type that excludes forbidden fields, or at minimum add a JSDoc warning to the function signature.

---

### ME-06: `app/matrix/page.tsx` `handleUpdateTaskSubmit` uses `as any` to suppress type errors on `initialData`

**File:** `app/matrix/page.tsx:275`

**Issue:**

```tsx
<TaskFormDialog ... initialData={initialDataForAdd as any} .../>
```

The `as any` cast on line 275 suppresses TypeScript's type check on `initialData`. `initialDataForAdd` has type `{ priority: string, urgency: string } | undefined`, which doesn't match `Task | Partial<Pick<Task, "date" | "priority" | "urgency">> | null`. While the cast works at runtime, it prevents TypeScript from catching if the `TaskFormDialogProps.initialData` type changes in the future. The downstream effect is that `TaskFormDialog` internally checks `if ("title" in initialData)` to determine if it's a full edit vs. a new task — if `initialDataForAdd` accidentally gained a `title` field, this branch logic would break silently.

**Fix:** Type `initialDataForAdd` correctly:

```ts
const initialDataForAdd: Partial<Pick<Task, "priority" | "urgency">> | null =
  prefilledPriority && prefilledUrgency
    ? { priority: prefilledPriority, urgency: prefilledUrgency }
    : null;
```

---

### ME-07: `TaskFormDialog` `handleSubmit` function is recreated on every render but referenced in a `useEffect` dependency array via closure, causing stale closure risk

**File:** `src/features/tasks/components/task-form-dialog.tsx:136-151`

**Issue:** The `handleSubmit` function at line 93 is an inner function, not memoized with `useCallback`. The `useEffect` at line 136-151 uses `handleSubmit` in its dependency array. Since `handleSubmit` is recreated on every render (it closes over `formData`, `tagsString`, `isSubmitting`, etc.), this effect re-registers the keydown listener on every render. While React correctly removes and re-adds the listener, at high re-render rates (e.g., while the user is typing) this could briefly leave the old listener active between renders, leading to double-submission if the user hits Ctrl+Enter during a rapid re-render cycle. The ESLint react-hooks/exhaustive-deps rule likely flags this.

**Fix:** Wrap `handleSubmit` in `useCallback` with proper dependencies, or move the keyboard listener setup inside the same callback:

```ts
const handleSubmit = useCallback(async () => {
  // ... existing body
}, [formData, tagsString, onSubmit, requireUrgency, addMultipleTasks, onOpenChange]);
```

---

## LOW Issues

### LO-01: `AssigneeBadge` always renders (even when `assigneeId` is `null`) causing per-task API calls on every list render

**File:** `src/features/team/components/assignee-badge.tsx:43-44`

**Issue:** `AssigneeBadge` unconditionally calls `useWorkspaceMembers(workspaceId)` regardless of whether `assigneeId` is `null`. In `task-summary.tsx` (line 142-149), every task in the list renders an `AssigneeBadge`, even unassigned ones. React Query deduplicates these calls via the shared cache key, so there is no waterfall — but each badge component does mount and call the hook. For unassigned tasks (`assigneeId === null`), the result of the hook is unused. This is a minor inefficiency but also means the component always shows a loading skeleton for unassigned tasks while members are first fetched, even though the result will always be the "Unassigned" placeholder.

**Fix:** Optionally short-circuit the hook when `assigneeId` is `null`:

```ts
// Early return before the hook call is architecturally awkward with hooks rules.
// Instead, pass a conditional workspaceId:
const { data, isLoading } = useWorkspaceMembers(assigneeId === null ? null : workspaceId);
// useWorkspaceMembers already handles null workspaceId via `enabled: !!workspaceId`
```

---

### LO-02: `app/milestones/page.tsx` `MilestoneCard` casts `milestone` with a type assertion to access `assignee_id`

**File:** `app/milestones/page.tsx:241`

**Issue:**

```ts
assignee_id: (milestone as Milestone & { assignee_id?: string | null }).assignee_id ?? null,
```

`Milestone` is a type alias for `SupabaseMilestone` (from `index.ts:91`), and `SupabaseMilestone` is `Database["public"]["Tables"]["milestones"]["Row"]`. Per `database.types.ts:162`, `milestones.Row` already includes `assignee_id: string | null`. So the cast `as Milestone & { assignee_id?: string | null }` is redundant — `milestone.assignee_id` is already typed. This means either `database.types.ts` was updated to include `assignee_id` but the component was not updated to trust the type, or there was a period where the type was missing and this workaround was added. The cast should be removed.

**Fix:**

```ts
assignee_id: milestone.assignee_id ?? null,
```

---

### LO-03: `calculateWorkingDays` in `app/calendar/page.tsx` has a redundant double-termination condition in the while loop

**File:** `app/calendar/page.tsx:24-35`

**Issue:** The `while (currentDate < endDate)` loop already stops when `currentDate >= endDate`. The inner `break` at line 31-33 (`if (startOfDay(currentDate) >= startOfDay(endDate)) break`) fires on the same iteration that `currentDate.setDate(...)` pushes `currentDate` past `endDate`, which means the while condition would have caught it on the next iteration anyway. The inner break is dead code in most cases and adds confusion.

---

### LO-04: `app/milestones/page.tsx` error state for "add milestone" is shared with the global page error state

**File:** `app/milestones/page.tsx:584-588` and `699-700`

**Issue:** A single `error` state variable is used both for global page errors (milestone load failure) and for form validation inside the "Add Milestone" sheet. When `handleAddMilestone` sets `setError("Milestone title cannot be empty.")` and the sheet is open, the error also appears in the global error banner (line 909) because both render `{error && ...}`. The sheet conditionally hides the banner with `!newMilestoneOpen` (line 909), but the condition is inverted for close — if the sheet is closed and the error was set inside it, the error banner appears on the main page. These error states should be separated.

**Fix:** Use the already-present `addMilestoneError` state (line 586) for form validation errors, and reserve `error` for page-level failures only. (The sheet render at line 890 already uses `{error && ...}` inside the sheet — switch that to `addMilestoneError`.)

---

### LO-05: `TODO` comment in production code — `confirm()` dialog flagged for replacement but never actioned

**File:** `app/milestones/page.tsx:719`

**Issue:**

```ts
// TODO: Replace confirm with Shadcn Alert Dialog
const confirmDelete = confirm(`Are you sure you want to delete this milestone?...`);
```

`confirm()` is a browser-blocking dialog that cannot be styled, is inaccessible on some platforms (mobile), and is blocked in some iframe contexts. This is a known debt item that is still in the file.

---

### LO-06: `getTeamMembers` in `teamService.ts` fetches all members including `invited` status — AssigneePicker double-filters

**File:** `src/features/team/services/teamService.ts:45-47` and `src/features/team/components/assignee-picker.tsx:83-86`

**Issue:** `getTeamMembers` delegates to `getWorkspaceMembers` which returns users with `status IN ('active', 'invited')`. The `AssigneePicker` then filters `.filter((m) => m.status === "active")`. This means the React Query cache always holds both `active` and `invited` members — useful for the team management page — but the `AssigneePicker` silently discards invited members in the render. If the team management page ever needs to query "only active" members, there is no dedicated service method, encouraging callers to re-filter the cached data inconsistently.

**Fix:** Consider adding a `getActiveTeamMembers` service method, or document clearly that `getTeamMembers` returns all statuses and filtering is the caller's responsibility.

---

## Refetch / Cache Invalidation Summary

The application does not use TanStack React Query mutations (`useMutation`) for task/milestone writes — it uses plain `async` event handlers that call service functions directly. This means there is no automatic query cache invalidation after mutations. The current approach relies on Supabase Realtime subscriptions (`subscribe()` calls in the repositories) to trigger re-fetches. This works when the subscription is active, but creates the following gaps:

| Mutation | Invalidation mechanism | Gap |
|---|---|---|
| `addTask` (calendar page) | Manual `getTasksForDate().then(setTasks)` + `fetchUpcoming()` | Both fire-and-forget (ME-01) |
| `addTask` (milestones page) | Manual `getTasksForMilestone().then(setTasks)` | Fire-and-forget (ME-02) |
| `updateTask` (milestones page) | Manual `getTasksForMilestone().then(setTasks)` | Fire-and-forget (ME-02) |
| `deleteTask` (milestones page) | Optimistic remove + refetch on error | Refetch on error is fire-and-forget (ME-02) |
| `addTask` / `updateTask` / `deleteTask` (matrix page) | Realtime subscription via `subscribeToMatrixTasks` | Correct — realtime handles it |
| `addMilestone` (milestones page) | Realtime subscription via `subscribeToMilestonesByStatus` | Correct — realtime handles it |
| `updateMilestone` (milestones page) | Realtime subscription | Correct |
| `deleteMilestone` (milestones page) | Realtime subscription | Correct |
| Task completion toggle (task-summary, planner) | Optimistic update + revert on error | Correct pattern |

The matrix and planner pages are well-handled via realtime subscriptions. The calendar and milestones pages have specific fire-and-forget gaps documented in ME-01 and ME-02.

---

_Reviewed: 2026-04-26_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: deep_
