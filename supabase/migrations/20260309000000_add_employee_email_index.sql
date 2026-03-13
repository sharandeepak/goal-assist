-- Efficient email lookup across all companies for the accounts-by-email API.
-- The existing composite index (company_id, email) is inefficient for pure
-- email lookups across all companies; this partial index covers that case.
CREATE INDEX IF NOT EXISTS idx_employees_email
  ON public.employees(email)
  WHERE status IN ('active', 'invited');
