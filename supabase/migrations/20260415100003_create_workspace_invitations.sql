-- Create workspace_invitations table for managing team invites
CREATE TABLE workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('member', 'manager', 'admin')),
  manager_id uuid REFERENCES users(id) ON DELETE SET NULL,
  invited_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

-- Normalize email to lowercase
CREATE OR REPLACE FUNCTION normalize_invitation_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email = lower(trim(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_normalize_invitation_email
  BEFORE INSERT OR UPDATE ON workspace_invitations
  FOR EACH ROW EXECUTE FUNCTION normalize_invitation_email();

-- Index for checking duplicate invites
CREATE INDEX idx_workspace_invitations_lookup
  ON workspace_invitations(workspace_id, email, status);

-- Index for token lookup (invite acceptance)
CREATE INDEX idx_workspace_invitations_token
  ON workspace_invitations(token) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- RLS: Members can view invitations in their workspace
CREATE POLICY "Members can view workspace invitations"
ON workspace_invitations FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM users
    WHERE auth_id = auth.uid() AND status = 'active'
  )
);

-- RLS: Admins can invite anyone, managers can invite members only
CREATE POLICY "Authorized users can create invitations"
ON workspace_invitations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid()
      AND workspace_id = workspace_invitations.workspace_id
      AND status = 'active'
      AND (
        role = 'admin'
        OR (role = 'manager' AND workspace_invitations.role = 'member')
      )
  )
);

-- RLS: Admins or the inviter can update/delete invitations
CREATE POLICY "Authorized users can update invitations"
ON workspace_invitations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid()
      AND workspace_id = workspace_invitations.workspace_id
      AND status = 'active'
      AND (role = 'admin' OR id = workspace_invitations.invited_by)
  )
);

CREATE POLICY "Authorized users can delete invitations"
ON workspace_invitations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid()
      AND workspace_id = workspace_invitations.workspace_id
      AND status = 'active'
      AND (role = 'admin' OR id = workspace_invitations.invited_by)
  )
);

COMMENT ON TABLE workspace_invitations IS 'Pending and historical workspace invitations';
