-- Add visibility column to tasks table
ALTER TABLE tasks ADD COLUMN visibility text NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private', 'public'));

-- Index for filtering by visibility in workspace queries
CREATE INDEX idx_tasks_visibility ON tasks(workspace_id, visibility);

COMMENT ON COLUMN tasks.visibility IS 'private = owner only, public = visible to workspace members';
