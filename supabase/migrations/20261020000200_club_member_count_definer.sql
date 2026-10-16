-- Clubs v1 fix: owners couldn't delete their club.
--
-- Deleting a club cascades to `club_members`, which fires the baseline's
-- `update_club_member_count()` trigger. It ran with the caller's rights and
-- updated `clubs.member_count`, but `20261020000100_clubs.sql` limits client
-- updates on `clubs` to the settings columns, so the cascade failed with
-- "permission denied for table clubs". The count is bookkeeping, not a client
-- write: run it as the definer, like the other club triggers.

create or replace function public.update_club_member_count()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.clubs set member_count = member_count + 1 where id = new.club_id;
  elsif tg_op = 'DELETE' then
    update public.clubs set member_count = member_count - 1 where id = old.club_id;
  end if;
  return null;
end;
$$;

revoke all on function public.update_club_member_count() from public, anon, authenticated;
