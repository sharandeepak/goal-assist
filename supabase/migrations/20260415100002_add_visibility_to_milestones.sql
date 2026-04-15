-- Add visibility column to milestones table
ALTER TABLE milestones ADD COLUMN visibility text NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private', 'public'));

-- Index for filtering by visibility in workspace queries
CREATE INDEX idx_milestones_visibility ON milestones(workspace_id, visibility);

COMMENT ON COLUMN milestones.visibility IS 'private = owner only, public = visible to workspace members';
