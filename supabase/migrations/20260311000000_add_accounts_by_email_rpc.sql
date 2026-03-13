-- Replaces the Next.js API route /api/auth/accounts-by-email that used
-- SUPABASE_SERVICE_ROLE_KEY. This SECURITY DEFINER function runs as the
-- function owner (bypasses RLS) but only exposes company id + name for a
-- given email — no sensitive data. Callable by anon (pre-sign-in lookup).

CREATE OR REPLACE FUNCTION public.get_accounts_by_email(p_email text)
RETURNS TABLE(company_id uuid, company_name text) AS $$
  SELECT e.company_id, c.name
  FROM public.employees e
  JOIN public.companies c ON c.id = e.company_id
  WHERE e.email = lower(trim(p_email))
    AND e.status IN ('active', 'invited');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_accounts_by_email(text) TO anon, authenticated;
