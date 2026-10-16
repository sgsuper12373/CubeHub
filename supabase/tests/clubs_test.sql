-- Test for 20261020000100_clubs.sql: creating and joining clubs, private
-- clubs, requests, roles, bans, invite links, posts, pinning, reactions,
-- comments, blocks, reports, activity, limits and grants.
--
-- SAFE TO RUN ON PRODUCTION. Everything happens inside a transaction that ends
-- in ROLLBACK. It creates four throwaway users and acts as them the way
-- PostgREST does. Run in the dashboard SQL editor, or with
-- `supabase db query --linked -f supabase/tests/clubs_test.sql`; expect every
-- row to be PASS.
--
--   A = a2…0a (owner), B = b2…0b, C = c2…0c, D = d2…0d (outsider)

begin;

-- This is the TEST. Its migration must be applied first.
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'create_club') then
    raise exception 'Apply supabase/migrations/20261020000100_clubs.sql first, then run this test.';
  end if;
end;
$$;

create temp table results (step text, expected text, actual text, verdict text)
on commit drop;
grant all on results to anon, authenticated;

-- Named ids the steps share (clubs, posts, invite tokens).
create temp table ids (k text primary key, v text) on commit drop;
grant all on ids to anon, authenticated;

-- Runs one statement as the current role and records 'ok', or the error's
-- hint ('banned', 'owned_limit', …), or 'error' for anything else (RLS,
-- privileges, check constraints).
create function pg_temp.try(p_step text, p_sql text, p_expected text)
returns void
language plpgsql
as $$
declare
  v_hint text;
  v_actual text;
begin
  begin
    execute p_sql;
    v_actual := 'ok';
  exception
    -- The RPCs' own errors (P0001) carry a hint naming the rule.
    when raise_exception then
      get stacked diagnostics v_hint = pg_exception_hint;
      v_actual := coalesce(nullif(v_hint, ''), 'error');
    when others then
      v_actual := 'error';
  end;
  insert into results values (p_step, p_expected, v_actual, null);
end;
$$;

