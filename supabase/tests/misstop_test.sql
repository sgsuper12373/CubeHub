-- Test for 20261021000000_misstops.sql: the two mis-stop rules (through the
-- backfill), the 12-solve minimum, confirming and unconfirming, PB and badge
-- recompute in both directions, and no hard floor.
--
-- SAFE TO RUN ON PRODUCTION. Everything happens inside a transaction that ends
-- in ROLLBACK. It creates two throwaway users and acts as them the way
-- PostgREST does. The backfill also runs over everyone's solves, and that is
-- rolled back too. Run with
--   supabase db query --linked -f supabase/tests/misstop_test.sql
-- and expect every row to be PASS.

begin;

do $$
begin
  if not exists (select 1 from pg_proc where proname = 'backfill_misstops') then
    raise exception 'Apply supabase/migrations/20261021000000_misstops.sql first, then run this test.';
  end if;
end;
$$;

create temp table results (step text, expected text, actual text, verdict text)
on commit drop;
grant all on results to anon, authenticated;

-- A: a ~22 s 3x3 cuber with old solves to backfill. B: a single fast solve.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
  ('a2000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ms-a@example.com', '{}'),
  ('b2000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ms-b@example.com', '{}');
insert into public.sessions (id, user_id, puzzle_type, name) values
  ('a2000000-5e55-4000-8000-000000000001', 'a2000000-0000-4000-8000-00000000000a', '333', 'A 3x3'),
  ('b2000000-5e55-4000-8000-000000000001', 'b2000000-0000-4000-8000-00000000000b', '333', 'B 3x3');

-- ── 1. The reason follows `excluded` ───────────────────────────────────────
insert into public.solves (id, user_id, session_id, puzzle_type, time_ms, scramble, excluded, created_at) values
  ('b2000000-0001-4000-8000-000000000099', 'b2000000-0000-4000-8000-00000000000b', 'b2000000-5e55-4000-8000-000000000001', '333', 30000, 'R', true, now() - interval '30 days');
insert into results
select 'left out without a reason: reason is user', 'user',
       (select excluded_reason from public.solves where id = 'b2000000-0001-4000-8000-000000000099'), null;
update public.solves set excluded = false where id = 'b2000000-0001-4000-8000-000000000099';
insert into results
select 'counted again: no reason', 'null',
       (select coalesce(excluded_reason, 'null') from public.solves where id = 'b2000000-0001-4000-8000-000000000099'), null;
delete from public.solves where id = 'b2000000-0001-4000-8000-000000000099';

-- ── 2. No hard floor ───────────────────────────────────────────────────────
-- The app saves an implausible 1.50 flagged; B says it was real.
insert into public.solves (id, user_id, session_id, puzzle_type, time_ms, scramble, excluded, excluded_reason, created_at) values
  ('b2000000-0001-4000-8000-000000000001', 'b2000000-0000-4000-8000-00000000000b', 'b2000000-5e55-4000-8000-000000000001', '333', 1500, 'R', true, 'auto_misstop', now() - interval '9 days');
insert into results
select 'flagged 1.50: no single PB', '0',
       (select count(*)::text from public.personal_bests
        where user_id = 'b2000000-0000-4000-8000-00000000000b' and puzzle_type = '333'), null;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-00000000000b', true);
update public.solves set excluded = false, misstop_confirmed = true
where id = 'b2000000-0001-4000-8000-000000000001';
reset role;
insert into results
select 'marked real: 1.50 is the single PB', '1500',
       (select time_ms::text from public.personal_bests
        where user_id = 'b2000000-0000-4000-8000-00000000000b' and puzzle_type = '333' and category = 'single'), null;
insert into results
select 'and it earns Sub-10', '1',
       (select count(*)::text from public.user_achievements ua
        join public.achievements a on a.id = ua.achievement_id
        where ua.user_id = 'b2000000-0000-4000-8000-00000000000b' and a.slug = '333-sub-10'), null;

