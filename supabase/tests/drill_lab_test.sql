-- Drill Lab lifecycle test: attempts → drill_state → v_drill_variant_stats,
-- plus the RLS boundaries.
--
-- Proves the triggers fire and the derived state heals: an insert updates the
-- counts and schedule, a +2 or DNF edit recomputes them, a delete removes them.
-- Then, acting as a second signed-in user, proves they cannot see or write the
-- first user's rows, and that no client can write drill_state directly.
--
-- SAFE TO RUN ON PRODUCTION. Everything happens inside a transaction that ends
-- in ROLLBACK. It needs two profiles and one approved algorithm; if they do not
-- exist it reports SKIP instead of failing.
--
-- Run in the Supabase dashboard SQL editor. Expect every row to be PASS.

begin;

create temp table results (step text, expected text, actual text, verdict text)
on commit drop;
-- The RLS checks below run as `authenticated` and still need to report.
grant all on results to authenticated;

create temp table ctx (user_a uuid, user_b uuid, alg uuid, t0 timestamptz)
on commit drop;
grant select on ctx to authenticated;

do $$
declare
  v_a   uuid;
  v_b   uuid;
  v_alg uuid;
  -- Explicit, spaced timestamps. Inside a transaction now() is the
  -- transaction's start time, so defaults would give every row the same instant.
  v_t0  timestamptz := '2026-01-01 12:00:00+00';
  v_ids uuid[] := '{}';
  v_id  uuid;
  v_ms  integer;
  i     integer;
begin
  select id into v_a from public.profiles order by created_at limit 1;
  select id into v_b from public.profiles where id <> v_a order by created_at limit 1;
  select id into v_alg from public.algorithms where is_approved order by created_at limit 1;
  if v_a is null or v_b is null or v_alg is null then
    insert into results values ('setup', 'two profiles and an approved algorithm', 'missing', 'SKIP');
    return;
  end if;
  insert into ctx values (v_a, v_b, v_alg, v_t0);

  -- ── 1. Three clean reps within a minute of each other ────────────────────
  foreach v_ms in array array[2000, 1800, 1900] loop
    insert into public.drill_attempts (user_id, algorithm_id, time_ms, created_at)
    values (v_a, v_alg, v_ms, v_t0 + (cardinality(v_ids) * interval '1 minute'))
    returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;

  insert into results
  select '3 reps: attempt_count', '3', attempt_count::text, null
  from public.drill_state where user_id = v_a and algorithm_id = v_alg;
  insert into results
  select '3 reps: success_count', '3', success_count::text, null
  from public.drill_state where user_id = v_a and algorithm_id = v_alg;
  -- Only the first rep is a scheduled review; the next two were early, so the
  -- schedule stays at 1 day from the first rep and ease is unchanged (q = 4).
  insert into results
  select '3 reps: only the first rep schedules (due t0 + 1 day)',
         (v_t0 + interval '1 day')::text, next_review_at::text, null
  from public.drill_state where user_id = v_a and algorithm_id = v_alg;
  insert into results
  select '3 reps: ease unchanged at 2.50', '2.50', ease::text, null
  from public.drill_state where user_id = v_a and algorithm_id = v_alg;
  insert into results
  select '3 reps: view median is 1900', '1900', median_ms::text, null
  from public.v_drill_variant_stats where user_id = v_a and algorithm_id = v_alg;

  -- ── 2. +2 on the 1800 rep: generated column and median follow ────────────
  update public.drill_attempts set penalty = 'plus2' where id = v_ids[2];

  insert into results
  select '+2: effective_time_ms is 3800', '3800', effective_time_ms::text, null
  from public.drill_attempts where id = v_ids[2];
  insert into results
  select '+2: view median is 2000', '2000', median_ms::text, null
  from public.v_drill_variant_stats where user_id = v_a and algorithm_id = v_alg;

  -- ── 3. DNF on the last rep: a lapse ─────────────────────────────────────
  update public.drill_attempts set penalty = 'dnf' where id = v_ids[3];

  insert into results
  select 'DNF: succeeded is false', 'false', succeeded::text, null
  from public.drill_attempts where id = v_ids[3];
  insert into results
  select 'DNF: success_count drops to 2', '2', success_count::text, null
  from public.drill_state where user_id = v_a and algorithm_id = v_alg;
  insert into results
  select 'DNF: ease drops to 2.30', '2.30', ease::text, null
  from public.drill_state where user_id = v_a and algorithm_id = v_alg;
  insert into results
  select 'DNF: due again 10 minutes after the lapse',
         (v_t0 + interval '2 minutes' + interval '10 minutes')::text, next_review_at::text, null
  from public.drill_state where user_id = v_a and algorithm_id = v_alg;
  -- DNFs are NULL in effective_time_ms and excluded: median of 2000 and 3800.
  insert into results
  select 'DNF: view median ignores it (2900)', '2900', median_ms::text, null
  from public.v_drill_variant_stats where user_id = v_a and algorithm_id = v_alg;

  -- ── 4. A due review a day later, faster than the median: q = 5 ──────────
  insert into public.drill_attempts (user_id, algorithm_id, time_ms, created_at)
  values (v_a, v_alg, 1500, v_t0 + interval '1 day 1 hour');

  insert into results
  select 'due review, fast: ease rises to 2.40', '2.40', ease::text, null
  from public.drill_state where user_id = v_a and algorithm_id = v_alg;
  insert into results
  select 'due review: streak restarted, interval 1 day', '1.00', interval_days::text, null
  from public.drill_state where user_id = v_a and algorithm_id = v_alg;

  -- ── 5. Delete everything: the state row goes too ────────────────────────
  delete from public.drill_attempts where user_id = v_a and algorithm_id = v_alg;

  insert into results
  select 'delete all: drill_state row removed', '0',
         (select count(*)::text from public.drill_state
          where user_id = v_a and algorithm_id = v_alg), null;

  -- Leave one attempt for user A for the RLS checks.
  insert into public.drill_attempts (user_id, algorithm_id, time_ms, created_at)
  values (v_a, v_alg, 1700, v_t0);
