-- 1. Projects table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  status text default 'Active' check (status in ('Active', 'Completed')),
  created_at timestamptz default now()
);

-- 2. Tasks table
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  priority text default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  status text default 'Todo' check (status in ('Todo', 'In Progress', 'Completed')),
  due_date date,
  created_at timestamptz default now()
);