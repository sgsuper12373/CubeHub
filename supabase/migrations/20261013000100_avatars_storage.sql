-- Avatars Storage bucket (docs/profile.md, Step 2). Run AFTER
-- 20261013000000_profile_edit.sql.
--
-- Public read; each user may only write inside their own folder,
-- `avatars/<user id>/…`.
--
-- If the SQL editor refuses the policies with "must be owner of table
-- objects", create the same four policies in the dashboard instead:
-- Storage → Policies → avatars → New policy (see docs/todo.md).
--
-- ⚠️ Apply via the Supabase dashboard SQL editor, not the read-only MCP.

-- ── Bucket ──────────────────────────────────────────────────────
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
