-- Rename "companies" → "workspaces", "employees" → "users", drop legacy public.users.
-- Data is intentionally discarded; this is a clean schema reshape.

-- ==================== DROP ALL POLICIES ====================

DROP POLICY IF EXISTS "Users read own profile" ON public.users;
DROP POLICY IF EXISTS "Users update own profile" ON public.users;
DROP POLICY IF EXISTS "Company creator full access" ON public.companies;
DROP POLICY IF EXISTS "Company employees can read" ON public.companies;
DROP POLICY IF EXISTS "Employees read own company" ON public.employees;
DROP POLICY IF EXISTS "Admins manage employees" ON public.employees;
DROP POLICY IF EXISTS "Company creator can insert employee" ON public.employees;
DROP POLICY IF EXISTS "Tenant isolation tasks" ON public.tasks;
DROP POLICY IF EXISTS "Tenant isolation milestones" ON public.milestones;
DROP POLICY IF EXISTS "Tenant isolation satisfaction" ON public.satisfaction_logs;
DROP POLICY IF EXISTS "Tenant isolation standups" ON public.standup_logs;
DROP POLICY IF EXISTS "Tenant isolation time entries" ON public.time_entries;

-- ==================== DROP OLD FUNCTIONS ====================

DROP FUNCTION IF EXISTS public.get_accessible_employee_ids(uuid);
DROP FUNCTION IF EXISTS public.get_my_company_ids();
DROP FUNCTION IF EXISTS public.get_my_admin_company_ids();
DROP FUNCTION IF EXISTS public.get_accounts_by_email(text);
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ==================== DROP OLD INDEXES ====================

DROP INDEX IF EXISTS idx_companies_creator;
DROP INDEX IF EXISTS idx_employees_company;
DROP INDEX IF EXISTS idx_employees_user;
DROP INDEX IF EXISTS idx_employees_company_email;
DROP INDEX IF EXISTS idx_employees_email;
DROP INDEX IF EXISTS idx_tasks_company_employee_date;
DROP INDEX IF EXISTS idx_tasks_company_employee_milestone;
DROP INDEX IF EXISTS idx_tasks_company_employee_completed;
DROP INDEX IF EXISTS idx_tasks_company_employee_created;
DROP INDEX IF EXISTS idx_milestones_company_employee;
DROP INDEX IF EXISTS idx_milestones_company_employee_status;
DROP INDEX IF EXISTS idx_satisfaction_company_employee_date;
DROP INDEX IF EXISTS idx_standup_company_employee_date;
DROP INDEX IF EXISTS idx_time_company_employee_day;
DROP INDEX IF EXISTS idx_time_company_employee_task;
DROP INDEX IF EXISTS idx_time_running;

-- ==================== DROP COLUMNS ON DATA TABLES ====================

ALTER TABLE public.tasks
  DROP COLUMN IF EXISTS company_id,
  DROP COLUMN IF EXISTS employee_id,
  DROP COLUMN IF EXISTS user_id CASCADE;

ALTER TABLE public.milestones
  DROP COLUMN IF EXISTS company_id,
  DROP COLUMN IF EXISTS employee_id,
  DROP COLUMN IF EXISTS user_id CASCADE;

ALTER TABLE public.satisfaction_logs
  DROP COLUMN IF EXISTS company_id,
  DROP COLUMN IF EXISTS employee_id,
  DROP COLUMN IF EXISTS user_id CASCADE;

ALTER TABLE public.standup_logs
  DROP COLUMN IF EXISTS company_id,
  DROP COLUMN IF EXISTS employee_id,
  DROP COLUMN IF EXISTS user_id CASCADE;

ALTER TABLE public.time_entries
  DROP COLUMN IF EXISTS company_id,
  DROP COLUMN IF EXISTS employee_id,
  DROP COLUMN IF EXISTS user_id CASCADE;

-- ==================== DROP OLD TABLES ====================

DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ==================== CREATE NEW TABLES ====================

CREATE TABLE public.workspaces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'manager')),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, email)
);

-- ==================== ADD COLUMNS TO DATA TABLES ====================

ALTER TABLE public.tasks
  ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.milestones
  ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.satisfaction_logs
  ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.standup_logs
  ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.time_entries
  ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

-- ==================== INDEXES ====================

CREATE INDEX idx_workspaces_creator ON public.workspaces(creator_id);

CREATE INDEX idx_users_workspace ON public.users(workspace_id);
CREATE INDEX idx_users_auth ON public.users(auth_id) WHERE auth_id IS NOT NULL;
CREATE INDEX idx_users_workspace_email ON public.users(workspace_id, email);
CREATE INDEX idx_users_email ON public.users(email) WHERE status IN ('active', 'invited');

