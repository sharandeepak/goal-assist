-- Add assignee_id to tasks and milestones for multi-employee assignment.
ALTER TABLE tasks
  ADD COLUMN assignee_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE milestones
  ADD COLUMN assignee_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_assignee ON tasks(workspace_id, assignee_id);
CREATE INDEX idx_milestones_assignee ON milestones(workspace_id, assignee_id);

COMMENT ON COLUMN tasks.assignee_id IS 'Workspace member the task is assigned to. NULL = unassigned.';
COMMENT ON COLUMN milestones.assignee_id IS 'Workspace member the milestone is assigned to. NULL = unassigned.';
