-- RPC function to atomically create a workspace and its admin user.
-- Uses SECURITY DEFINER to bypass RLS circular dependency between
-- workspaces and users tables during initial creation.

CREATE OR REPLACE FUNCTION public.create_workspace_and_user(
  p_workspace_name TEXT,
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id UUID;
  v_workspace_id UUID;
  v_user_id UUID;
  v_workspace_count INT;
BEGIN
  v_auth_id := auth.uid();
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COUNT(*) INTO v_workspace_count
  FROM public.workspaces
  WHERE creator_id = v_auth_id;

  IF v_workspace_count >= 5 THEN
    RAISE EXCEPTION 'Maximum workspace limit (5) reached';
  END IF;

  INSERT INTO public.workspaces (name, creator_id)
  VALUES (p_workspace_name, v_auth_id)
  RETURNING id INTO v_workspace_id;

  INSERT INTO public.users (workspace_id, auth_id, first_name, last_name, email, role, status)
  VALUES (v_workspace_id, v_auth_id, p_first_name, p_last_name, p_email, 'admin', 'active')
  RETURNING id INTO v_user_id;

  RETURN json_build_object(
    'workspace_id', v_workspace_id,
    'workspace_name', p_workspace_name,
    'user_id', v_user_id
  );
END;
$$;
