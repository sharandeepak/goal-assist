-- RPC: leave_workspace
--
-- Allows the calling auth user to remove themselves from a workspace.
-- Owners (workspaces.creator_id = auth.uid()) cannot leave their own workspace.
--
-- SECURITY DEFINER because the existing "Admins manage users" RLS policy
-- restricts deletes on public.users to admins. A non-admin member leaving
-- needs to delete their own row, which RLS would otherwise block.
--
-- Returns json { success, error }.

CREATE OR REPLACE FUNCTION public.leave_workspace(p_workspace_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
  v_user_id    uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT creator_id INTO v_creator_id
  FROM public.workspaces
  WHERE id = p_workspace_id;

  IF v_creator_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Workspace not found');
  END IF;

  IF v_creator_id = auth.uid() THEN
    RETURN json_build_object(
      'success', false,
      'error',   'Workspace owners cannot leave their own workspace'
    );
  END IF;

  SELECT id INTO v_user_id
  FROM public.users
  WHERE workspace_id = p_workspace_id
    AND auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error',   'You are not a member of this workspace'
    );
  END IF;

  -- Detach direct reports so the manager hierarchy stays consistent.
  UPDATE public.users
  SET manager_id = NULL
  WHERE manager_id = v_user_id
    AND workspace_id = p_workspace_id;

  -- Delete the user row. ON DELETE CASCADE on workspace_invitations.invited_by,
  -- manager_reportee_mapping.manager_id/reportee_id, tasks.user_id,
  -- milestones.user_id, etc. cleans up dependent rows automatically.
  DELETE FROM public.users WHERE id = v_user_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_workspace(uuid) TO authenticated;
