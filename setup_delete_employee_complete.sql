-- Complete setup for delete_employee function

-- 1. Drop the function if it exists to ensure a clean slate
drop function if exists public.delete_employee(uuid);

-- 2. Create the function
create or replace function public.delete_employee(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Check if the executing user is an admin
  if not exists (
    select 1 from public.user_profiles
    where id = auth.uid() and account_type = 'admin'
  ) then
    raise exception 'Access denied: Only admins can delete employees';
  end if;

  -- Delete from auth.users (this triggers cascade to user_profiles and sales_deals)
  delete from auth.users where id = target_user_id;
end;
$$;

-- 3. Grant execution permissions
grant execute on function public.delete_employee(uuid) to authenticated;
grant execute on function public.delete_employee(uuid) to service_role;

-- 4. Force schema cache reload
notify pgrst, 'reload config';
