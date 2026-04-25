-- RPC: get_invitation_by_token
--
-- Bypasses RLS so that an unauthenticated (anon) user can look up a pending
-- invitation by its token when following an invite link.  The function returns
-- only the data that the invite-link page needs; it never exposes invitations
-- to arbitrary callers because a valid UUID token is required.
--
-- Returns a single JSON row on success, or NULL when no matching pending invite
-- exists (expired / already accepted / wrong token).

CREATE OR REPLACE FUNCTION get_invitation_by_token(p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'id',           wi.id,
    'workspace_id', wi.workspace_id,
    'email',        wi.email,
    'token',        wi.token,
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
  INTO v_result
  FROM workspace_invitations wi
  JOIN workspaces             w ON w.id = wi.workspace_id
  JOIN users                  u ON u.id = wi.invited_by
  WHERE wi.token = p_token;

  RETURN v_result;
END;
$$;

-- Allow the anon and authenticated roles to call this function.
GRANT EXECUTE ON FUNCTION get_invitation_by_token(uuid) TO anon, authenticated;
