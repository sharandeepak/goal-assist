-- Drop existing FOR ALL policies on tasks and milestones
DROP POLICY IF EXISTS "Tenant isolation tasks" ON tasks;
DROP POLICY IF EXISTS "Tenant isolation milestones" ON milestones;

-- Tasks SELECT policy: own tasks OR public tasks in same workspace
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
);

-- Tasks INSERT: owners only
CREATE POLICY "Users can insert own tasks"
ON tasks FOR INSERT
WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Tasks UPDATE: owners only
CREATE POLICY "Users can update own tasks"
ON tasks FOR UPDATE
USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Tasks DELETE: owners only
CREATE POLICY "Users can delete own tasks"
ON tasks FOR DELETE
USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Milestones SELECT policy: own milestones OR public milestones in same workspace
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
);

-- Milestones INSERT: owners only
CREATE POLICY "Users can insert own milestones"
ON milestones FOR INSERT
WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Milestones UPDATE: owners only
CREATE POLICY "Users can update own milestones"
ON milestones FOR UPDATE
USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Milestones DELETE: owners only
CREATE POLICY "Users can delete own milestones"
ON milestones FOR DELETE
USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
