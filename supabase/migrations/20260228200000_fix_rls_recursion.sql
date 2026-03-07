-- Fix: infinite recursion in employees/companies RLS policies.
-- The original policies queried "employees" from within employees' own RLS,
-- causing PostgreSQL to infinitely re-evaluate the same policy.
-- Solution: use SECURITY DEFINER helper functions that bypass RLS.

-- ==================== HELPER FUNCTIONS (bypass RLS) ====================

CREATE OR REPLACE FUNCTION public.get_my_company_ids()
RETURNS SETOF uuid AS $$
  SELECT e.company_id
  FROM public.employees e
  WHERE e.user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_my_admin_company_ids()
RETURNS SETOF uuid AS $$
  SELECT e.company_id
  FROM public.employees e
  WHERE e.user_id = auth.uid() AND e.role = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==================== DROP BROKEN POLICIES ====================

DROP POLICY IF EXISTS "Employees read own company" ON public.employees;
DROP POLICY IF EXISTS "Admins manage employees" ON public.employees;
DROP POLICY IF EXISTS "Company employees can read" ON public.companies;

-- ==================== RECREATE FIXED POLICIES ====================

-- employees: members can read their own company's employees
CREATE POLICY "Employees read own company" ON public.employees
  FOR SELECT USING (
    company_id IN (SELECT public.get_my_company_ids())
  );

-- employees: admins can insert/update/delete in their company
CREATE POLICY "Admins manage employees" ON public.employees
  FOR ALL USING (
    company_id IN (SELECT public.get_my_admin_company_ids())
  );

-- companies: employees can read their company
CREATE POLICY "Company employees can read" ON public.companies
  FOR SELECT USING (
    id IN (SELECT public.get_my_company_ids())
  );
