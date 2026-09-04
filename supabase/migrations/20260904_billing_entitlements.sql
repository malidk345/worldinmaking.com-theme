-- Billing entitlements: only the Lemon Squeezy webhook (service role)
-- may change profiles.role or write subscriptions rows.

revoke insert, update, delete, truncate on public.subscriptions from anon;
revoke insert, update, delete, truncate on public.subscriptions from authenticated;
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'update' and new.role is distinct from old.role then
    if coalesce(auth.role(), '') <> 'service_role' then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row
  execute function public.protect_profile_role();
