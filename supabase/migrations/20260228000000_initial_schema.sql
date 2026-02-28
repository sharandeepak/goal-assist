-- ==================== TABLES ====================

create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.milestones (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  progress integer default 0 check (progress >= 0 and progress <= 100),
  urgency text not null check (urgency in ('low', 'medium', 'high')),
  status text not null check (status in ('planned', 'active', 'completed', 'on_hold')),
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  completed boolean default false,
  date timestamptz,
  completed_date timestamptz,
  priority text check (priority in ('low', 'medium', 'high')),
  urgency text check (urgency in ('low', 'medium', 'high')),
  tags text[] default '{}',
  milestone_id uuid references public.milestones(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.satisfaction_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  log_date date not null,
  score integer not null check (score >= 1 and score <= 10),
  notes text,
  created_at timestamptz default now(),
  unique(user_id, log_date)
);

create table public.standup_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  log_date date not null,
  completed_items text[] default '{}',
  blockers text[] default '{}',
  planned_items text[] default '{}',
  notes text,
  created_at timestamptz default now(),
  unique(user_id, log_date)
);

create table public.time_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete set null,
  task_title_snapshot text not null,
  emoji text,
  milestone_id_snapshot uuid,
  tags_snapshot text[] default '{}',
  note text,
  source text not null check (source in ('manual', 'timer')),
  started_at timestamptz,
  ended_at timestamptz,
  duration_sec integer default 0,
  day date not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ==================== INDEXES ====================

create index idx_tasks_user_date on public.tasks(user_id, date);
create index idx_tasks_user_milestone on public.tasks(user_id, milestone_id);
create index idx_tasks_user_completed on public.tasks(user_id, completed);
create index idx_tasks_user_created on public.tasks(user_id, created_at desc);

create index idx_milestones_user on public.milestones(user_id);
create index idx_milestones_user_status on public.milestones(user_id, status);

create index idx_satisfaction_user_date on public.satisfaction_logs(user_id, log_date);

create index idx_standup_user_date on public.standup_logs(user_id, log_date);

create index idx_time_user_day on public.time_entries(user_id, day);
create index idx_time_user_task on public.time_entries(user_id, task_id);
create index idx_time_running on public.time_entries(user_id, ended_at) where ended_at is null;

-- ==================== ROW LEVEL SECURITY ====================

alter table public.users enable row level security;
alter table public.tasks enable row level security;
alter table public.milestones enable row level security;
alter table public.satisfaction_logs enable row level security;
alter table public.standup_logs enable row level security;
alter table public.time_entries enable row level security;

create policy "Users read own profile" on public.users
  for select using ((select auth.uid()) = id);
create policy "Users update own profile" on public.users
  for update using ((select auth.uid()) = id);

create policy "Users manage own tasks" on public.tasks
  for all using ((select auth.uid()) = user_id);
create policy "Users manage own milestones" on public.milestones
  for all using ((select auth.uid()) = user_id);
create policy "Users manage own satisfaction" on public.satisfaction_logs
  for all using ((select auth.uid()) = user_id);
create policy "Users manage own standups" on public.standup_logs
  for all using ((select auth.uid()) = user_id);
create policy "Users manage own time entries" on public.time_entries
  for all using ((select auth.uid()) = user_id);

-- ==================== FUNCTIONS & TRIGGERS ====================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on public.users
  for each row execute procedure public.update_updated_at();
create trigger tasks_updated_at before update on public.tasks
  for each row execute procedure public.update_updated_at();
create trigger milestones_updated_at before update on public.milestones
  for each row execute procedure public.update_updated_at();
create trigger time_entries_updated_at before update on public.time_entries
  for each row execute procedure public.update_updated_at();
