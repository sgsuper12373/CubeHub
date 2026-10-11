-- Test for 20261014000000_profile_progress.sql: PB progression, activity
-- streaks, learning progress and the section toggles.
--
-- SAFE TO RUN ON PRODUCTION. Everything happens inside a transaction that ends
-- in ROLLBACK. It creates two throwaway users, a throwaway algorithm set, and
-- acts as the users the way PostgREST does. Run in the Supabase dashboard SQL
-- editor; expect every row to be PASS.

begin;

-- This is the TEST. Its migration must be applied first.
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'get_pb_progression') then
    raise exception 'Apply supabase/migrations/20261014000000_profile_progress.sql first, then run this test.';
  end if;
end;
$$;

create temp table results (step text, expected text, actual text, verdict text)
on commit drop;
grant all on results to anon, authenticated;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'progress-test-a@example.com', '{}'),
  ('b0000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'progress-test-b@example.com', '{}');

insert into public.sessions (id, user_id, puzzle_type, name) values
  ('b0000000-5e55-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'pyra', 'B pyra'),
  ('a0000000-5e55-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'pyra', 'A pyra');

-- B's Pyraminx solves, at noon India time on days relative to today (IST),
-- except one at 20:00 UTC that is already the next day in India.
--   days −20…−16 (a 5-day run): 12.00, 10.00, 11.00, 9.00, 9.50
--   day −2 via 20:00 UTC on day −3: DNF;  day −1: 8.00;  day 0: 8.50
do $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_b     uuid := 'b0000000-0000-4000-8000-00000000000b';
  v_s     uuid := 'b0000000-5e55-4000-8000-000000000001';
  noon    time := '12:00';
begin
  insert into public.solves (user_id, session_id, puzzle_type, time_ms, penalty, scramble, created_at) values
    (v_b, v_s, 'pyra', 12000, 'none', 'R', ((v_today - 20) + noon) at time zone 'Asia/Kolkata'),
    (v_b, v_s, 'pyra', 10000, 'none', 'R', ((v_today - 19) + noon) at time zone 'Asia/Kolkata'),
    (v_b, v_s, 'pyra', 11000, 'none', 'R', ((v_today - 18) + noon) at time zone 'Asia/Kolkata'),
    (v_b, v_s, 'pyra',  9000, 'none', 'R', ((v_today - 17) + noon) at time zone 'Asia/Kolkata'),
    (v_b, v_s, 'pyra',  9500, 'none', 'R', ((v_today - 16) + noon) at time zone 'Asia/Kolkata'),
    (v_b, v_s, 'pyra',  7000, 'dnf',  'R', ((v_today - 3) + time '20:00') at time zone 'UTC'),
    (v_b, v_s, 'pyra',  8000, 'none', 'R', ((v_today - 1) + noon) at time zone 'Asia/Kolkata'),
    (v_b, v_s, 'pyra',  8500, 'none', 'R', ((v_today - 0) + time '01:00') at time zone 'Asia/Kolkata');

  -- A: one solve, the day before yesterday — a streak that has already ended.
  insert into public.solves (user_id, session_id, puzzle_type, time_ms, scramble, created_at) values
    ('a0000000-0000-4000-8000-00000000000a', 'a0000000-5e55-4000-8000-000000000001', 'pyra', 5000, 'R',
     ((v_today - 2) + noon) at time zone 'Asia/Kolkata');
end;
$$;

-- A throwaway algorithm set: 3 cases; B learns case 1 through its SECOND
-- algorithm. A second set where nothing is learned must not appear.
insert into public.algorithm_subsets (id, puzzle_type, slug, name, order_index) values
  ('c0000000-5b5e-4000-8000-000000000001', 'pyra', 'zz-test', 'ZZ Test', 99),
  ('c0000000-5b5e-4000-8000-000000000002', 'pyra', 'zz-empty', 'ZZ Empty', 98);
insert into public.algorithm_cases (id, puzzle_type, subset, case_number, name, cube_state) values
  ('c0000000-ca5e-4000-8000-000000000001', 'pyra', 'zz-test', 1, 'one', 'R'),
  ('c0000000-ca5e-4000-8000-000000000002', 'pyra', 'zz-test', 2, 'two', 'R'),
  ('c0000000-ca5e-4000-8000-000000000003', 'pyra', 'zz-test', 3, 'three', 'R'),
  ('c0000000-ca5e-4000-8000-000000000004', 'pyra', 'zz-empty', 1, 'lonely', 'R');
insert into public.algorithms (id, case_id, moves) values
  ('c0000000-a160-4000-8000-000000000001', 'c0000000-ca5e-4000-8000-000000000001', 'R U'),
  ('c0000000-a160-4000-8000-000000000002', 'c0000000-ca5e-4000-8000-000000000001', 'U R'),
  ('c0000000-a160-4000-8000-000000000003', 'c0000000-ca5e-4000-8000-000000000002', 'R'),
  ('c0000000-a160-4000-8000-000000000004', 'c0000000-ca5e-4000-8000-000000000004', 'L');
insert into public.user_algorithm_bookmarks (user_id, algorithm_id, learned) values
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-a160-4000-8000-000000000002', true),
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-a160-4000-8000-000000000004', false);

-- The PB the triggers stored, to compare the progression's last point with.
create temp table b_pbs as
select category, time_ms from public.personal_bests
where user_id = 'b0000000-0000-4000-8000-00000000000b' and puzzle_type = 'pyra';
grant select on b_pbs to authenticated;

-- ── As A, looking at B (public, everything shown) ─────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);

insert into results
select 'single progression keeps only improvements', '[12000, 10000, 9000, 8000]',
       (select jsonb_agg((p->>'ms')::int)::text
        from jsonb_array_elements(public.get_pb_progression('b0000000-0000-4000-8000-00000000000b', 'pyra')->'single') p), null;
insert into results
select 'ao5 progression (one DNF trimmed)', '[10170, 9830, 9000]',
       (select jsonb_agg((p->>'ms')::int)::text
        from jsonb_array_elements(public.get_pb_progression('b0000000-0000-4000-8000-00000000000b', 'pyra')->'ao5') p), null;
insert into results
select 'last ao5 point equals the stored PB', (select time_ms::text from b_pbs where category = 'ao5'),
       (select (p->>'ms') from jsonb_array_elements(public.get_pb_progression('b0000000-0000-4000-8000-00000000000b', 'pyra')->'ao5') p
        order by (p->>'at')::timestamptz desc limit 1), null;
insert into results
select 'last single point equals the stored PB', (select time_ms::text from b_pbs where category = 'single'),
       (select (p->>'ms') from jsonb_array_elements(public.get_pb_progression('b0000000-0000-4000-8000-00000000000b', 'pyra')->'single') p
        order by (p->>'at')::timestamptz desc limit 1), null;
insert into results
select 'ao12 with 8 solves has no points', '[]',
       (public.get_pb_progression('b0000000-0000-4000-8000-00000000000b', 'pyra')->'ao12')::text, null;

insert into results
select 'streaks: current 3 (20:00 UTC counts next IST day), longest 5, 8 active days', '3|5|8|8',
       concat_ws('|',
         public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->'activity'->>'current_streak',
         public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->'activity'->>'longest_streak',
         public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->'activity'->>'active_days',
         jsonb_array_length(public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->'activity'->'days')), null;
insert into results
select 'a streak ending the day before yesterday is over', '0|1',
       concat_ws('|',
         public.get_profile_stats('a0000000-0000-4000-8000-00000000000a')->'activity'->>'current_streak',
         public.get_profile_stats('a0000000-0000-4000-8000-00000000000a')->'activity'->>'longest_streak'), null;

insert into results
select 'learning: 1 of 3 via a second algorithm; untouched set left out', 'zz-test 1/3',
       (select string_agg((l->>'slug') || ' ' || (l->>'learned') || '/' || (l->>'total'), ', ')
        from jsonb_array_elements(public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->'learning') l
        where l->>'slug' like 'zz-%'), null;
reset role;

-- ── Toggles off ───────────────────────────────────────────────────────────
update public.profiles set show_activity = false, show_learning = false
where id = 'b0000000-0000-4000-8000-00000000000b';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
insert into results
select 'hidden sections: another user gets null activity and learning', 'null|null',
       concat_ws('|',
         coalesce((public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->'activity')::text, 'missing'),
         coalesce((public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->'learning')::text, 'missing')), null;
insert into results
select 'hidden sections: totals still shown', '8',
       public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->>'total_solves', null;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true);
insert into results
select 'hidden sections: the owner still sees both', 'true|true',
       concat_ws('|',
         (jsonb_typeof(public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->'activity') = 'object')::text,
         (jsonb_typeof(public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->'learning') = 'array')::text), null;
reset role;

-- ── Private profile ───────────────────────────────────────────────────────
update public.profiles set is_public = false where id = 'b0000000-0000-4000-8000-00000000000b';

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
insert into results
select 'private: no progression for visitors', '{"private": true}',
       public.get_pb_progression('b0000000-0000-4000-8000-00000000000b', 'pyra')::text, null;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true);
insert into results
select 'private: the owner still gets their progression', '4',
       jsonb_array_length(public.get_pb_progression('b0000000-0000-4000-8000-00000000000b', 'pyra')->'single')::text, null;
reset role;

insert into results
select 'the window helper is not callable through the API', 'false',
       has_function_privilege('anon', 'public.average_progression(uuid, public.puzzle_type, integer)', 'execute')::text, null;

update results
set verdict = case when expected = actual then 'PASS' else 'FAIL' end
where verdict is null;

select step, expected, actual, verdict from results;

rollback;
