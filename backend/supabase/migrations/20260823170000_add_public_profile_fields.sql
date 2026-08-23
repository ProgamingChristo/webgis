-- Add self-service profile fields used by the account menu and public profiles.
-- Phone number remains private to the owner-facing /api/profile response.

alter table public.profiles
  add column if not exists username text,
  add column if not exists phone_number text,
  add column if not exists bio text;

update public.profiles
set username = lower(
  regexp_replace(
    coalesce(nullif(username, ''), 'user_' || left(id::text, 8)),
    '[^a-zA-Z0-9_]+',
    '_',
    'g'
  )
)
where username is null or username = '';

alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,30}$');

alter table public.profiles
  add constraint profiles_phone_number_length
  check (phone_number is null or char_length(phone_number) <= 32);

alter table public.profiles
  add constraint profiles_bio_length
  check (bio is null or char_length(bio) <= 240);

create unique index if not exists profiles_username_unique_lower
  on public.profiles (lower(username))
  where username is not null;

grant update (display_name, avatar_url, username, phone_number, bio)
  on table public.profiles to authenticated;
