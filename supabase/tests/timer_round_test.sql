-- Test for 20261011000000_timer_round.sql: Mo3 personal bests, the 'manual'
-- solve source, and the security lock-down.
--
-- SAFE TO RUN ON PRODUCTION. Everything happens inside a transaction that ends
-- in ROLLBACK, on puzzle 'pyra', which no account used before this round.
--
-- Run in the Supabase dashboard SQL editor. Expect every row to be PASS.

begin;

create temp table results (step text, expected text, actual text, verdict text)
on commit drop;

do $$
declare
  v_user    uuid;
  v_session uuid := gen_random_uuid();
  v_ids     uuid[] := '{}';
  v_id      uuid;
  v_base    timestamptz := now();
  v_times   integer[] := array[10000, 11000, 12500];
  i         integer;
begin
  select id into v_user from public.profiles order by created_at limit 1;
  if v_user is null then
    insert into results values ('setup', 'a profile exists', 'none', 'SKIP');
    return;
  end if;

  insert into public.sessions (id, user_id, puzzle_type, name, is_active, order_index)
  values (v_session, v_user, 'pyra', 'timer round test', false, 999);

  -- ── 1. Three solves: mean = 33500 / 3 = 11166.7 → 11170 ────────────────
  -- created_at is spaced explicitly: inside a transaction now() never moves.
  for i in 1 .. 3 loop
    insert into public.solves (user_id, session_id, puzzle_type, time_ms, penalty, scramble, source, created_at)
    values (v_user, v_session, 'pyra', v_times[i], 'none', 'R U', 'web', v_base + (i * interval '1 second'))
    returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;

  insert into results
  select '3 solves: mean3', '11170',
         coalesce((select time_ms::text from public.personal_bests
                   where user_id = v_user and puzzle_type = 'pyra' and category = 'mean3'), 'none'), null;

  -- ── 2. A 4th solve that is a DNF: the newest window is a DNF, PB holds ──
  insert into public.solves (user_id, session_id, puzzle_type, time_ms, penalty, scramble, source, created_at)
  values (v_user, v_session, 'pyra', 9000, 'dnf', 'R U', 'web', v_base + interval '4 seconds')
  returning id into v_id;
  v_ids := v_ids || v_id;

  insert into results
  select 'DNF 4th solve: mean3 unchanged', '11170',
         coalesce((select time_ms::text from public.personal_bests
                   where user_id = v_user and puzzle_type = 'pyra' and category = 'mean3'), 'none'), null;

  -- ── 3. Soft-delete solve 1: the only full window left has the DNF ───────
  update public.solves set deleted_at = now() where id = v_ids[1];

  insert into results
  select 'soft-delete solve 1: no mean3 (window has a DNF)', 'none',
         coalesce((select time_ms::text from public.personal_bests
                   where user_id = v_user and puzzle_type = 'pyra' and category = 'mean3'), 'none'), null;

  -- ── 4. Restore it: the PB comes back ────────────────────────────────────
  update public.solves set deleted_at = null where id = v_ids[1];

  insert into results
  select 'restore solve 1: mean3 back', '11170',
         coalesce((select time_ms::text from public.personal_bests
                   where user_id = v_user and puzzle_type = 'pyra' and category = 'mean3'), 'none'), null;

  -- ── 5. +2 on solve 1: (12000 + 11000 + 12500) / 3 = 11833.3 → 11830 ────
  update public.solves set penalty = 'plus2' where id = v_ids[1];

  insert into results
  select '+2 on solve 1: mean3 heals upward', '11830',
         coalesce((select time_ms::text from public.personal_bests
                   where user_id = v_user and puzzle_type = 'pyra' and category = 'mean3'), 'none'), null;

  -- ── 6. Averages still behave: one more solve makes the first ao5 ────────
  -- Window 12000, 11000, 12500, DNF, 10500: the DNF is the worst, so only the
  -- best (10500) is trimmed: (12000 + 11000 + 12500) / 3 = 11833.3 → 11830.
  insert into public.solves (user_id, session_id, puzzle_type, time_ms, penalty, scramble, source, created_at)
  values (v_user, v_session, 'pyra', 10500, 'none', 'R U', 'manual', v_base + interval '5 seconds');

  insert into results
  select 'ao5 with one DNF', '11830',
         coalesce((select time_ms::text from public.personal_bests
                   where user_id = v_user and puzzle_type = 'pyra' and category = 'ao5'), 'none'), null;
  insert into results
  select 'source manual accepted', '1',
         (select count(*)::text from public.solves
          where session_id = v_session and source = 'manual'), null;
end;
$$;

-- ── 7. Unknown sources are still refused ──────────────────────────────────
do $$
begin
  if not exists (select 1 from public.sessions) then
    insert into results values ('source bogus refused', 'a session exists', 'none', 'SKIP');
    return;
  end if;
  begin
    insert into public.solves (user_id, session_id, puzzle_type, time_ms, scramble, source)
    select user_id, id, puzzle_type, 1000, 'R', 'bogus' from public.sessions limit 1;
    insert into results values ('source bogus refused', 'refused', 'accepted', null);
  exception when check_violation then
    insert into results values ('source bogus refused', 'refused', 'refused', null);
  end;
end;
$$;

-- ── 8. Security lock-down ─────────────────────────────────────────────────
insert into results
select 'is_admin has a fixed search_path', 'true',
       (select (coalesce(proconfig, '{}') @> array['search_path=""'])::text
        from pg_proc where oid = 'public.is_admin()'::regprocedure), null;

insert into results
select 'anon cannot execute ' || f, 'false',
       has_function_privilege('anon', f, 'execute')::text, null
from unnest(array[
  'public.maintain_average_pbs_on_insert()',
  'public.recompute_pb_on_solve_delete()',
  'public.recompute_pb_on_solve_update()'
]) as f;

update results
set verdict = case when expected = actual then 'PASS' else 'FAIL' end
where verdict is null;

select step, expected, actual, verdict from results;

rollback;
