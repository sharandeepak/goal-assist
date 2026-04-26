-- Update accept_workspace_invitation to also return manager_id and workspace_id.
--
-- Reason: the previous flow called findInvitedUserByEmail() from the browser
-- client BEFORE invoking this RPC, in order to fetch manager_id for the
-- subsequent addManagerRelationship() call. That SELECT is blocked by RLS on
-- users when the caller has no active membership in the invited workspace yet
-- (which is the entire point of accepting an invite). By returning the needed
-- fields directly from this SECURITY DEFINER RPC, the service layer can skip
-- the pre-flight SELECT and the hierarchy step runs after the user is active.

CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(
  p_invitation_id uuid,
  p_auth_id       uuid,
  p_first_name    text DEFAULT NULL,
  p_last_name     text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation workspace_invitations%ROWTYPE;
  v_user_id    uuid;
  v_manager_id uuid;
BEGIN
  SELECT * INTO v_invitation
  FROM workspace_invitations
  WHERE id = p_invitation_id
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error',   'Invitation is invalid, expired, or already accepted'
    );
  END IF;

  SELECT id, manager_id INTO v_user_id, v_manager_id
  FROM users
  WHERE email        = lower(trim(v_invitation.email))
    AND workspace_id = v_invitation.workspace_id
    AND status       = 'invited';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error',   'Invited user record not found'
    );
  END IF;

  UPDATE users
  SET
    auth_id    = p_auth_id,
    status     = 'active',
    first_name = COALESCE(NULLIF(trim(p_first_name), ''), first_name),
    last_name  = COALESCE(NULLIF(trim(p_last_name),  ''), last_name),
    updated_at = now()
  WHERE id = v_user_id;

  UPDATE workspace_invitations
  SET status = 'accepted'
  WHERE id = p_invitation_id;

  RETURN json_build_object(
    'success',      true,
    'user_id',      v_user_id,
    'manager_id',   v_manager_id,
    'workspace_id', v_invitation.workspace_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_workspace_invitation(uuid, uuid, text, text)
  TO anon, authenticated;
