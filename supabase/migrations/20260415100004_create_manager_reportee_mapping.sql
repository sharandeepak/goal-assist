-- Create closure table for manager hierarchy
CREATE TABLE manager_reportee_mapping (
  manager_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reportee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  depth int NOT NULL CHECK (depth > 0),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  PRIMARY KEY (manager_id, reportee_id)
);

-- Index for "get all reportees of manager X"
CREATE INDEX idx_mrm_manager ON manager_reportee_mapping(manager_id);

-- Index for "get all managers of user X"
CREATE INDEX idx_mrm_reportee ON manager_reportee_mapping(reportee_id);

-- Index for workspace-scoped queries
CREATE INDEX idx_mrm_workspace ON manager_reportee_mapping(workspace_id);

-- Enable RLS
ALTER TABLE manager_reportee_mapping ENABLE ROW LEVEL SECURITY;

-- RLS: Workspace members can read the hierarchy
CREATE POLICY "Members can view hierarchy"
ON manager_reportee_mapping FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM users
    WHERE auth_id = auth.uid() AND status = 'active'
  )
);

-- Note: INSERT/UPDATE/DELETE handled by service role (application layer)

COMMENT ON TABLE manager_reportee_mapping IS 'Closure table for manager hierarchy - depth 1 = direct report';
