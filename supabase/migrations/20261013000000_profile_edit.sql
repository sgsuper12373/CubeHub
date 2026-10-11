-- Profile editing and privacy (docs/profile.md, Step 2).
--
-- 1. `profiles.is_public` (default true). A private profile shows other people
--    only the name and avatar; its personal bests and stats are hidden from
--    everyone but the owner.
-- 2. The `personal_bests` read policy and `get_profile_stats` honour it.
-- 3. A format check on `wca_id` (e.g. 2019SING01), for new writes.
-- 4. An `avatars` Storage bucket: public read, and each user may only write
--    inside their own folder, `avatars/<user id>/…`.
--
-- `show_activity` / `show_learning` arrive with Step 3, alongside the
-- activity and learning sections they control.
--
-- ⚠️ Apply via the Supabase dashboard SQL editor, not the read-only MCP.

-- ── 1. Public or private ───────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_public boolean not null default true;

-- ── 2a. Personal bests: hidden on private profiles (the owner still sees theirs)
drop policy if exists pbs_read on public.personal_bests;
create policy pbs_read on public.personal_bests
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = personal_bests.user_id
        and (p.is_public or p.id = (select auth.uid()))
    )
  );

-- ── 2b. Stats: the same rule. A private profile returns { "private": true }.
create or replace function public.get_profile_stats(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = p_user
      and (p.is_public or p.id = (select auth.uid()))
  ) then
    return jsonb_build_object('private', true);
  end if;

  return (
    select jsonb_build_object(
      'private',        false,
      'total_solves',   count(*),
      'by_event',       coalesce(
                          (select jsonb_object_agg(e.puzzle_type, e.n)
                           from (select s2.puzzle_type, count(*) as n
                                 from public.solves s2
                                 where s2.user_id = p_user and s2.deleted_at is null
                                 group by s2.puzzle_type) e),
                          '{}'::jsonb),
      'first_solve_on', (min(s.created_at) at time zone 'Asia/Kolkata')::date,
      'last_solve_on',  (max(s.created_at) at time zone 'Asia/Kolkata')::date
    )
    from public.solves s
    where s.user_id = p_user
      and s.deleted_at is null
  );
end;
$$;

revoke all on function public.get_profile_stats(uuid) from public;
grant execute on function public.get_profile_stats(uuid) to anon, authenticated;

-- ── 3. WCA ID format ───────────────────────────────────────────────────────
-- NOT VALID: checked on every new write without failing on any old value.
alter table public.profiles drop constraint if exists profiles_wca_id_format;
alter table public.profiles add constraint profiles_wca_id_format
  check (wca_id is null or wca_id ~ '^[0-9]{4}[A-Z]{4}[0-9]{2}$') not valid;

-- ── 4. Avatars bucket ──────────────────────────────────────────────────────
-- Hosted Supabase's storage.buckets has `public`, `file_size_limit` and
-- `allowed_mime_types`; older self-hosted schemas don't, so only set them
-- when they exist. 2 MB covers the 256px WebP the app uploads with room to
-- spare.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'buckets' and column_name = 'allowed_mime_types'
  ) then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/png', 'image/jpeg'])
    on conflict (id) do update
      set public = true,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  else
    insert into storage.buckets (id, name) values ('avatars', 'avatars')
    on conflict (id) do nothing;
  end if;
end;
$$;

-- Writes only inside your own folder: avatars/<your user id>/<file>.
drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Listing your own folder (to clear out the previous avatar). Viewing an
-- avatar goes through the public URL and needs no policy.
drop policy if exists avatars_select_own on storage.objects;
create policy avatars_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
