-- Extend SELECT and UPDATE RLS policies on tasks and milestones so that an
-- assignee can read assigned items (even when private) and edit them
-- (e.g. mark assigned tasks complete, edit assigned milestones).
-- The original workspace-scoped predicates are preserved verbatim; only an
-- additional `OR assignee_id = auth.uid()` clause is added.

-- Tasks SELECT
DROP POLICY IF EXISTS "Users can view own and public tasks" ON tasks;
CREATE POLICY "Users can view own and public tasks"
ON tasks FOR SELECT
USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  OR (
    visibility = 'public'
    AND workspace_id IN (
      SELECT workspace_id FROM users
      WHERE auth_id = auth.uid() AND status = 'active'
    )
  )
  OR assignee_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- Tasks UPDATE
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
CREATE POLICY "Users can update own tasks"
ON tasks FOR UPDATE
USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  OR assignee_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- Milestones SELECT
DROP POLICY IF EXISTS "Users can view own and public milestones" ON milestones;
CREATE POLICY "Users can view own and public milestones"
ON milestones FOR SELECT
USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  OR (
    visibility = 'public'
    AND workspace_id IN (
      SELECT workspace_id FROM users
      WHERE auth_id = auth.uid() AND status = 'active'
    )
  )
  OR assignee_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- Milestones UPDATE
DROP POLICY IF EXISTS "Users can update own milestones" ON milestones;
CREATE POLICY "Users can update own milestones"
ON milestones FOR UPDATE
USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  OR assignee_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);