create function pg_temp.id(p_key text)
returns uuid
language sql
as $$ select v::uuid from ids where k = p_key $$;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
  ('a2000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'clubs-test-a@example.com', '{}'),
  ('b2000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'clubs-test-b@example.com', '{}'),
  ('c2000000-0000-4000-8000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'clubs-test-c@example.com', '{}'),
  ('d2000000-0000-4000-8000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'clubs-test-d@example.com', '{}');

-- B, C and D pick usernames; A keeps the auto handle for the first check.
update public.profiles set username = 'clubtest_b' where id = 'b2000000-0000-4000-8000-00000000000b';
update public.profiles set username = 'clubtest_c' where id = 'c2000000-0000-4000-8000-00000000000c';
update public.profiles set username = 'clubtest_d' where id = 'd2000000-0000-4000-8000-00000000000d';
update public.profiles set username = 'user_0123456789ab' where id = 'a2000000-0000-4000-8000-00000000000a';

-- ── Creating ───────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-00000000000a', true);
select pg_temp.try('creating needs a chosen username',
  $q$select public.create_club('Clubtest Pune', 'clubtest-pune', null, 'city', '{}', true)$q$, 'needs_username');
reset role;
update public.profiles set username = 'clubtest_a' where id = 'a2000000-0000-4000-8000-00000000000a';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-00000000000a', true);
select pg_temp.try('owner creates a public club',
  $q$select public.create_club('Clubtest Pune', 'Clubtest-Pune', 'Weekend meetups', 'city', array['333','casual'], true)$q$, 'ok');
insert into ids select 'pune', id::text from public.clubs where slug = 'clubtest-pune';
insert into results
select 'the creator is the owner and the count is 1', 'owner|1',
       (select m.role::text || '|' || c.member_count
        from public.clubs c join public.club_members m on m.club_id = c.id
        where c.id = pg_temp.id('pune')), null;
select pg_temp.try('names are unique ignoring case',
  $q$select public.create_club('CLUBTEST PUNE', 'clubtest-pune-2', null, 'city', '{}', true)$q$, 'name_taken');
select pg_temp.try('slugs are unique',
  $q$select public.create_club('Clubtest Pune Two', 'clubtest-pune', null, 'city', '{}', true)$q$, 'slug_taken');
select pg_temp.try('reserved slugs are refused',
  $q$select public.create_club('Clubtest New', 'new', null, 'online', '{}', true)$q$, 'error');
select pg_temp.try('tags must come from the list',
  $q$select public.create_club('Clubtest Tags', 'clubtest-tags', null, 'online', array['feet'], true)$q$, 'error');
select pg_temp.try('at most 3 tags',
  $q$select public.create_club('Clubtest Tags', 'clubtest-tags', null, 'online', array['333','222','casual','methods'], true)$q$, 'error');
select pg_temp.try('no direct insert into clubs',
  $q$insert into public.clubs (name, slug, created_by) values ('Clubtest Raw', 'clubtest-raw', 'a2000000-0000-4000-8000-00000000000a')$q$, 'error');
select pg_temp.try('owner creates a private club',
  $q$select public.create_club('Clubtest Secret', 'clubtest-secret', null, 'school', '{}', false)$q$, 'ok');
insert into ids select 'secret', id::text from public.clubs where slug = 'clubtest-secret';
select pg_temp.try('third owned club is fine',
  $q$select public.create_club('Clubtest Three', 'clubtest-three', null, 'online', '{}', true)$q$, 'ok');
select pg_temp.try('a fourth owned club is refused',
  $q$select public.create_club('Clubtest Four', 'clubtest-four', null, 'online', '{}', true)$q$, 'owned_limit');
reset role;

-- ── Joining a public club ──────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-00000000000b', true);
select pg_temp.try('no direct insert into club_members',
  format($q$insert into public.club_members (club_id, user_id, role) values (%L, 'b2000000-0000-4000-8000-00000000000b', 'owner')$q$, pg_temp.id('pune')), 'error');
select pg_temp.try('B joins the public club', format('select public.join_club(%L)', pg_temp.id('pune')), 'ok');
insert into results
select 'B is a member and the count is 2', 'member|2',
       (select m.role::text || '|' || c.member_count
        from public.clubs c join public.club_members m on m.club_id = c.id
        where c.id = pg_temp.id('pune') and m.user_id = 'b2000000-0000-4000-8000-00000000000b'), null;
select pg_temp.try('a private club can''t be joined directly',
  format('select public.join_club(%L)', pg_temp.id('secret')), 'private');
reset role;

-- ── A private club, seen from outside ──────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd2000000-0000-4000-8000-00000000000d', true);
insert into results
select 'outsiders still find a private club in search', '1',
       (select count(*)::text from public.clubs where id = pg_temp.id('secret')), null;
insert into results
select 'outsiders don''t see a private club''s members', '0',
       (select count(*)::text from public.club_members where club_id = pg_temp.id('secret')), null;
insert into results
select 'anyone sees a public club''s members', '2',
       (select count(*)::text from public.club_members where club_id = pg_temp.id('pune')), null;
reset role;

-- ── Requests ───────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c2000000-0000-4000-8000-00000000000c', true);
select pg_temp.try('C asks to join the private club',
  format($q$select public.request_to_join(%L, 'From the school team')$q$, pg_temp.id('secret')), 'ok');
select pg_temp.try('a public club takes no requests (join instead)',
  format('select public.request_to_join(%L)', pg_temp.id('pune')), 'public');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-00000000000b', true);
insert into results
select 'other members can''t see the request', '0',
       (select count(*)::text from public.club_join_requests where club_id = pg_temp.id('secret')), null;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-00000000000a', true);
insert into results
select 'the owner sees the request and is notified', '1|1',
       (select count(*)::text from public.club_join_requests where club_id = pg_temp.id('secret'))
       || '|' ||
       (select count(*)::text from public.notifications
        where type = 'club_request' and data ->> 'club_id' = pg_temp.id('secret')::text), null;
insert into ids select 'req_c', id::text from public.club_join_requests where club_id = pg_temp.id('secret');
select pg_temp.try('the owner approves',
  format('select public.respond_to_join_request(%L, true)', pg_temp.id('req_c')), 'ok');
insert into results
select 'the request is gone, and so is its notification', '0|0',
       (select count(*)::text from public.club_join_requests where club_id = pg_temp.id('secret'))
       || '|' ||
       (select count(*)::text from public.notifications
        where type = 'club_request' and data ->> 'club_id' = pg_temp.id('secret')::text), null;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c2000000-0000-4000-8000-00000000000c', true);
insert into results
select 'C is in and was told', 'member|1',
       (select role::text from public.club_members
        where club_id = pg_temp.id('secret') and user_id = 'c2000000-0000-4000-8000-00000000000c')
       || '|' ||
       (select count(*)::text from public.notifications where type = 'club_request_approved'), null;
select pg_temp.try('a plain member can''t approve requests',
  format('select public.respond_to_join_request(%L, true)', gen_random_uuid()), 'not_found');
reset role;

-- ── Posts ──────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-00000000000b', true);
select pg_temp.try('a member posts text',
  format($q$insert into public.club_posts (club_id, kind, body) values (%L, 'text', 'Meetup Sunday?')$q$, pg_temp.id('pune')), 'ok');
insert into ids select 'post_b', id::text from public.club_posts where club_id = pg_temp.id('pune');
select pg_temp.try('a valid algorithm post',
  format($q$insert into public.club_posts (club_id, kind, alg, puzzle, body) values (%L, 'alg', 'R U R'' U'' (R'' F R2) U2', '333', 'Sune-ish')$q$, pg_temp.id('pune')), 'ok');
select pg_temp.try('junk notation is refused',
  format($q$insert into public.club_posts (club_id, kind, alg, puzzle) values (%L, 'alg', 'R U hello', '333')$q$, pg_temp.id('pune')), 'error');
select pg_temp.try('algorithms are 3x3 or 2x2 only',
  format($q$insert into public.club_posts (club_id, kind, alg, puzzle) values (%L, 'alg', 'R U', 'pyra')$q$, pg_temp.id('pune')), 'error');
select pg_temp.try('a YouTube link is fine',
  format($q$insert into public.club_posts (club_id, kind, video_url) values (%L, 'video', 'https://youtu.be/dQw4w9WgXcQ')$q$, pg_temp.id('pune')), 'ok');
select pg_temp.try('other video sites are refused',
  format($q$insert into public.club_posts (club_id, kind, video_url) values (%L, 'video', 'https://vimeo.com/123')$q$, pg_temp.id('pune')), 'error');
select pg_temp.try('a text post over 1000 characters is refused',
  format($q$insert into public.club_posts (club_id, kind, body) values (%L, 'text', %L)$q$, pg_temp.id('pune'), repeat('x', 1001)), 'error');
select pg_temp.try('can''t post as someone else',
  format($q$insert into public.club_posts (club_id, author_id, kind, body) values (%L, 'a2000000-0000-4000-8000-00000000000a', 'text', 'hi')$q$, pg_temp.id('pune')), 'error');
select pg_temp.try('the author edits within 15 minutes',
  format($q$update public.club_posts set body = 'Meetup Saturday?' where id = %L$q$, pg_temp.id('post_b')), 'ok');
insert into results
select 'the edit is marked', 'true',
       (select (edited_at is not null)::text from public.club_posts where id = pg_temp.id('post_b')), null;
select pg_temp.try('authors can''t pin their own post',
  format($q$update public.club_posts set pinned_at = now() where id = %L$q$, pg_temp.id('post_b')), 'error');
select pg_temp.try('a member can''t pin',
  format('select public.set_club_post_pinned(%L, true)', pg_temp.id('post_b')), 'forbidden');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd2000000-0000-4000-8000-00000000000d', true);
select pg_temp.try('non-members can''t post',
  format($q$insert into public.club_posts (club_id, kind, body) values (%L, 'text', 'hi')$q$, pg_temp.id('pune')), 'error');
insert into results
select 'anyone reads a public club''s posts', '3',
       (select count(*)::text from public.club_posts where club_id = pg_temp.id('pune')), null;
reset role;

-- An old post can't be edited any more.
update public.club_posts set created_at = now() - interval '20 minutes' where id = pg_temp.id('post_b');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-00000000000b', true);
update public.club_posts set body = 'Too late' where id = pg_temp.id('post_b');
insert into results
select 'no edits after 15 minutes', 'Meetup Saturday?',
       (select body from public.club_posts where id = pg_temp.id('post_b')), null;
reset role;

-- Private club: C posts, D can't read it.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c2000000-0000-4000-8000-00000000000c', true);
select pg_temp.try('a private club member posts',
  format($q$insert into public.club_posts (club_id, kind, body) values (%L, 'text', 'Inside news')$q$, pg_temp.id('secret')), 'ok');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd2000000-0000-4000-8000-00000000000d', true);
insert into results
select 'outsiders don''t see a private club''s posts', '0',
       (select count(*)::text from public.club_posts where club_id = pg_temp.id('secret')), null;
reset role;

-- ── Pinning ────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-00000000000a', true);
select pg_temp.try('the owner pins a post',
  format('select public.set_club_post_pinned(%L, true)', pg_temp.id('post_b')), 'ok');
reset role;
insert into results
select 'members hear about the pin (not the pinner)', '1|0',
       (select count(*)::text from public.notifications
        where type = 'club_post_pinned' and user_id = 'b2000000-0000-4000-8000-00000000000b')
       || '|' ||
       (select count(*)::text from public.notifications
        where type = 'club_post_pinned' and user_id = 'a2000000-0000-4000-8000-00000000000a'), null;
-- Two more pinned posts (made as the owner of the table), then a fourth is refused.
insert into public.club_posts (club_id, author_id, kind, body, pinned_at)
select pg_temp.id('pune'), 'a2000000-0000-4000-8000-00000000000a', 'text', 'Pin ' || g, null
from generate_series(1, 3) g;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-00000000000a', true);
select count(*) from (
  select public.set_club_post_pinned(id, true)
  from public.club_posts where club_id = pg_temp.id('pune') and body in ('Pin 1', 'Pin 2')
) x;
select pg_temp.try('a club pins at most 3 posts',
  format('select public.set_club_post_pinned(%L, true)',
         (select id from public.club_posts where club_id = pg_temp.id('pune') and body = 'Pin 3')), 'pin_limit');
reset role;

-- ── Reactions and comments ─────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-00000000000a', true);
select pg_temp.try('a member reacts',
  format($q$insert into public.club_post_reactions (post_id, reaction) values (%L, 'fire')$q$, pg_temp.id('post_b')), 'ok');
select pg_temp.try('one of each reaction per cuber',
  format($q$insert into public.club_post_reactions (post_id, reaction) values (%L, 'fire')$q$, pg_temp.id('post_b')), 'error');
select pg_temp.try('only the three reactions exist',
  format($q$insert into public.club_post_reactions (post_id, reaction) values (%L, 'heart')$q$, pg_temp.id('post_b')), 'error');
select pg_temp.try('a member comments',
  format($q$insert into public.club_post_comments (post_id, body) values (%L, 'I''m in')$q$, pg_temp.id('post_b')), 'ok');
select pg_temp.try('a second comment',
  format($q$insert into public.club_post_comments (post_id, body) values (%L, 'Bringing timers')$q$, pg_temp.id('post_b')), 'ok');
reset role;
insert into results
select 'the author is notified once per post per hour', '1',
       (select count(*)::text from public.notifications
        where type = 'club_comment' and user_id = 'b2000000-0000-4000-8000-00000000000b'), null;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd2000000-0000-4000-8000-00000000000d', true);
select pg_temp.try('non-members can''t react',
  format($q$insert into public.club_post_reactions (post_id, reaction) values (%L, 'clap')$q$, pg_temp.id('post_b')), 'error');
select pg_temp.try('non-members can''t comment',
  format($q$insert into public.club_post_comments (post_id, body) values (%L, 'hi')$q$, pg_temp.id('post_b')), 'error');
reset role;

-- ── Blocks ─────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-00000000000b', true);
insert into public.user_blocks (blocker_id, blocked_id)
values ('b2000000-0000-4000-8000-00000000000b', 'a2000000-0000-4000-8000-00000000000a');
insert into results
select 'the blocker doesn''t see the blocked cuber''s comments', '0',
       (select count(*)::text from public.club_post_comments where post_id = pg_temp.id('post_b')), null;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-00000000000a', true);
insert into results
select 'the blocked cuber doesn''t see the blocker''s posts', '0',
       (select count(*)::text from public.club_posts
        where author_id = 'b2000000-0000-4000-8000-00000000000b'), null;
insert into results
select 'both stay members of the club', '2',
       (select count(*)::text from public.club_members
        where club_id = pg_temp.id('pune')
          and user_id in ('a2000000-0000-4000-8000-00000000000a', 'b2000000-0000-4000-8000-00000000000b')), null;
reset role;
delete from public.user_blocks where blocker_id = 'b2000000-0000-4000-8000-00000000000b';

-- ── Roles ──────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-00000000000a', true);
select pg_temp.try('the owner can''t leave',
  format('select public.leave_club(%L)', pg_temp.id('pune')), 'owner');
select pg_temp.try('the owner makes B an admin',
  format($q$select public.set_club_member_role(%L, 'b2000000-0000-4000-8000-00000000000b', 'admin')$q$, pg_temp.id('pune')), 'ok');
reset role;
-- D joins pune so the admin has someone to manage.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd2000000-0000-4000-8000-00000000000d', true);
select public.join_club(pg_temp.id('pune'));
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-00000000000b', true);
select pg_temp.try('an admin can''t remove the owner',
  format($q$select public.remove_club_member(%L, 'a2000000-0000-4000-8000-00000000000a')$q$, pg_temp.id('pune')), 'forbidden');
select pg_temp.try('an admin can''t change roles',
  format($q$select public.set_club_member_role(%L, 'd2000000-0000-4000-8000-00000000000d', 'admin')$q$, pg_temp.id('pune')), 'forbidden');
select pg_temp.try('an admin bans a member',
  format($q$select public.remove_club_member(%L, 'd2000000-0000-4000-8000-00000000000d', true)$q$, pg_temp.id('pune')), 'ok');
insert into results
select 'the admin sees the ban list', '1',
       (select count(*)::text from public.club_bans where club_id = pg_temp.id('pune')), null;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd2000000-0000-4000-8000-00000000000d', true);
select pg_temp.try('a banned cuber can''t rejoin',
  format('select public.join_club(%L)', pg_temp.id('pune')), 'banned');
insert into results
select 'outsiders can''t read the ban list', '0',
       (select count(*)::text from public.club_bans), null;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-00000000000a', true);
select pg_temp.try('transfer to a non-member is refused',
  format($q$select public.transfer_club_ownership(%L, 'd2000000-0000-4000-8000-00000000000d')$q$, pg_temp.id('pune')), 'not_member');
select pg_temp.try('the owner transfers the club to B',
  format($q$select public.transfer_club_ownership(%L, 'b2000000-0000-4000-8000-00000000000b')$q$, pg_temp.id('pune')), 'ok');
insert into results
select 'B owns it, A is now an admin', 'admin|owner',
       (select string_agg(role::text, '|' order by user_id) from public.club_members
        where club_id = pg_temp.id('pune')
          and user_id in ('a2000000-0000-4000-8000-00000000000a', 'b2000000-0000-4000-8000-00000000000b')), null;
select pg_temp.try('the old owner can leave now',
  format('select public.leave_club(%L)', pg_temp.id('pune')), 'ok');
reset role;

-- ── Invite links ───────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-00000000000a', true);
insert into ids select 'invite', public.create_club_invite(pg_temp.id('secret'), 7, 1);
select pg_temp.try('invite links last 1, 7 or 30 days, or never',
  format('select public.create_club_invite(%L, 3)', pg_temp.id('secret')), 'bad_expiry');
reset role;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
insert into results
select 'signed out, the invite page shows the club', 'Clubtest Secret|valid',
       (select name || '|' || status from public.get_club_invite((select v from ids where k = 'invite'))), null;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd2000000-0000-4000-8000-00000000000d', true);
select pg_temp.try('an invite link joins a private club',
  format('select public.use_club_invite(%L)', (select v from ids where k = 'invite')), 'ok');
insert into results
select 'D is in the private club', '1',
       (select count(*)::text from public.club_members
        where club_id = pg_temp.id('secret') and user_id = 'd2000000-0000-4000-8000-00000000000d'), null;
reset role;

-- B (not in the private club) can't use the same link: it was single-use.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-00000000000b', true);
insert into results
select 'a used-up link says so', 'used_up',
       (select status from public.get_club_invite((select v from ids where k = 'invite'))), null;
select pg_temp.try('a used-up link doesn''t join',
  format('select public.use_club_invite(%L)', (select v from ids where k = 'invite')), 'expired');
select pg_temp.try('members can''t make invite links',
  format('select public.create_club_invite(%L)', pg_temp.id('secret')), 'forbidden');
reset role;

-- A banned cuber can't use a fresh link either.
insert into public.club_bans (club_id, user_id) values (pg_temp.id('secret'), 'b2000000-0000-4000-8000-00000000000b');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-00000000000a', true);
insert into ids select 'invite2', public.create_club_invite(pg_temp.id('secret'), null, null);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-00000000000b', true);
select pg_temp.try('banned cubers can''t use invite links',
  format('select public.use_club_invite(%L)', (select v from ids where k = 'invite2')), 'banned');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-00000000000a', true);
select pg_temp.try('the owner revokes a link',
  format('select public.revoke_club_invite(%L)',
         (select id from public.club_invites where token = (select v from ids where k = 'invite2'))), 'ok');
insert into results
select 'a revoked link says so', 'revoked',
       (select status from public.get_club_invite((select v from ids where k = 'invite2'))), null;
reset role;

-- ── Activity ───────────────────────────────────────────────────────────────
insert into public.sessions (id, user_id) values
  ('e2000000-0000-4000-8000-00000000000c', 'c2000000-0000-4000-8000-00000000000c');
insert into public.solves (user_id, session_id, time_ms, scramble, created_at) values
  ('c2000000-0000-4000-8000-00000000000c', 'e2000000-0000-4000-8000-00000000000c', 12000, 'R U', now()),
  ('c2000000-0000-4000-8000-00000000000c', 'e2000000-0000-4000-8000-00000000000c', 13000, 'R U', now()),
  ('c2000000-0000-4000-8000-00000000000c', 'e2000000-0000-4000-8000-00000000000c', 14000, 'R U', now() - interval '8 days');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-00000000000a', true);
insert into results
select 'activity counts this week''s solves only', '2',
       (select solves_this_week::text from public.get_club_activity(pg_temp.id('secret'))
        where user_id = 'c2000000-0000-4000-8000-00000000000c'), null;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-00000000000b', true);
insert into results
select 'outsiders get no activity for a private club', '0',
       (select count(*)::text from public.get_club_activity(pg_temp.id('secret'))), null;
insert into results
select 'a profile''s Clubs row hides private clubs from outsiders', 'clubtest-three',
       (select string_agg(slug, ',') from public.get_profile_clubs('a2000000-0000-4000-8000-00000000000a')), null;
reset role;

-- ── Reports ────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd2000000-0000-4000-8000-00000000000d', true);
select pg_temp.try('a cuber reports a post',
  format($q$insert into public.club_reports (post_id, reason) values (%L, 'spam')$q$, pg_temp.id('post_b')), 'ok');
insert into results
select 'users can''t read reports', '0',
       (select count(*)::text from public.club_reports), null;
reset role;
insert into results
select 'the report is filed against the post''s club', 'true',
       (select (club_id = pg_temp.id('pune'))::text from public.club_reports
        where reporter_id = 'd2000000-0000-4000-8000-00000000000d'), null;

-- ── Limits ─────────────────────────────────────────────────────────────────
-- Posts: B has made 4 (text, alg, video… and one refused). Fill to 10 today.
insert into public.social_rate_events (user_id, kind)
select 'b2000000-0000-4000-8000-00000000000b', 'club_post' from generate_series(1, 10);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-00000000000b', true);
select pg_temp.try('10 posts a day',
  format($q$insert into public.club_posts (club_id, kind, body) values (%L, 'text', 'One more')$q$, pg_temp.id('pune')), 'rate_limited');
reset role;

-- Memberships: C is in the private club; put C in 19 more (20 in all), then
-- a 21st is refused.
insert into public.clubs (name, slug, created_by, type)
select 'Clubtest Filler ' || g, 'clubtest-filler-' || g, 'a2000000-0000-4000-8000-00000000000a', 'online'
from generate_series(1, 20) g;
insert into public.club_members (club_id, user_id)
select id, 'c2000000-0000-4000-8000-00000000000c' from public.clubs
where slug like 'clubtest-filler-%' and slug <> 'clubtest-filler-20';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c2000000-0000-4000-8000-00000000000c', true);
insert into results
select 'C is in 20 clubs', '20',
       (select count(*)::text from public.club_members where user_id = 'c2000000-0000-4000-8000-00000000000c'), null;
select pg_temp.try('a 21st club is refused',
  format('select public.join_club(%L)', (select id from public.clubs where slug = 'clubtest-filler-20')), 'club_limit');
reset role;

-- ── Grants ─────────────────────────────────────────────────────────────────
insert into results
select 'signed-out users can''t call the write RPCs', 'false|false|false',
       concat_ws('|',
         has_function_privilege('anon', 'public.create_club(text, text, text, text, text[], boolean)', 'execute')::text,
         has_function_privilege('anon', 'public.join_club(uuid)', 'execute')::text,
         has_function_privilege('anon', 'public.use_club_invite(text)', 'execute')::text), null;
insert into results
select 'trigger and internal functions aren''t callable', 'false|false|false',
       concat_ws('|',
         has_function_privilege('authenticated', 'public.before_club_post_insert()', 'execute')::text,
         has_function_privilege('authenticated', 'public.notify_club_request()', 'execute')::text,
         has_function_privilege('authenticated', 'public.assert_can_join(uuid, uuid)', 'execute')::text), null;
insert into results
select 'clients can update only content columns of a post', 'false|true',
       concat_ws('|',
         has_column_privilege('authenticated', 'public.club_posts', 'pinned_at', 'update')::text,
         has_column_privilege('authenticated', 'public.club_posts', 'body', 'update')::text), null;

update results
set verdict = case when expected = actual then 'PASS' else 'FAIL' end
where verdict is null;

select step, expected, actual, verdict from results;

rollback;
