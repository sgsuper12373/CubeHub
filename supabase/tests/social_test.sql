-- Test for 20261018000100_social.sql: follows and requests, privacy through
-- approved follows, blocks, rate limits, reports and notifications.
--
-- SAFE TO RUN ON PRODUCTION. Everything happens inside a transaction that ends
-- in ROLLBACK. It creates three throwaway users and acts as them the way
-- PostgREST does. Run in the dashboard SQL editor, or with
-- `supabase db query --linked -f supabase/tests/social_test.sql`; expect every
-- row to be PASS.
--
--   A = a0…0a, B = b0…0b, C = c0…0c

begin;

-- This is the TEST. Its migration must be applied first.
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'get_follow_summary') then
    raise exception 'Apply supabase/migrations/20261018000100_social.sql first, then run this test.';
  end if;
end;
$$;

create temp table results (step text, expected text, actual text, verdict text)
on commit drop;
grant all on results to anon, authenticated;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'social-test-a@example.com', '{}'),
  ('b0000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'social-test-b@example.com', '{}'),
  ('c0000000-0000-4000-8000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'social-test-c@example.com', '{}');

-- A's username, for the search check (B won't be able to read it later).
create temp table a_name as
select username from public.profiles where id = 'a0000000-0000-4000-8000-00000000000a';
grant select on a_name to authenticated;

-- B has a 3x3 single PB to look at.
insert into public.personal_bests (user_id, puzzle_type, category, time_ms, achieved_at)
values ('b0000000-0000-4000-8000-00000000000b', '333', 'single', 9876, now() - interval '1 day');

-- ── A follows public B ─────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
insert into public.user_follows (follower_id, following_id, status)
values ('a0000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-00000000000b', 'pending');
insert into results
select 'following a public profile is accepted at once (client status ignored)', 'accepted',
       (select status from public.user_follows
        where follower_id = 'a0000000-0000-4000-8000-00000000000a'
          and following_id = 'b0000000-0000-4000-8000-00000000000b'), null;
do $$
begin
  insert into public.user_follows (follower_id, following_id)
  values ('a0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-00000000000a');
  insert into results values ('self-follow is rejected', 'error', 'inserted', null);
exception when others then
  insert into results values ('self-follow is rejected', 'error', 'error', null);
end;
$$;
do $$
begin
  insert into public.user_follows (follower_id, following_id)
  values ('c0000000-0000-4000-8000-00000000000c', 'b0000000-0000-4000-8000-00000000000b');
  insert into results values ('cannot follow on someone else''s behalf', 'error', 'inserted', null);
exception when others then
  insert into results values ('cannot follow on someone else''s behalf', 'error', 'error', null);
end;
$$;
reset role;

insert into results
select 'B is notified of the new follower', 'follow',
       (select string_agg(type::text, ',') from public.notifications
        where user_id = 'b0000000-0000-4000-8000-00000000000b'), null;

-- ── B goes private; C requests ─────────────────────────────────────────────
update public.profiles set is_public = false where id = 'b0000000-0000-4000-8000-00000000000b';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-00000000000c', true);
insert into public.user_follows (follower_id, following_id)
values ('c0000000-0000-4000-8000-00000000000c', 'b0000000-0000-4000-8000-00000000000b');
insert into results
select 'following a private profile makes a pending request', 'pending',
       (select status from public.user_follows
        where follower_id = 'c0000000-0000-4000-8000-00000000000c'
          and following_id = 'b0000000-0000-4000-8000-00000000000b'), null;
insert into results
select 'pending: the private profile stays hidden (stats, PBs)', 'true|0',
       concat_ws('|',
         public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->>'private',
         (select count(*) from public.personal_bests where user_id = 'b0000000-0000-4000-8000-00000000000b')), null;
update public.user_follows set status = 'accepted'
where follower_id = 'c0000000-0000-4000-8000-00000000000c'
  and following_id = 'b0000000-0000-4000-8000-00000000000b';
insert into results
select 'the requester cannot accept their own request', 'pending',
       (select status from public.user_follows
        where follower_id = 'c0000000-0000-4000-8000-00000000000c'
          and following_id = 'b0000000-0000-4000-8000-00000000000b'), null;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
insert into results
select 'A, an accepted follower, still sees private B', 'true|1',
       concat_ws('|',
         public.profile_visible('b0000000-0000-4000-8000-00000000000b'),
         (select count(*) from public.personal_bests where user_id = 'b0000000-0000-4000-8000-00000000000b')), null;
reset role;

insert into results
select 'B gets a follow_request notification from C', 'follow_request',
       (select type::text from public.notifications
        where user_id = 'b0000000-0000-4000-8000-00000000000b'
          and data ->> 'actor_id' = 'c0000000-0000-4000-8000-00000000000c'), null;

-- ── B accepts ──────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true);
update public.user_follows set status = 'accepted'
where follower_id = 'c0000000-0000-4000-8000-00000000000c'
  and following_id = 'b0000000-0000-4000-8000-00000000000b';
