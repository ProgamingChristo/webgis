-- Phase 4 Onboarding and User Stakeholder Modes

create table if not exists public.user_stakeholder_modes (
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('UMKM', 'INVESTOR', 'GOVERNMENT')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  primary key (user_id, mode)
);

-- Enable RLS
alter table public.user_stakeholder_modes enable row level security;

-- Policies
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'user_stakeholder_modes' 
    and policyname = 'Users can read own stakeholder modes'
  ) then
    create policy "Users can read own stakeholder modes"
      on public.user_stakeholder_modes for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

-- Note: No insert/update/delete policies because it is managed strictly by the RPC function below.

-- RPC for atomic onboarding completion
create or replace function public.complete_onboarding(selected_modes text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode text;
begin
  -- Validate input array items
  if selected_modes is not null then
    foreach v_mode in array selected_modes
    loop
      if v_mode not in ('UMKM', 'INVESTOR', 'GOVERNMENT') then
        raise exception 'Invalid stakeholder mode: %', v_mode;
      end if;
    end loop;

    -- Ensure array size is max 3
    if array_length(selected_modes, 1) > 3 then
      raise exception 'Maximum 3 stakeholder modes allowed';
    end if;
  end if;

  -- Delete existing modes for this user
  delete from public.user_stakeholder_modes
  where user_id = auth.uid();

  -- Insert new modes (distinct removes duplicates if any)
  if selected_modes is not null and array_length(selected_modes, 1) > 0 then
    insert into public.user_stakeholder_modes (user_id, mode)
    select distinct auth.uid(), unnest(selected_modes);
  end if;

  -- Mark onboarding as complete in profiles
  update public.profiles
  set onboarding_complete = true,
      updated_at = timezone('utc'::text, now())
  where id = auth.uid();

end;
$$;
