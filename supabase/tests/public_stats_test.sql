-- public_stats() (20261125000000_public_stats.sql). Run after applying the
-- migration (`supabase db query --linked -f supabase/tests/public_stats_test.sql`
-- or the SQL editor); every notice should say PASS. Rolls back, so the test
-- rows never stay.
begin;

create temp table ps_before on commit drop as select * from public.public_stats();

-- Two users through the signup trigger, which creates their profiles.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('a1500000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ps-a@example.com', '{}'),
  ('a2500000-0000-4000-8000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ps-b@example.com', '{}');

insert into public.sessions (id, user_id, name, puzzle_type)
values ('00000000-0000-4000-8000-0000000000b1', 'a1500000-0000-4000-8000-0000000000a1', 'ps test', '333');

insert into public.solves (user_id, session_id, time_ms, scramble)
values
  ('a1500000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000b1', 12345, 'R U'),
  ('a1500000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000b1', 13345, 'R U2');
insert into public.solves (user_id, session_id, time_ms, scramble, deleted_at)
values ('a1500000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000b1', 14345, 'R2 U', now());

-- One drilled case, and one state row with no reps yet.
insert into public.drill_state (user_id, algorithm_id, attempt_count)
select 'a1500000-0000-4000-8000-0000000000a1', a.id, n
from (select id, row_number() over (order by id) - 1 as n from public.algorithms limit 2) a;

do $$
declare
  b record;
  a record;
  v_has_algs boolean := (select count(*) >= 2 from public.algorithms);
begin
  select * into b from ps_before;
  select * into a from public.public_stats();
  raise notice 'counts solves, skipping deleted ones: %',
    case when a.solves = b.solves + 2 then 'PASS' else format('FAIL (%s → %s)', b.solves, a.solves) end;
  raise notice 'counts every profile: %',
    case when a.cubers = b.cubers + 2 then 'PASS' else format('FAIL (%s → %s)', b.cubers, a.cubers) end;
  raise notice 'counts drilled cases, not empty state rows: %',
    case when not v_has_algs then 'SKIP (no algorithms seeded)'
         when a.cases_drilled = b.cases_drilled + 1 then 'PASS'
         else format('FAIL (%s → %s)', b.cases_drilled, a.cases_drilled) end;
end $$;

set local role anon;

do $$
declare n int;
begin
  select count(*) into n from public.public_stats();
  raise notice 'anon can call it and gets one row: %', case when n = 1 then 'PASS' else 'FAIL' end;
exception when others then
  raise notice 'anon can call it and gets one row: FAIL (%)', sqlerrm;
end $$;

do $$
declare n int;
begin
  select count(*) into n from public.solves;
  raise notice 'anon still sees no solves directly: %', case when n = 0 then 'PASS' else 'FAIL' end;
end $$;

reset role;

do $$
declare
  v_cols text;
begin
  select string_agg(t, ',' order by ord) into v_cols
  from unnest(
    (select proargnames from pg_proc where proname = 'public_stats' and pronamespace = 'public'::regnamespace)
  ) with ordinality as x(t, ord);
  raise notice 'returns only the three totals: %',
    case when v_cols = 'solves,cubers,cases_drilled' then 'PASS' else format('FAIL (%s)', v_cols) end;
  raise notice 'is security definer with an empty search_path: %',
    case when exists (
      select 1 from pg_proc
      where proname = 'public_stats' and pronamespace = 'public'::regnamespace
        and prosecdef and proconfig @> array['search_path=""']
    ) then 'PASS' else 'FAIL' end;
end $$;

rollback;
