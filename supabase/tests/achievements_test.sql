-- Test for 20261015000000_achievements.sql: awarding and visibility.
--
-- SAFE TO RUN ON PRODUCTION. Everything happens inside a transaction that ends
-- in ROLLBACK. It creates two throwaway users and a throwaway algorithm set,
-- and acts as the users the way PostgREST does. Run in the Supabase dashboard
-- SQL editor; expect every row to be PASS.

begin;

-- This is the TEST. Its migration must be applied first.
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'award_achievements') then
    raise exception 'Apply supabase/migrations/20261015000000_achievements.sql first, then run this test.';
  end if;
end;
$$;

create temp table results (step text, expected text, actual text, verdict text)
on commit drop;
grant all on results to anon, authenticated;

-- Each call's unlocks, kept so later checks can read them as the test role.
create temp table unlocked (call text, slugs text)
on commit drop;
grant all on unlocked to authenticated;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ach-test-a@example.com', '{}'),
  ('b0000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ach-test-b@example.com', '{}');
insert into public.sessions (id, user_id, puzzle_type, name) values
  ('b0000000-5e55-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', '333', 'B 3x3');

-- A throwaway 3x3 set with 2 cases, and a badge pointing at it, so the
-- set_learned rule is tested without depending on this database's PLL/OLL.
insert into public.algorithm_subsets (id, puzzle_type, slug, name, order_index) values
  ('c0000000-5b5e-4000-8000-000000000001', '333', 'zz-ach', 'ZZ Ach', 99);
insert into public.algorithm_cases (id, puzzle_type, subset, case_number, name, cube_state) values
  ('c0000000-ca5e-4000-8000-000000000001', '333', 'zz-ach', 1, 'one', 'R'),
  ('c0000000-ca5e-4000-8000-000000000002', '333', 'zz-ach', 2, 'two', 'R');
insert into public.algorithms (id, case_id, moves) values
  ('c0000000-a160-4000-8000-000000000001', 'c0000000-ca5e-4000-8000-000000000001', 'R U'),
  ('c0000000-a160-4000-8000-000000000002', 'c0000000-ca5e-4000-8000-000000000002', 'U R');
insert into public.achievements (slug, title, description, category, condition_type, condition_value) values
  ('zz-ach-done', 'ZZ test', 'test', 'tutorial', 'set_learned', '{"puzzle": "333", "slug": "zz-ach"}');

-- ── 1. One solve → First Turn, once ───────────────────────────────────────
insert into public.solves (user_id, session_id, puzzle_type, time_ms, scramble, source, created_at) values
  ('b0000000-0000-4000-8000-00000000000b', 'b0000000-5e55-4000-8000-000000000001', '333', 45000, 'R', 'web',
   ((now() at time zone 'Asia/Kolkata')::date - 30 + time '12:00') at time zone 'Asia/Kolkata');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true);
insert into unlocked select 'first', (select string_agg(x->>'slug', ',' order by x->>'slug') from jsonb_array_elements(public.award_achievements()) x);
insert into unlocked select 'again', coalesce((select string_agg(x->>'slug', ',') from jsonb_array_elements(public.award_achievements()) x), '');
reset role;
insert into results select 'one 45 s solve: First Turn and Sub-60', '333-sub-60,first-solve', (select slugs from unlocked where call = 'first'), null;
insert into results select 'calling again awards nothing twice', '', (select slugs from unlocked where call = 'again'), null;

-- ── 2. Typed 9.00 doesn't count; timed 18.00 does ─────────────────────────
insert into public.solves (user_id, session_id, puzzle_type, time_ms, scramble, source, created_at) values
  ('b0000000-0000-4000-8000-00000000000b', 'b0000000-5e55-4000-8000-000000000001', '333',  9000, 'R', 'manual', now() - interval '29 days'),
  ('b0000000-0000-4000-8000-00000000000b', 'b0000000-5e55-4000-8000-000000000001', '333', 18000, 'R', 'web',    now() - interval '28 days');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true);
