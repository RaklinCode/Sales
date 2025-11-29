-- 1. Create user_profiles table
create table if not exists public.user_profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text,
  account_type text check (account_type in ('rep', 'manager', 'admin'))
);

-- 2. Create sales_deals table
create table if not exists public.sales_deals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  value numeric not null,
  created_at timestamptz default now()
);

-- 3. Enable RLS
alter table public.user_profiles enable row level security;
alter table public.sales_deals enable row level security;

-- 4. Create policies
drop policy if exists "Public profiles are viewable by everyone" on public.user_profiles;
create policy "Public profiles are viewable by everyone"
  on public.user_profiles for select
  using ( true );

drop policy if exists "Users can insert their own profile" on public.user_profiles;
create policy "Users can insert their own profile"
  on public.user_profiles for insert
  with check ( auth.uid() = id );

drop policy if exists "Deals are viewable by everyone" on public.sales_deals;
create policy "Deals are viewable by everyone"
  on public.sales_deals for select
  using ( true );

drop policy if exists "Reps can insert deals" on public.sales_deals;
create policy "Reps can insert deals"
  on public.sales_deals for insert
  with check ( true );

-- 5. Create Trigger for new users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, name, account_type)
  values (new.id, new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'account_type');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Create the View (This was the missing part causing the error)
create or replace view public.sales_by_user as
select 
  up.name,
  coalesce(sum(sd.value), 0) as total_sales
from 
  public.user_profiles up
left join 
  public.sales_deals sd on up.id = sd.user_id
group by 
  up.name;

-- Grant access to the view
grant select on public.sales_by_user to anon, authenticated, service_role;

-- 7. Enable Realtime for sales_deals
alter publication supabase_realtime add table public.sales_deals;

-- 8. Create sales_targets table
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

drop policy if exists "Admins and Managers can insert targets" on public.sales_targets;
create policy "Admins and Managers can insert targets"
  on public.sales_targets for insert
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and account_type in ('admin', 'manager')
    )
  );

-- Enable Realtime
alter publication supabase_realtime add table public.sales_targets;