end;
$$;

-- ── 6. RLS, as user B ──────────────────────────────────────────────────────
do $$
declare
  v_b uuid := (select user_b from ctx);
begin
  if v_b is null then return; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_b::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  v_a   uuid := (select user_a from ctx);
  v_b   uuid := (select user_b from ctx);
  v_alg uuid := (select alg from ctx);
  v_n   integer;
begin
  if v_a is null then return; end if;

  select count(*) into v_n from public.drill_attempts where user_id = v_a;
  insert into results values ('RLS: B sees none of A''s attempts', '0', v_n::text, null);

  select count(*) into v_n from public.drill_state where user_id = v_a;
  insert into results values ('RLS: B sees none of A''s drill_state', '0', v_n::text, null);

  select count(*) into v_n from public.v_drill_variant_stats where user_id = v_a;
  insert into results values ('RLS: B sees none of A''s variant stats', '0', v_n::text, null);

  begin
    insert into public.drill_attempts (user_id, algorithm_id, time_ms) values (v_a, v_alg, 1000);
    insert into results values ('RLS: B cannot insert an attempt as A', 'rejected', 'accepted', null);
  exception when insufficient_privilege then
    insert into results values ('RLS: B cannot insert an attempt as A', 'rejected', 'rejected', null);
  end;

  begin
    insert into public.drill_attempts (user_id, algorithm_id, time_ms) values (v_b, v_alg, 1000);
    insert into results values ('RLS: B can insert their own attempt', 'accepted', 'accepted', null);
  exception when others then
    insert into results values ('RLS: B can insert their own attempt', 'accepted', sqlerrm, null);
  end;

  select count(*) into v_n from public.drill_state where user_id = v_b;
  insert into results values ('trigger: B''s own insert creates B''s state', '1', v_n::text, null);

  begin
    insert into public.drill_state (user_id, algorithm_id, attempt_count) values (v_b, v_alg, 999)
    on conflict (user_id, algorithm_id) do update set attempt_count = 999;
    insert into results values ('RLS: client cannot write drill_state', 'rejected', 'accepted', null);
  exception when insufficient_privilege then
    insert into results values ('RLS: client cannot write drill_state', 'rejected', 'rejected', null);
  end;
end;
$$;

reset role;

update results
set verdict = case when expected = actual then 'PASS' else 'FAIL' end
where verdict is null;

select step, expected, actual, verdict from results;

rollback;
