alter table public.profiles add column if not exists username text;
create unique index if not exists profiles_username_unique on public.profiles(lower(username));
alter table public.profiles add constraint profiles_username_format check (username is null or username ~ '^[a-z0-9._-]{3,40}$');
