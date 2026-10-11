-- Test for 20261012000000_profile_stats.sql: public profile stats.
--
-- SAFE TO RUN ON PRODUCTION. Everything happens inside a transaction that ends
-- in ROLLBACK. It creates two throwaway auth users (and so profiles) and acts
-- as one of them the way PostgREST does.
--
-- Run in the Supabase dashboard SQL editor. Expect every row to be PASS.

begin;

create temp table results (step text, expected text, actual text, verdict text)
on commit drop;
grant all on results to anon, authenticated;

-- Two users: A (the visitor) and B (the profile being viewed).
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stats-test-a@example.com', '{}'),
  ('b0000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stats-test-b@example.com', '{}');

insert into public.sessions (id, user_id, puzzle_type, name) values
  ('b0000000-5e55-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', '333', 'B 3x3'),
  ('b0000000-5e55-4000-8000-000000000002', 'b0000000-0000-4000-8000-00000000000b', 'pyra', 'B pyra');

-- B: three 3x3 solves, one Pyraminx solve, and one soft-deleted 3x3 solve.
-- The first is at 20:00 UTC on 9 Oct = 01:30 IST on 10 Oct; the last at
-- 18:00 UTC on 11 Oct = 23:30 IST on 11 Oct. The deleted one is the latest of
-- all, so it would move last_solve_on if it were counted.
insert into public.solves (user_id, session_id, puzzle_type, time_ms, scramble, created_at, deleted_at) values
  ('b0000000-0000-4000-8000-00000000000b', 'b0000000-5e55-4000-8000-000000000001', '333',  12000, 'R', '2026-10-09 20:00:00+00', null),
  ('b0000000-0000-4000-8000-00000000000b', 'b0000000-5e55-4000-8000-000000000001', '333',  11000, 'R', '2026-10-10 12:00:00+00', null),
  ('b0000000-0000-4000-8000-00000000000b', 'b0000000-5e55-4000-8000-000000000001', '333',  10000, 'R', '2026-10-11 18:00:00+00', null),
  ('b0000000-0000-4000-8000-00000000000b', 'b0000000-5e55-4000-8000-000000000002', 'pyra',  4000, 'R', '2026-10-11 10:00:00+00', null),
  ('b0000000-0000-4000-8000-00000000000b', 'b0000000-5e55-4000-8000-000000000001', '333',   9000, 'R', '2026-10-12 08:00:00+00', now());

-- ── As user A ─────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

insert into results
select 'total excludes the soft-deleted solve', '4',
       public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->>'total_solves', null;
insert into results
select 'by_event splits by event', '{"333": 3, "pyra": 1}',
       (public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->'by_event')::text, null;
insert into results
select 'first_solve_on is the IST date (20:00 UTC → next day)', '2026-10-10',
       public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->>'first_solve_on', null;
insert into results
select 'last_solve_on ignores the deleted solve, in IST', '2026-10-11',
       public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->>'last_solve_on', null;
insert into results
select 'A still cannot read B''s solve rows', '0',
       (select count(*)::text from public.solves
        where user_id = 'b0000000-0000-4000-8000-00000000000b'), null;
insert into results
select 'a user with no solves gets zeros', '0|{}|',
       concat_ws('|',
         public.get_profile_stats('a0000000-0000-4000-8000-00000000000a')->>'total_solves',
         (public.get_profile_stats('a0000000-0000-4000-8000-00000000000a')->'by_event')::text,
         coalesce(public.get_profile_stats('a0000000-0000-4000-8000-00000000000a')->>'last_solve_on', '')), null;
reset role;

-- ── Signed out ────────────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
insert into results
select 'anon can read the stats', '4',
       public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->>'total_solves', null;
reset role;

update results
set verdict = case when expected = actual then 'PASS' else 'FAIL' end
where verdict is null;

select step, expected, actual, verdict from results;

rollback;
