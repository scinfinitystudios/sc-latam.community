-- SC LATAM Community: repair/create profiles and enable customizable member photos.
-- Safe for an existing project: creates missing objects and does not delete member data.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) between 2 and 32)
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists role text not null default 'member';
alter table public.profiles add column if not exists created_at timestamptz not null default now();

-- Backfill profile rows for users who registered before the profile table existed.
insert into public.profiles (id, email, role)
select u.id, u.email, 'member'
from auth.users u
on conflict (id) do update set email = coalesce(public.profiles.email, excluded.email);

alter table public.profiles enable row level security;

drop policy if exists "profile_select_self_or_admin" on public.profiles;
create policy "profile_select_self_or_admin" on public.profiles
for select to authenticated
using (id = (select auth.uid()));

drop policy if exists "profile_update_self" on public.profiles;
create policy "profile_update_self" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- Create/refresh the signup trigger without trusting user-editable role metadata.
create or replace function public.handle_sc_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'member')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sc on auth.users;
create trigger on_auth_user_created_sc
after insert on auth.users
for each row execute procedure public.handle_sc_new_user();

-- Create the profile photo bucket and limit file types/size.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "profile_photos_public_read" on storage.objects;
create policy "profile_photos_public_read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'profile-photos');

drop policy if exists "profile_photos_insert_own" on storage.objects;
create policy "profile_photos_insert_own" on storage.objects
for insert to authenticated
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "profile_photos_update_own" on storage.objects;
create policy "profile_photos_update_own" on storage.objects
for update to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "profile_photos_delete_own" on storage.objects;
create policy "profile_photos_delete_own" on storage.objects
for delete to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