reset role;

insert into results
select 'accepting sets status and responded_at', 'accepted|true',
       (select status || '|' || (responded_at is not null)::text from public.user_follows
        where follower_id = 'c0000000-0000-4000-8000-00000000000c'
          and following_id = 'b0000000-0000-4000-8000-00000000000b'), null;
insert into results
select 'accepting: request notification gone, C told', '0|follow_accepted',
       concat_ws('|',
         (select count(*) from public.notifications
          where user_id = 'b0000000-0000-4000-8000-00000000000b' and type = 'follow_request'),
         (select type::text from public.notifications
          where user_id = 'c0000000-0000-4000-8000-00000000000c')), null;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-00000000000c', true);
insert into results
select 'accepted: C now sees B (stats, PBs)', 'false|1',
       concat_ws('|',
         public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->>'private',
         (select count(*) from public.personal_bests where user_id = 'b0000000-0000-4000-8000-00000000000b')), null;
insert into results
select 'summary for C looking at B', '2|0|accepted|false',
       (select concat_ws('|', s->>'followers', s->>'following', s->>'i_follow', s->>'follows_me')
        from public.get_follow_summary('b0000000-0000-4000-8000-00000000000b') s), null;
insert into results
select 'friends leaderboard for C lists B''s single', 'b|9876',
       (select left(user_id::text, 1) || '|' || time_ms
        from public.get_friends_leaderboard('333', 'single')), null;
insert into results
select 'recent PBs for C include B''s single', '1',
       (select count(*)::text from public.get_friends_recent_pbs(14)), null;
reset role;

-- ── Anon and the follow graph ──────────────────────────────────────────────
update public.profiles set is_public = false where id = 'c0000000-0000-4000-8000-00000000000c';
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
insert into results
select 'anon: a follow between two private profiles is hidden', '0',
       (select count(*)::text from public.user_follows
        where follower_id = 'c0000000-0000-4000-8000-00000000000c'), null;
insert into results
select 'anon: counts are still shown', '2',
       public.get_follow_summary('b0000000-0000-4000-8000-00000000000b')->>'followers', null;
reset role;
update public.profiles set is_public = true where id = 'c0000000-0000-4000-8000-00000000000c';

-- ── Unfollow, then going public accepts pending requests ───────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-00000000000c', true);
delete from public.user_follows
where follower_id = 'c0000000-0000-4000-8000-00000000000c'
  and following_id = 'b0000000-0000-4000-8000-00000000000b';
insert into public.user_follows (follower_id, following_id)
values ('c0000000-0000-4000-8000-00000000000c', 'b0000000-0000-4000-8000-00000000000b');
reset role;
update public.profiles set is_public = true where id = 'b0000000-0000-4000-8000-00000000000b';
insert into results
select 'going public accepts pending requests', 'accepted',
       (select status from public.user_follows
        where follower_id = 'c0000000-0000-4000-8000-00000000000c'
          and following_id = 'b0000000-0000-4000-8000-00000000000b'), null;

-- B declines-by-removing: the followed side may delete the row.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true);
delete from public.user_follows
where follower_id = 'c0000000-0000-4000-8000-00000000000c'
  and following_id = 'b0000000-0000-4000-8000-00000000000b';
reset role;
insert into results
select 'the followed cuber can remove a follower', '0',
       (select count(*)::text from public.user_follows
        where follower_id = 'c0000000-0000-4000-8000-00000000000c'), null;

