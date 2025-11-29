-- Create sales_targets table
create table if not exists public.sales_targets (
  id uuid default gen_random_uuid() primary key,
  target_value numeric not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.sales_targets enable row level security;

-- Create policies
drop policy if exists "Targets are viewable by everyone" on public.sales_targets;
create policy "Targets are viewable by everyone"
  on public.sales_targets for select
  using ( true );

drop policy if exists "Admins can insert targets" on public.sales_targets;
create policy "Admins can insert targets"
  on public.sales_targets for insert
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and account_type = 'admin'
    )
  );

-- Enable Realtime
alter publication supabase_realtime add table public.sales_targets;
