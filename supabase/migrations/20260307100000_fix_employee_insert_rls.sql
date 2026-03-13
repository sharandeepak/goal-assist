-- Fix: company creators could not insert the first employee during onboarding.
-- The "Admins manage employees" policy requires an existing admin employee,
-- creating a chicken-and-egg problem for new companies.
-- Solution: allow company creators to insert employees into their company.

CREATE POLICY "Company creator can insert employee" ON public.employees
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT c.id FROM public.companies c WHERE c.creator_id = auth.uid()
    )
  );
