-- =============================================================================
-- Personal Notes & To-Do — Supabase schema
-- Run this in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Safe to re-run (idempotent where practical).
-- =============================================================================

-- --- Enums ---------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type task_priority as enum ('low', 'medium', 'high');
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum ('todo', 'in_progress', 'done');
  end if;
end$$;

-- --- Tables --------------------------------------------------------------
create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  color      text not null default '#6366f1',
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  group_id     uuid not null references public.groups (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 280),
  description  text not null default '',
  priority     task_priority not null default 'medium',
  due_date     date,
  is_done      boolean not null default false,
  subtasks     jsonb not null default '[]'::jsonb,
  images       jsonb not null default '[]'::jsonb,
  position     integer not null default 0,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  group_id   uuid not null references public.groups (id) on delete cascade,
  title      text not null default 'Untitled' check (char_length(title) <= 200),
  content    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --- Indexes -------------------------------------------------------------
create index if not exists groups_user_idx on public.groups (user_id, position);
create index if not exists tasks_group_idx on public.tasks (group_id, position);
create index if not exists tasks_user_idx  on public.tasks (user_id);
create index if not exists notes_group_idx on public.notes (group_id, updated_at desc);
create index if not exists notes_user_idx  on public.notes (user_id);

-- --- Kanban status (added after initial release) -------------------------
alter table public.tasks add column if not exists status task_status not null default 'todo';
update public.tasks set status = 'done' where is_done = true and status <> 'done';
create index if not exists tasks_status_idx on public.tasks (group_id, status, position);

-- --- Task pictures (added after initial release) -------------------------
alter table public.tasks add column if not exists images jsonb not null default '[]'::jsonb;

-- --- updated_at trigger for notes ---------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Row-Level Security — every user can only touch their own rows.
-- =============================================================================
alter table public.groups enable row level security;
alter table public.tasks  enable row level security;
alter table public.notes  enable row level security;

-- groups
drop policy if exists "groups owner" on public.groups;
create policy "groups owner" on public.groups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tasks
drop policy if exists "tasks owner" on public.tasks;
create policy "tasks owner" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notes
drop policy if exists "notes owner" on public.notes;
create policy "notes owner" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