-- ── 3. Backfill: both rules, in order, only earlier solves ─────────────────
-- A's history, saved before flagging existed (nothing excluded):
--   01  1.50   implausible (under 2.00) → flagged
--   02–12      20 21 22 23 24 25 20 21 22 23 24: eleven counted solves
--   13  9.00   only 11 counted before it, so the relative rule can't apply
--   14 10.50   median of the 12 before is 22.00; 10.50 < 11.00 → flagged
--   15 10.00   already confirmed real → never flagged
--   16  1.00   DNF → not counted, never flagged
--   17 11.50   median of 13 counted (incl. 15) is 21.00; 11.50 ≥ 10.50
insert into public.solves (id, user_id, session_id, puzzle_type, time_ms, penalty, misstop_confirmed, scramble, created_at)
select ('a2000000-0001-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid,
       'a2000000-0000-4000-8000-00000000000a', 'a2000000-5e55-4000-8000-000000000001', '333',
       t, p::public.penalty_type, c, 'R', now() - interval '10 days' + n * interval '1 minute'
from (values
  ( 1,  1500, 'none', false),
  ( 2, 20000, 'none', false), ( 3, 21000, 'none', false), ( 4, 22000, 'none', false),
  ( 5, 23000, 'none', false), ( 6, 24000, 'none', false), ( 7, 25000, 'none', false),
  ( 8, 20000, 'none', false), ( 9, 21000, 'none', false), (10, 22000, 'none', false),
  (11, 23000, 'none', false), (12, 24000, 'none', false),
  (13,  9000, 'none', false),
  (14, 10500, 'none', false),
  (15, 10000, 'none', true),
  (16,  1000, 'dnf',  false),
  (17, 11500, 'none', false)
) v(n, t, p, c);

insert into results
select 'before the backfill the 1.50 counts (no floor)', '1500',
       (select time_ms::text from public.personal_bests
        where user_id = 'a2000000-0000-4000-8000-00000000000a' and puzzle_type = '333' and category = 'single'), null;

select public.backfill_misstops();

insert into results
select 'backfill flags the implausible 1.50 and the relative 10.50', '01,14',
       (select string_agg(right(id::text, 2), ',' order by id) from public.solves
        where user_id = 'a2000000-0000-4000-8000-00000000000a' and excluded_reason = 'auto_misstop'), null;
insert into results
select '9.00 with only 11 earlier solves is not flagged', 'false',
       (select excluded::text from public.solves where id = 'a2000000-0001-4000-8000-000000000013'), null;
insert into results
select 'confirmed 10.00, DNF 1.00 and 11.50 are not flagged', 'false|false|false',
       (select string_agg(excluded::text, '|' order by id) from public.solves
        where id in ('a2000000-0001-4000-8000-000000000015', 'a2000000-0001-4000-8000-000000000016',
                     'a2000000-0001-4000-8000-000000000017')), null;
insert into results
select 'single PB recomputed to the 9.00', '9000',
       (select time_ms::text from public.personal_bests
        where user_id = 'a2000000-0000-4000-8000-00000000000a' and puzzle_type = '333' and category = 'single'), null;
insert into results
select 'Sub-10 re-dated from the 1.50 to the 9.00', 'true',
       (select (ua.unlocked_at = s.created_at)::text
        from public.user_achievements ua
        join public.achievements a on a.id = ua.achievement_id
        join public.solves s on s.id = 'a2000000-0001-4000-8000-000000000013'
        where ua.user_id = 'a2000000-0000-4000-8000-00000000000a' and a.slug = '333-sub-10'), null;

-- ── 4. Confirm, leave out, put back, unconfirm (as A, through the API) ─────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-00000000000a', true);
update public.solves set excluded = false, misstop_confirmed = true
where id = 'a2000000-0001-4000-8000-000000000014';
reset role;
insert into results
select 'confirmed 10.50 counts, with no reason', 'false|null|true',
       (select excluded::text || '|' || coalesce(excluded_reason, 'null') || '|' || misstop_confirmed::text
        from public.solves where id = 'a2000000-0001-4000-8000-000000000014'), null;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-00000000000a', true);
update public.solves set excluded = true, excluded_reason = 'user'
where id = 'a2000000-0001-4000-8000-000000000013';
reset role;
insert into results
select 'leaving out the 9.00: single falls back to 10.00', '10000',
       (select time_ms::text from public.personal_bests
        where user_id = 'a2000000-0000-4000-8000-00000000000a' and puzzle_type = '333' and category = 'single'), null;
insert into results
select 'and Sub-10 goes (no other counted sub-10)', '0',
       (select count(*)::text from public.user_achievements ua
        join public.achievements a on a.id = ua.achievement_id
        where ua.user_id = 'a2000000-0000-4000-8000-00000000000a' and a.slug = '333-sub-10'), null;
insert into results
select 'Sub-15 stays, re-dated to the 10.50', 'true',
       (select (ua.unlocked_at = s.created_at)::text
        from public.user_achievements ua
        join public.achievements a on a.id = ua.achievement_id
        join public.solves s on s.id = 'a2000000-0001-4000-8000-000000000014'
        where ua.user_id = 'a2000000-0000-4000-8000-00000000000a' and a.slug = '333-sub-15'), null;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-00000000000a', true);
update public.solves set excluded = false, misstop_confirmed = true
where id = 'a2000000-0001-4000-8000-000000000013';
reset role;
insert into results
select 'putting the 9.00 back: single and Sub-10 return', '9000|1',
       (select time_ms::text from public.personal_bests
        where user_id = 'a2000000-0000-4000-8000-00000000000a' and puzzle_type = '333' and category = 'single')
       || '|' ||
       (select count(*)::text from public.user_achievements ua
        join public.achievements a on a.id = ua.achievement_id
        where ua.user_id = 'a2000000-0000-4000-8000-00000000000a' and a.slug = '333-sub-10'), null;

-- Unconfirm: the app leaves the confirmed 10.00 out again.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-00000000000a', true);
update public.solves set excluded = true, excluded_reason = 'user', misstop_confirmed = false
where id = 'a2000000-0001-4000-8000-000000000015';
reset role;
insert into results
select 'unconfirmed 10.00 is left out by the user', 'true|user|false',
       (select excluded::text || '|' || excluded_reason || '|' || misstop_confirmed::text
        from public.solves where id = 'a2000000-0001-4000-8000-000000000015'), null;

-- ── 5. Re-running the backfill changes nothing ─────────────────────────────
select public.backfill_misstops();
insert into results
select 'backfill re-run: A keeps one auto flag (the 1.50)', '01',
       (select string_agg(right(id::text, 2), ',' order by id) from public.solves
        where user_id = 'a2000000-0000-4000-8000-00000000000a' and excluded_reason = 'auto_misstop'), null;
insert into results
select 'and the confirmed 9.00 and 10.50 still count', 'false|false',
       (select string_agg(excluded::text, '|' order by id) from public.solves
        where id in ('a2000000-0001-4000-8000-000000000013', 'a2000000-0001-4000-8000-000000000014')), null;

-- ── 6. Access ──────────────────────────────────────────────────────────────
insert into results
select 'internals are not callable through the API', 'false|false',
       has_function_privilege('authenticated', 'public.backfill_misstops()', 'execute')::text
       || '|' || has_function_privilege('authenticated', 'public.recompute_achievements_for(uuid)', 'execute')::text, null;
insert into results
select 'the implausible limit for 3x3', '2000', public.misstop_limit_ms('333')::text, null;
insert into results
select 'the old floor is gone', 'false',
       exists (select 1 from pg_proc where proname = 'misfire_limit_ms')::text, null;

update results
set verdict = case when expected = actual then 'PASS' else 'FAIL' end
where verdict is null;

select step, expected, actual, verdict from results;

rollback;
