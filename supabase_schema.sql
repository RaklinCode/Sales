-- Create user_profiles table
create table if not exists public.user_profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text,
  account_type text check (account_type in ('rep', 'manager', 'admin'))
);

-- Create sales_deals table
create table if not exists public.sales_deals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  value numeric not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.user_profiles enable row level security;
alter table public.sales_deals enable row level security;

-- Create policies (simplified for demo)
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
  with check ( true ); -- In real app, check if user is rep

drop policy if exists "Admins can delete user profiles" on public.user_profiles;
create policy "Admins can delete user profiles"
  on public.user_profiles for delete
  using (
    auth.uid() in (
      select id from public.user_profiles where account_type = 'admin'
    )
  );


-- Create a trigger to automatically create a user_profile on signup
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

-- Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SEED DATA
-- We will seed users using the seed-users.js script instead, 
-- because we cannot insert into auth.users directly from here.