-- ── Rate limit ─────────────────────────────────────────────────────────────
insert into public.social_rate_events (user_id, kind)
select 'c0000000-0000-4000-8000-00000000000c', 'follow' from generate_series(1, 50);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-00000000000c', true);
do $$
declare v_hint text;
begin
  insert into public.user_follows (follower_id, following_id)
  values ('c0000000-0000-4000-8000-00000000000c', 'a0000000-0000-4000-8000-00000000000a');
  insert into results values ('the 51st follow in an hour is refused', 'rate_limited', 'inserted', null);
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  insert into results values ('the 51st follow in an hour is refused', 'rate_limited', v_hint, null);
end;
$$;
insert into results
select 'rate events are not readable through the API', '0',
       (select count(*)::text from public.social_rate_events), null;
reset role;

-- ── Block ──────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
insert into public.user_blocks (blocker_id, blocked_id)
values ('a0000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-00000000000b');
insert into results
select 'block list for A', 'b',
       (select left(user_id::text, 1) from public.get_my_blocks()), null;
insert into results
select 'A no longer sees B''s profile row', '0',
       (select count(*)::text from public.profiles where id = 'b0000000-0000-4000-8000-00000000000b'), null;
reset role;

insert into results
select 'block removes follows both ways and their notifications', '0|0',
       concat_ws('|',
         (select count(*) from public.user_follows
          where 'a0000000-0000-4000-8000-00000000000a' in (follower_id, following_id)
            and 'b0000000-0000-4000-8000-00000000000b' in (follower_id, following_id)),
         (select count(*) from public.notifications
          where user_id = 'b0000000-0000-4000-8000-00000000000b'
            and data ->> 'actor_id' = 'a0000000-0000-4000-8000-00000000000a')), null;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true);
insert into results
select 'blocked B cannot see A (row, visibility, summary, search)', '0|false|null|0',
       concat_ws('|',
         (select count(*) from public.profiles where id = 'a0000000-0000-4000-8000-00000000000a'),
         public.profile_visible('a0000000-0000-4000-8000-00000000000a'),
         coalesce(public.get_follow_summary('a0000000-0000-4000-8000-00000000000a')::text, 'null'),
         (select count(*) from public.search_profiles((select username from a_name)) s
          where s.user_id = 'a0000000-0000-4000-8000-00000000000a')), null;
do $$
declare v_hint text;
begin
  insert into public.user_follows (follower_id, following_id)
  values ('b0000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-00000000000a');
  insert into results values ('blocked B cannot follow A', 'blocked', 'inserted', null);
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  insert into results values ('blocked B cannot follow A', 'blocked', v_hint, null);
end;
$$;
insert into results
select 'B cannot see A''s block row', '0',
       (select count(*)::text from public.user_blocks), null;
reset role;

-- ── Reports ────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-00000000000c', true);
insert into public.profile_reports (reporter_id, reported_id, reason, note)
values ('c0000000-0000-4000-8000-00000000000c', 'a0000000-0000-4000-8000-00000000000a', 'spam', 'test');
insert into results
select 'a non-admin cannot read reports, even their own', '0',
       (select count(*)::text from public.profile_reports), null;
reset role;
insert into results
select 'the report is stored', 'spam|open',
       (select reason || '|' || status from public.profile_reports
        where reporter_id = 'c0000000-0000-4000-8000-00000000000c'), null;

-- ── API surface ────────────────────────────────────────────────────────────
insert into results
select 'trigger functions are not callable through the API', 'false|false',
       concat_ws('|',
         has_function_privilege('authenticated', 'public.before_follow_insert()', 'execute'),
         has_function_privilege('anon', 'public.after_block_insert()', 'execute')), null;
insert into results
select 'clients can update only the follow status column', 'false|true',
       concat_ws('|',
         has_column_privilege('authenticated', 'public.user_follows', 'follower_id', 'update'),
         has_column_privilege('authenticated', 'public.user_follows', 'status', 'update')), null;

update results
set verdict = case when expected = actual then 'PASS' else 'FAIL' end
where verdict is null;

select step, expected, actual, verdict from results;

rollback;
