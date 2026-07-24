-- Personal-best trigger lifecycle test.
--
-- The average-PB migration was verified two ways already: its window
-- expression was checked against `wcaAverage()` in TypeScript over adversarial
-- sequences, and its backfill output was cross-checked against a fresh
-- recomputation on live data. Neither of those proves the *triggers fire* — that
-- an insert ratchets, a soft delete heals, a restore brings the PB back.
-- This does.
--
-- SAFE TO RUN ON PRODUCTION. Everything happens inside a transaction that ends
-- in ROLLBACK, and it works on puzzle '222', which no account currently uses,
-- so even mid-transaction it cannot disturb a real 3x3 personal best.
--
-- Run in the Supabase dashboard SQL editor. Expect eight rows, all PASS.

begin;

create temp table results (step text, expected text, actual text, verdict text)
on commit drop;

do $$
declare
  v_user    uuid;
  v_session uuid := gen_random_uuid();
  v_first   uuid;
  v_ids     uuid[] := '{}';
  v_base    timestamptz := now();
  v_time    integer;
  i         integer;
begin
  select id into v_user from public.profiles order by created_at limit 1;
  if v_user is null then
    insert into results values ('setup', 'a profile exists', 'none', 'SKIP');
    return;
  end if;

  insert into public.sessions (id, user_id, puzzle_type, name, is_active, order_index)
  values (v_session, v_user, '222', 'pb lifecycle test', false, 999);

  -- ── 1. Twelve solves: 10000, 11000 … 21000 ms ──────────────────────────
  -- created_at is set explicitly and spaced. Inside a transaction now() is the
  -- *transaction* timestamp, so the default would give all twelve rows the same
  -- instant and the window's `order by created_at, id` would fall back to random
  -- UUIDs — the averages would come out differently on every run.
  for i in 0 .. 11 loop
    v_time := 10000 + i * 1000;
    insert into public.solves (user_id, session_id, puzzle_type, time_ms, penalty, scramble, source, created_at)
    values (v_user, v_session, '222', v_time, 'none', 'R U R2', 'web', v_base + (i * interval '1 second'))
    returning id into v_first;
    v_ids := v_ids || v_first;
  end loop;

  -- Ao5 of the fastest five (10000..14000): drop 10000 and 14000, mean of
  -- 11000/12000/13000 = 12000. Ao12 drops 10000 and 21000, mean of the middle
  -- ten = 15500.
  insert into results
  select 'insert 12 solves: single', '10000',
         coalesce((select time_ms::text from public.personal_bests
                   where user_id = v_user and puzzle_type = '222' and category = 'single'), 'none'), null;
  insert into results
  select 'insert 12 solves: ao5', '12000',
         coalesce((select time_ms::text from public.personal_bests
                   where user_id = v_user and puzzle_type = '222' and category = 'ao5'), 'none'), null;
  insert into results
  select 'insert 12 solves: ao12', '15500',
         coalesce((select time_ms::text from public.personal_bests
                   where user_id = v_user and puzzle_type = '222' and category = 'ao12'), 'none'), null;
  insert into results
  select 'insert 12 solves: ao50 absent', 'none',
         coalesce((select time_ms::text from public.personal_bests
                   where user_id = v_user and puzzle_type = '222' and category = 'ao50'), 'none'), null;

  -- ── 2. DNF the fastest solve: both the single and the averages must heal ──
  update public.solves set penalty = 'dnf' where id = v_ids[1];

  insert into results
  select 'DNF the best solve: single heals to 11000', '11000',
         coalesce((select time_ms::text from public.personal_bests
                   where user_id = v_user and puzzle_type = '222' and category = 'single'), 'none'), null;
  -- One DNF in the first window is the worst solve, so only the best finite
  -- time is trimmed: (11000+12000+13000+14000 - 11000) / 3 = 13000.
  insert into results
  select 'DNF the best solve: ao5 heals to 13000', '13000',
         coalesce((select time_ms::text from public.personal_bests
                   where user_id = v_user and puzzle_type = '222' and category = 'ao5'), 'none'), null;

  -- ── 3. Restore it, and the PBs come back ─────────────────────────────────
  update public.solves set penalty = 'none' where id = v_ids[1];

  insert into results
  select 'restore penalty: ao5 returns to 12000', '12000',
         coalesce((select time_ms::text from public.personal_bests
                   where user_id = v_user and puzzle_type = '222' and category = 'ao5'), 'none'), null;

  -- ── 4. Soft-delete everything: no PB may survive ─────────────────────────
  update public.solves set deleted_at = now()
  where session_id = v_session and deleted_at is null;

  insert into results
  select 'soft-delete all: no 2x2 PB rows remain', '0',
         (select count(*)::text from public.personal_bests
          where user_id = v_user and puzzle_type = '222'), null;
end;
$$;

update results
set verdict = case when expected = actual then 'PASS' else 'FAIL' end
where verdict is null;

select step, expected, actual, verdict from results;

rollback;
