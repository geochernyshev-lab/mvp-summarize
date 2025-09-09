
-- Add atomic increment function (run in Supabase SQL editor)
create or replace function increment_quota(uid uuid)
returns table (used int, limit int)
language plpgsql
as $$
begin
  update public.user_quotas
     set used = used + 1,
         updated_at = now()
   where user_id = uid
     and used < "limit"
  returning user_quotas.used, user_quotas."limit"
  into used, limit;

  if not found then
    -- No row updated => either row missing or limit reached
    -- Ensure row exists
    insert into public.user_quotas(user_id) values (uid)
    on conflict (user_id) do nothing;

    -- Try again
    update public.user_quotas
       set used = used + 1,
           updated_at = now()
     where user_id = uid
       and used < "limit"
    returning user_quotas.used, user_quotas."limit"
    into used, limit;

    if not found then
      return;
    end if;
  end if;

  return next;
end;
$$;

-- RLS policies already cover insert/update/select for own user_id.
