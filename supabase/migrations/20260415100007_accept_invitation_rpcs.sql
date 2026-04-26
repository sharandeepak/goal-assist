-- RPC: accept_workspace_invitation
--
-- SECURITY DEFINER so that a user who has just signed in (or signed up) can
-- atomically activate their invited user record without being blocked by RLS.
-- The invited user's row has auth_id = NULL until this function runs, so the
-- normal "Admins manage users" policy would silently reject every UPDATE from
-- the browser client.
--
-- Returns json { success, user_id, error }.

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
BEGIN
  -- Validate invitation: must be pending and not expired
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

  -- Find the matching invited user record
  SELECT id INTO v_user_id
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

  -- Activate the user: link auth account, set status active, update name
  UPDATE users
  SET
    auth_id    = p_auth_id,
    status     = 'active',
    first_name = COALESCE(NULLIF(trim(p_first_name), ''), first_name),
    last_name  = COALESCE(NULLIF(trim(p_last_name),  ''), last_name),
    updated_at = now()
  WHERE id = v_user_id;

  -- Mark invitation accepted
  UPDATE workspace_invitations
  SET
    status     = 'accepted',
    updated_at = now()
  WHERE id = p_invitation_id;

  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_workspace_invitation(uuid, uuid, text, text)
  TO anon, authenticated;


-- RPC: get_pending_invitations_for_email
--
-- SECURITY DEFINER so that an authenticated user whose invited user record is
-- still status='invited' (auth_id = NULL) can see their pending invitations.
-- The workspace_invitations SELECT RLS policy requires active membership, which
-- blocks the query when called from the browser client in a Server Component
-- (where it runs as anon).

CREATE OR REPLACE FUNCTION public.get_pending_invitations_for_email(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id',           wi.id,
      'workspace_id', wi.workspace_id,
      'email',        wi.email,
      'role',         wi.role,
      'manager_id',   wi.manager_id,
      'invited_by',   wi.invited_by,
      'status',       wi.status,
      'created_at',   wi.created_at,
      'expires_at',   wi.expires_at,
      'workspace',    json_build_object(
                        'id',   w.id,
                        'name', w.name
                      ),
      'inviter',      json_build_object(
                        'id',         u.id,
                        'first_name', u.first_name,
                        'last_name',  u.last_name,
                        'email',      u.email
                      )
    )
  )
  INTO v_result
  FROM workspace_invitations wi
  JOIN workspaces             w ON w.id = wi.workspace_id
  JOIN users                  u ON u.id = wi.invited_by
  WHERE lower(trim(wi.email)) = lower(trim(p_email))
    AND wi.status              = 'pending'
    AND wi.expires_at          > now();

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_invitations_for_email(text)
  TO anon, authenticated;