insert into unlocked select 'speed', (select string_agg(x->>'slug', ',' order by x->>'slug') from jsonb_array_elements(public.award_achievements()) x);
reset role;
insert into results select 'typed 9.00 ignored; timed 18.00 gives Sub-30 and Sub-20', '333-sub-20,333-sub-30',
  (select slugs from unlocked where call = 'speed'), null;

-- ── 3. A timer Ao5 under 20 s; 7 IST days in a row; a 03:00 IST solve ─────
do $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  i integer;
begin
  -- Seven consecutive days ending today, noon IST, all 19.00 or faster.
  for i in 0 .. 6 loop
    insert into public.solves (user_id, session_id, puzzle_type, time_ms, scramble, source, created_at) values
      ('b0000000-0000-4000-8000-00000000000b', 'b0000000-5e55-4000-8000-000000000001', '333',
       19000 - i * 100, 'R', 'web', ((v_today - 6 + i) + time '12:00') at time zone 'Asia/Kolkata');
  end loop;
  -- 03:00 India time, yesterday.
  insert into public.solves (user_id, session_id, puzzle_type, time_ms, scramble, source, created_at) values
    ('b0000000-0000-4000-8000-00000000000b', 'b0000000-5e55-4000-8000-000000000001', '333',
     25000, 'R', 'web', ((v_today - 1) + time '03:00') at time zone 'Asia/Kolkata');
end;
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true);
insert into unlocked select 'habits', (select string_agg(x->>'slug', ',' order by x->>'slug') from jsonb_array_elements(public.award_achievements()) x);
reset role;
insert into results select 'Ao5 under 20 s, a 7-day streak and a 3 am solve', '333-ao5-sub-20,night-owl,streak-7',
  (select slugs from unlocked where call = 'habits'), null;

-- ── 4. A set counts only when every case is learned ───────────────────────
insert into public.user_algorithm_bookmarks (user_id, algorithm_id, learned) values
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-a160-4000-8000-000000000001', true);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true);
insert into unlocked select 'half', coalesce((select string_agg(x->>'slug', ',') from jsonb_array_elements(public.award_achievements()) x), '');
reset role;
insert into public.user_algorithm_bookmarks (user_id, algorithm_id, learned) values
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-a160-4000-8000-000000000002', true);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true);
insert into unlocked select 'full', coalesce((select string_agg(x->>'slug', ',') from jsonb_array_elements(public.award_achievements()) x), '');
reset role;
insert into results select 'half a set learned: nothing', '', (select slugs from unlocked where call = 'half'), null;
insert into results select 'whole set learned: its badge', 'zz-ach-done', (select slugs from unlocked where call = 'full'), null;

-- ── 5. Access ─────────────────────────────────────────────────────────────
insert into results
select 'signed-out visitors cannot award', 'false',
       has_function_privilege('anon', 'public.award_achievements()', 'execute')::text, null;
insert into results
select 'the helpers are not callable through the API', 'false|false',
       has_function_privilege('authenticated', 'public.best_timer_average(uuid, public.puzzle_type, integer)', 'execute')::text
       || '|' || has_function_privilege('authenticated', 'public.learned_sets(uuid)', 'execute')::text, null;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
insert into results
-- first-solve, Sub-60/30/20, Ao5 sub-20, night owl, 7-day streak, the test set.
select 'another user sees B''s badges while B is public', '8',
       (select count(*)::text from public.user_achievements where user_id = 'b0000000-0000-4000-8000-00000000000b'), null;
reset role;

update public.profiles set is_public = false where id = 'b0000000-0000-4000-8000-00000000000b';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
insert into results
select 'and none once B is private', '0',
       (select count(*)::text from public.user_achievements where user_id = 'b0000000-0000-4000-8000-00000000000b'), null;
reset role;

update results
set verdict = case when expected = actual then 'PASS' else 'FAIL' end
where verdict is null;

select step, expected, actual, verdict from results;

rollback;