CREATE INDEX idx_tasks_workspace_user_date ON public.tasks(workspace_id, user_id, date);
CREATE INDEX idx_tasks_workspace_user_milestone ON public.tasks(workspace_id, user_id, milestone_id);
CREATE INDEX idx_tasks_workspace_user_completed ON public.tasks(workspace_id, user_id, completed);
CREATE INDEX idx_tasks_workspace_user_created ON public.tasks(workspace_id, user_id, created_at DESC);

CREATE INDEX idx_milestones_workspace_user ON public.milestones(workspace_id, user_id);
CREATE INDEX idx_milestones_workspace_user_status ON public.milestones(workspace_id, user_id, status);

CREATE INDEX idx_satisfaction_workspace_user_date ON public.satisfaction_logs(workspace_id, user_id, log_date);

CREATE INDEX idx_standup_workspace_user_date ON public.standup_logs(workspace_id, user_id, log_date);

CREATE INDEX idx_time_workspace_user_day ON public.time_entries(workspace_id, user_id, day);
CREATE INDEX idx_time_workspace_user_task ON public.time_entries(workspace_id, user_id, task_id);
CREATE INDEX idx_time_running ON public.time_entries(workspace_id, user_id, ended_at) WHERE ended_at IS NULL;

-- ==================== HELPER FUNCTIONS (SECURITY DEFINER, bypass RLS) ====================

CREATE OR REPLACE FUNCTION public.get_my_workspace_ids()
RETURNS SETOF uuid AS $$
  SELECT u.workspace_id
  FROM public.users u
  WHERE u.auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_my_admin_workspace_ids()
RETURNS SETOF uuid AS $$
  SELECT u.workspace_id
  FROM public.users u
  WHERE u.auth_id = auth.uid() AND u.role = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_accessible_user_ids(p_workspace_id uuid)
RETURNS SETOF uuid AS $$
BEGIN
  RETURN QUERY
    SELECT u.id FROM public.users u
    WHERE u.workspace_id = p_workspace_id AND u.auth_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_accounts_by_email(p_email text)
RETURNS TABLE(workspace_id uuid, workspace_name text) AS $$
  SELECT u.workspace_id, w.name
  FROM public.users u
  JOIN public.workspaces w ON w.id = u.workspace_id
  WHERE u.email = lower(trim(p_email))
    AND u.status IN ('active', 'invited');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_accounts_by_email(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_workspace_count_for_auth_user()
RETURNS integer AS $$
  SELECT count(DISTINCT u.workspace_id)::integer
  FROM public.users u
  WHERE u.auth_id = auth.uid()
    AND u.status IN ('active', 'invited');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_workspace_count_for_auth_user() TO authenticated;

-- ==================== ROW LEVEL SECURITY ====================

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace creator full access" ON public.workspaces
  FOR ALL USING (creator_id = (SELECT auth.uid()));

CREATE POLICY "Workspace members can read" ON public.workspaces
  FOR SELECT USING (
    id IN (SELECT public.get_my_workspace_ids())
  );

CREATE POLICY "Users read own workspace" ON public.users
  FOR SELECT USING (
    workspace_id IN (SELECT public.get_my_workspace_ids())
  );

CREATE POLICY "Admins manage users" ON public.users
  FOR ALL USING (
    workspace_id IN (SELECT public.get_my_admin_workspace_ids())
  );

CREATE POLICY "Workspace creator can insert user" ON public.users
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.creator_id = auth.uid()
    )
  );

CREATE POLICY "Tenant isolation tasks" ON public.tasks
  FOR ALL USING (
    user_id IN (SELECT public.get_accessible_user_ids(workspace_id))
  );

CREATE POLICY "Tenant isolation milestones" ON public.milestones
  FOR ALL USING (
    user_id IN (SELECT public.get_accessible_user_ids(workspace_id))
  );

CREATE POLICY "Tenant isolation satisfaction" ON public.satisfaction_logs
  FOR ALL USING (
    user_id IN (SELECT public.get_accessible_user_ids(workspace_id))
  );

CREATE POLICY "Tenant isolation standups" ON public.standup_logs
  FOR ALL USING (
    user_id IN (SELECT public.get_accessible_user_ids(workspace_id))
  );

CREATE POLICY "Tenant isolation time entries" ON public.time_entries
  FOR ALL USING (
    user_id IN (SELECT public.get_accessible_user_ids(workspace_id))
  );

-- ==================== TRIGGERS ====================

CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
