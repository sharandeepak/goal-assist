-- ==================== NEW TABLES ====================

create table public.companies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  creator_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.employees (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete set null,
  first_name text not null,
  last_name text,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member', 'manager')),
  status text not null default 'invited' check (status in ('invited', 'active')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_id, email)
);

-- ==================== ALTER EXISTING TABLES ====================

alter table public.tasks
  add column company_id uuid references public.companies(id) on delete cascade,
  add column employee_id uuid references public.employees(id) on delete cascade;

alter table public.milestones
  add column company_id uuid references public.companies(id) on delete cascade,
  add column employee_id uuid references public.employees(id) on delete cascade;

alter table public.satisfaction_logs
  add column company_id uuid references public.companies(id) on delete cascade,
  add column employee_id uuid references public.employees(id) on delete cascade;

alter table public.standup_logs
  add column company_id uuid references public.companies(id) on delete cascade,
  add column employee_id uuid references public.employees(id) on delete cascade;

alter table public.time_entries
  add column company_id uuid references public.companies(id) on delete cascade,
  add column employee_id uuid references public.employees(id) on delete cascade;

-- ==================== DROP OLD INDEXES ====================

drop index if exists idx_tasks_user_date;
drop index if exists idx_tasks_user_milestone;
drop index if exists idx_tasks_user_completed;
drop index if exists idx_tasks_user_created;
drop index if exists idx_milestones_user;
drop index if exists idx_milestones_user_status;
drop index if exists idx_satisfaction_user_date;
drop index if exists idx_standup_user_date;
drop index if exists idx_time_user_day;
drop index if exists idx_time_user_task;
drop index if exists idx_time_running;

-- ==================== NEW INDEXES ====================

-- companies
create index idx_companies_creator on public.companies(creator_id);

-- employees
create index idx_employees_company on public.employees(company_id);
create index idx_employees_user on public.employees(user_id) where user_id is not null;
create index idx_employees_company_email on public.employees(company_id, email);

-- tasks
create index idx_tasks_company_employee_date on public.tasks(company_id, employee_id, date);
create index idx_tasks_company_employee_milestone on public.tasks(company_id, employee_id, milestone_id);
create index idx_tasks_company_employee_completed on public.tasks(company_id, employee_id, completed);
create index idx_tasks_company_employee_created on public.tasks(company_id, employee_id, created_at desc);

-- milestones
create index idx_milestones_company_employee on public.milestones(company_id, employee_id);
create index idx_milestones_company_employee_status on public.milestones(company_id, employee_id, status);

-- satisfaction_logs
create index idx_satisfaction_company_employee_date on public.satisfaction_logs(company_id, employee_id, log_date);

-- standup_logs
create index idx_standup_company_employee_date on public.standup_logs(company_id, employee_id, log_date);

-- time_entries
create index idx_time_company_employee_day on public.time_entries(company_id, employee_id, day);
create index idx_time_company_employee_task on public.time_entries(company_id, employee_id, task_id);
create index idx_time_running on public.time_entries(company_id, employee_id, ended_at) where ended_at is null;

-- ==================== EXTENSIBLE RLS FUNCTION ====================

create or replace function public.get_accessible_employee_ids(p_company_id uuid)
returns setof uuid as $$
begin
  -- Currently returns only the current user's employee_id in this company.
  -- Future: extend to include reportee employee_ids for managers.
  return query
    select e.id from public.employees e
    where e.company_id = p_company_id and e.user_id = auth.uid();
end;
$$ language plpgsql security definer stable;

-- ==================== DROP OLD RLS POLICIES ====================

drop policy if exists "Users manage own tasks" on public.tasks;
drop policy if exists "Users manage own milestones" on public.milestones;
drop policy if exists "Users manage own satisfaction" on public.satisfaction_logs;
drop policy if exists "Users manage own standups" on public.standup_logs;
drop policy if exists "Users manage own time entries" on public.time_entries;

-- ==================== NEW RLS POLICIES ====================

-- companies: creator can manage, employees can read
alter table public.companies enable row level security;

create policy "Company creator full access" on public.companies
  for all using (creator_id = (select auth.uid()));

create policy "Company employees can read" on public.companies
  for select using (
    id in (select e.company_id from public.employees e where e.user_id = (select auth.uid()))
  );

-- employees: company members can read, admins can manage
alter table public.employees enable row level security;

create policy "Employees read own company" on public.employees
  for select using (
    company_id in (select e.company_id from public.employees e where e.user_id = (select auth.uid()))
  );

create policy "Admins manage employees" on public.employees
  for all using (
    company_id in (
      select e.company_id from public.employees e
      where e.user_id = (select auth.uid()) and e.role = 'admin'
    )
  );

-- data tables: tenant isolation via extensible function
create policy "Tenant isolation tasks" on public.tasks
  for all using (
    employee_id in (select public.get_accessible_employee_ids(company_id))
  );

create policy "Tenant isolation milestones" on public.milestones
  for all using (
    employee_id in (select public.get_accessible_employee_ids(company_id))
  );

create policy "Tenant isolation satisfaction" on public.satisfaction_logs
  for all using (
    employee_id in (select public.get_accessible_employee_ids(company_id))
  );

create policy "Tenant isolation standups" on public.standup_logs
  for all using (
    employee_id in (select public.get_accessible_employee_ids(company_id))
  );

create policy "Tenant isolation time entries" on public.time_entries
  for all using (
    employee_id in (select public.get_accessible_employee_ids(company_id))
  );

-- ==================== UPDATE TRIGGER ====================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      concat_ws(' ', new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name')
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- updated_at triggers for new tables
create trigger companies_updated_at before update on public.companies
  for each row execute procedure public.update_updated_at();
create trigger employees_updated_at before update on public.employees
  for each row execute procedure public.update_updated_at();
