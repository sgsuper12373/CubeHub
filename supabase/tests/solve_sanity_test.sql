-- Test for 20261019000000_solve_sanity.sql: misfires and left-out solves,
-- server-side achievements with real dates, the activity feed, suggestions.
--
-- SAFE TO RUN ON PRODUCTION. Everything happens inside a transaction that ends
-- in ROLLBACK. It creates three throwaway users and acts as them the way
-- PostgREST does. Run in the Supabase dashboard SQL editor; expect every row
-- to be PASS.

begin;

do $$
begin
  if not exists (select 1 from pg_proc where proname = 'achievement_earned_at') then
    raise exception 'Apply supabase/migrations/20261019000000_solve_sanity.sql first, then run this test.';
  end if;
end;
$$;

create temp table results (step text, expected text, actual text, verdict text)
on commit drop;
grant all on results to anon, authenticated;

create temp table seen (call text, val text)
on commit drop;
grant all on seen to authenticated;

-- A: the cuber. B: follows A. C: private, nobody follows.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
  ('a1000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'san-a@example.com', '{}'),
  ('b1000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'san-b@example.com', '{}'),
  ('c1000000-0000-4000-8000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'san-c@example.com', '{}');
update public.profiles set is_public = false where id = 'c1000000-0000-4000-8000-00000000000c';
insert into public.sessions (id, user_id, puzzle_type, name) values
  ('a1000000-5e55-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', '333', 'A 3x3'),
  ('a1000000-5e55-4000-8000-000000000002', 'a1000000-0000-4000-8000-00000000000a', '222', 'A 2x2'),
  ('c1000000-5e55-4000-8000-000000000001', 'c1000000-0000-4000-8000-00000000000c', '333', 'C 3x3');
insert into public.user_follows (follower_id, following_id) values
  ('b1000000-0000-4000-8000-00000000000b', 'a1000000-0000-4000-8000-00000000000a');

-- ── 1. A misfire is never a record ─────────────────────────────────────────
-- Six 3x3 solves 20 days ago: 20, 0.15 (misfire), 21, 22, 23, 24 seconds.
insert into public.solves (id, user_id, session_id, puzzle_type, time_ms, scramble, created_at) values
  ('a1000000-0001-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'a1000000-5e55-4000-8000-000000000001', '333', 20000, 'R', now() - interval '20 days' + interval '1 minute'),
  ('a1000000-0001-4000-8000-000000000002', 'a1000000-0000-4000-8000-00000000000a', 'a1000000-5e55-4000-8000-000000000001', '333',   150, 'R', now() - interval '20 days' + interval '2 minutes'),
  ('a1000000-0001-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'a1000000-5e55-4000-8000-000000000001', '333', 21000, 'R', now() - interval '20 days' + interval '3 minutes'),
  ('a1000000-0001-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000a', 'a1000000-5e55-4000-8000-000000000001', '333', 22000, 'R', now() - interval '20 days' + interval '4 minutes');
insert into public.solves (id, user_id, session_id, puzzle_type, time_ms, scramble, created_at) values
  ('a1000000-0001-4000-8000-000000000005', 'a1000000-0000-4000-8000-00000000000a', 'a1000000-5e55-4000-8000-000000000001', '333', 23000, 'R', now() - interval '20 days' + interval '5 minutes'),
  ('a1000000-0001-4000-8000-000000000006', 'a1000000-0000-4000-8000-00000000000a', 'a1000000-5e55-4000-8000-000000000001', '333', 24000, 'R', now() - interval '20 days' + interval '6 minutes');

insert into results
select '3x3 single skips the 0.15 misfire', '20000',
       (select time_ms::text from public.personal_bests
        where user_id = 'a1000000-0000-4000-8000-00000000000a' and puzzle_type = '333' and category = 'single'), null;
-- Counted: 20, 21, 22, 23, 24 → Ao5 = mean(21, 22, 23) = 22.00 (the misfire is skipped, not a DNF).
insert into results
select '3x3 Ao5 closes over the counted solves', '22000',
       (select time_ms::text from public.personal_bests
        where user_id = 'a1000000-0000-4000-8000-00000000000a' and puzzle_type = '333' and category = 'ao5'), null;
insert into results
-- Best counted mean: 20, 21, 22. With the misfire it would have been 13.72.
select 'Mo3 never includes the misfire', '21000',
       (select time_ms::text from public.personal_bests
        where user_id = 'a1000000-0000-4000-8000-00000000000a' and puzzle_type = '333' and category = 'mean3'), null;

-- A 2x2 0.30 is a misfire too (limit 0.40); 0.50 isn't.
insert into public.solves (user_id, session_id, puzzle_type, time_ms, scramble, created_at) values
  ('a1000000-0000-4000-8000-00000000000a', 'a1000000-5e55-4000-8000-000000000002', '222', 300, 'R', now() - interval '19 days');
insert into results
select '2x2 0.30 only: no single PB', '0',
       (select count(*)::text from public.personal_bests
        where user_id = 'a1000000-0000-4000-8000-00000000000a' and puzzle_type = '222'), null;
insert into public.solves (user_id, session_id, puzzle_type, time_ms, scramble, created_at) values
  ('a1000000-0000-4000-8000-00000000000a', 'a1000000-5e55-4000-8000-000000000002', '222', 500, 'R', now() - interval '19 days' + interval '1 minute');
insert into results
select '2x2 0.50 counts', '500',
       (select time_ms::text from public.personal_bests
        where user_id = 'a1000000-0000-4000-8000-00000000000a' and puzzle_type = '222' and category = 'single'), null;

-- ── 2. Leaving a solve out, and putting it back ────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-00000000000a', true);
update public.solves set excluded = true where id = 'a1000000-0001-4000-8000-000000000001';
reset role;
insert into results
select 'left-out 20.00: single falls back to 21.00', '21000',
       (select time_ms::text from public.personal_bests
        where user_id = 'a1000000-0000-4000-8000-00000000000a' and puzzle_type = '333' and category = 'single'), null;
insert into results
select 'and the Ao5 needs five counted solves again', '0',
       (select count(*)::text from public.personal_bests
        where user_id = 'a1000000-0000-4000-8000-00000000000a' and puzzle_type = '333' and category = 'ao5'), null;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-00000000000a', true);
update public.solves set excluded = false where id = 'a1000000-0001-4000-8000-000000000001';
reset role;
insert into results
select 'put back: single is 20.00 again', '20000',
       (select time_ms::text from public.personal_bests
        where user_id = 'a1000000-0000-4000-8000-00000000000a' and puzzle_type = '333' and category = 'single'), null;

insert into results
select 'PB timeline skips the misfire', '20000',
       (select string_agg(x->>'ms', ',')
        from jsonb_array_elements(public.get_pb_progression('a1000000-0000-4000-8000-00000000000a', '333')->'single') x), null;

-- ── 3. Achievements: awarded by the trigger, dated when earned ─────────────
insert into results
select 'First Turn awarded without any RPC call', '1',
       (select count(*)::text from public.user_achievements ua
        join public.achievements a on a.id = ua.achievement_id
        where ua.user_id = 'a1000000-0000-4000-8000-00000000000a' and a.slug = 'first-solve'), null;
insert into results
select 'dated by the first counted solve, not today', 'true',
       (select (ua.unlocked_at = now() - interval '20 days' + interval '1 minute')::text
        from public.user_achievements ua
        join public.achievements a on a.id = ua.achievement_id
        where ua.user_id = 'a1000000-0000-4000-8000-00000000000a' and a.slug = 'first-solve'), null;
insert into results
select 'Sub-10 is not earned by the 0.15 misfire', '0',
       (select count(*)::text from public.user_achievements ua
        join public.achievements a on a.id = ua.achievement_id
        where ua.user_id = 'a1000000-0000-4000-8000-00000000000a' and a.slug = '333-sub-10'), null;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-00000000000a', true);
insert into seen select 'toast', (select string_agg(x->>'slug', ',' order by x->>'slug') from jsonb_array_elements(public.award_achievements()) x);
insert into seen select 'again', coalesce((select string_agg(x->>'slug', ',') from jsonb_array_elements(public.award_achievements()) x), '');
reset role;
insert into results select 'the RPC returns the unshown badges', '333-sub-30,333-sub-60,first-solve',
  (select val from seen where call = 'toast'), null;
insert into results select 'then nothing', '', (select val from seen where call = 'again'), null;

-- ── 4. The feed ────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-00000000000b', true);
insert into seen select 'feed-kinds', (select string_agg(distinct kind, ',' order by kind) from public.get_activity_feed('following', 30));
insert into seen select 'feed-practice', (select n::text || '@' || time_ms::text from public.get_activity_feed('following', 30)
                                          where kind = 'practice' and puzzle_type = '333');
reset role;
insert into results select 'B''s feed has A''s PBs, practice and badges', 'badge,pb,practice',
  (select val from seen where call = 'feed-kinds'), null;
insert into results select 'practice row: 5 counted solves, best 20.00', '5@20000',
  (select val from seen where call = 'feed-practice'), null;

update public.profiles set show_activity = false where id = 'a1000000-0000-4000-8000-00000000000a';
insert into public.solves (user_id, session_id, puzzle_type, time_ms, scramble, created_at) values
  ('c1000000-0000-4000-8000-00000000000c', 'c1000000-5e55-4000-8000-000000000001', '333', 30000, 'R', now() - interval '1 day');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-00000000000b', true);
insert into seen select 'no-practice', (select count(*)::text from public.get_activity_feed('following', 30) where kind = 'practice');
insert into seen select 'everyone-c', (select count(*)::text from public.get_activity_feed('everyone', 30)
                                       where user_id = 'c1000000-0000-4000-8000-00000000000c');
reset role;
insert into results select 'activity hidden: no practice rows', '0', (select val from seen where call = 'no-practice'), null;
insert into results select '"everyone" still leaves out a private profile', '0', (select val from seen where call = 'everyone-c'), null;

-- ── 5. Suggestions ─────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-00000000000a', true);
insert into seen select 'suggest', (select string_agg(user_id::text || ':' || follows_me::text, ',') from public.suggest_profiles());
reset role;
insert into results select 'A is suggested B (follows A, no solves); never private C',
  'b1000000-0000-4000-8000-00000000000b:true', (select val from seen where call = 'suggest'), null;

-- ── 6. Drill misfires stay out of the medians ─────────────────────────────
-- A 10-move algorithm: the limit is 0.60. Reps of 0.56, 1.20 and 1.40.
insert into public.algorithm_subsets (id, puzzle_type, slug, name, order_index) values
  ('c1000000-5b5e-4000-8000-000000000001', '333', 'zz-san', 'ZZ San', 99);
insert into public.algorithm_cases (id, puzzle_type, subset, case_number, name, cube_state) values
  ('c1000000-ca5e-4000-8000-000000000001', '333', 'zz-san', 1, 'one', 'R');
insert into public.algorithms (id, case_id, moves, is_approved) values
  ('c1000000-a160-4000-8000-000000000001', 'c1000000-ca5e-4000-8000-000000000001', 'R U R'' U R d'' R U'' R'' F''', true);
insert into public.drill_attempts (user_id, algorithm_id, time_ms) values
  ('a1000000-0000-4000-8000-00000000000a', 'c1000000-a160-4000-8000-000000000001',  560),
  ('a1000000-0000-4000-8000-00000000000a', 'c1000000-a160-4000-8000-000000000001', 1200),
  ('a1000000-0000-4000-8000-00000000000a', 'c1000000-a160-4000-8000-000000000001', 1400);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-00000000000a', true);
insert into seen select 'drill', (select attempts::text || '@' || median_ms::text from public.v_drill_variant_stats
                                  where algorithm_id = 'c1000000-a160-4000-8000-000000000001');
reset role;
insert into results select 'drill median skips the 0.56 on a 10-move alg; count keeps it', '3@1300',
  (select val from seen where call = 'drill'), null;

-- ── 7. Access ──────────────────────────────────────────────────────────────
insert into results
select 'internals are not callable through the API', 'false|false|false',
       has_function_privilege('authenticated', 'public.award_achievements_for(uuid)', 'execute')::text
       || '|' || has_function_privilege('authenticated', 'public.achievement_earned_at(uuid, text, jsonb)', 'execute')::text
       || '|' || has_function_privilege('authenticated', 'public.learned_sets_at(uuid)', 'execute')::text, null;
insert into results
select 'signed-out visitors get no feed', 'false',
       has_function_privilege('anon', 'public.get_activity_feed(text, integer)', 'execute')::text, null;

update results
set verdict = case when expected = actual then 'PASS' else 'FAIL' end
where verdict is null;

select step, expected, actual, verdict from results;

rollback;
