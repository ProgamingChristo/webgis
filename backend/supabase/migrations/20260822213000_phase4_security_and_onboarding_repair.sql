-- Phase 4 closure repair.
--
-- 1. Keep complete_onboarding compatible with both the legacy
--    stakeholder_mode enum and the newer text column definition.
-- 2. Remove public/authenticated access to raw survey responses.

create or replace function public.complete_onboarding(selected_modes text[])
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_mode text;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  selected_modes := coalesce(selected_modes, array[]::text[]);

  if cardinality(selected_modes) > 3 then
    raise exception 'Maximum 3 stakeholder modes allowed';
  end if;

  foreach v_mode in array selected_modes
  loop
    if v_mode not in ('UMKM', 'INVESTOR', 'GOVERNMENT') then
      raise exception 'Invalid stakeholder mode: %', v_mode;
    end if;
  end loop;

  delete from public.user_stakeholder_modes
  where user_id = v_user_id;

  foreach v_mode in array selected_modes
  loop
    -- A quoted SQL literal is deliberately used after whitelist validation.
    -- PostgreSQL can coerce the unknown literal to either text or the legacy
    -- stakeholder_mode enum, avoiding the remote text-to-enum mismatch.
    execute pg_catalog.format(
      'insert into public.user_stakeholder_modes (user_id, mode) values ($1, %L) on conflict (user_id, mode) do nothing',
      v_mode
    ) using v_user_id;
  end loop;

  update public.profiles
  set onboarding_complete = true,
      updated_at = timezone('utc'::text, now())
  where id = v_user_id;

  if not found then
    raise exception 'Authenticated profile was not found';
  end if;
end;
$$;

revoke all on function public.complete_onboarding(text[]) from public;
revoke all on function public.complete_onboarding(text[]) from anon;
grant execute on function public.complete_onboarding(text[]) to authenticated;
grant execute on function public.complete_onboarding(text[]) to service_role;

alter table public.survey_responses enable row level security;

drop policy if exists "Allow service role full access on responses"
  on public.survey_responses;
drop policy if exists "Service role full access on survey responses"
  on public.survey_responses;

revoke all privileges on table public.survey_responses from anon;
revoke all privileges on table public.survey_responses from authenticated;
grant all privileges on table public.survey_responses to service_role;

create policy "Service role full access on survey responses"
  on public.survey_responses
  for all
  to service_role
  using (true)
  with check (true);
