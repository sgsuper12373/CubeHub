-- Drill Lab: per-variant drill attempts and spaced-repetition state.
--
-- Closes the "No spaced-repetition storage" gap in docs/database.md.
-- `user_algorithm_bookmarks` only carries `learned boolean`, which cannot say
-- how often a user has drilled an algorithm, how fast they are with it, or when
-- it is due again.
--
-- THE GRAIN IS (user_id, algorithm_id), NOT case_id. The Drill Lab's whole
-- point is comparing *variants* of the same case ("you are 0.28s faster with
-- the alternative T-perm"), and that comparison is impossible once attempts are
-- rolled up to the case. The case is one join away through `algorithms`.
--
-- Conventions, as elsewhere:
--   * owner-scoped RLS in the `(select auth.uid())` form;
--   * penalties computed in the database: `effective_time_ms` and `succeeded`
--     are generated columns, never derived in TypeScript;
--   * derived state (`drill_state`) is written only by triggers, with no client
--     write policy, like `personal_bests`. It is recomputed authoritatively from
--     the attempts on every mutation, so a penalty edit or a delete heals it.
--
-- ⚠️ Apply to the live project via the Supabase dashboard SQL editor or the
-- CLI, NOT via the read-only MCP. After applying with the CLI:
--   supabase migration repair --status applied 20260930000000

-- ── 1. Attempts: one row per timed rep ─────────────────────────────────────
create table public.drill_attempts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  algorithm_id      uuid not null references public.algorithms(id) on delete cascade,
  -- Execution time only. Recognition, when measured, is recorded separately so
  -- variants are compared on execution alone.
  time_ms           integer not null check (time_ms > 0),
  penalty           public.penalty_type not null default 'none',
  effective_time_ms integer generated always as (
    case penalty
      when 'dnf'   then null::integer
      when 'plus2' then time_ms + 2000
      else time_ms
    end
  ) stored,
  -- A DNF in a drill means the algorithm was botched: a lapse for scheduling.
  succeeded         boolean generated always as (penalty <> 'dnf') stored,
  recognition_ms    integer check (recognition_ms is null or recognition_ms >= 0),
  source            text not null default 'drill'
                    check (source in ('drill', 'detected_in_solve')),
  created_at        timestamptz not null default now()
);
create index idx_drill_attempts_user_alg
  on public.drill_attempts (user_id, algorithm_id, created_at desc);

alter table public.drill_attempts enable row level security;

create policy drill_attempts_all on public.drill_attempts
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── 2. Spaced-repetition state, derived from the attempts ─────────────────
create table public.drill_state (
  user_id         uuid not null references public.profiles(id) on delete cascade,
  algorithm_id    uuid not null references public.algorithms(id) on delete cascade,
  attempt_count   integer not null default 0,
  success_count   integer not null default 0,
  ease            numeric(4,2) not null default 2.5,
  interval_days   numeric(8,2) not null default 0,
  next_review_at  timestamptz,
  last_attempt_at timestamptz,
  updated_at      timestamptz not null default now(),
  primary key (user_id, algorithm_id)
);

alter table public.drill_state enable row level security;

-- Read-only to its owner. No insert/update/delete policy: rows are written by
-- recompute_drill_state() below, which runs as SECURITY DEFINER.
create policy drill_state_read on public.drill_state
  for select using ((select auth.uid()) = user_id);

-- ── 3. Authoritative recompute (SM-2, adapted for drilling) ────────────────
-- Replays every attempt for one (user, algorithm) in order. Per algorithm this
-- is at most a few hundred rows, and replaying means the state can never
-- disagree with the attempts it came from.
--
-- Scheduling rules:
--   * A DNF is a lapse: ease drops 0.2 (floor 1.3), the review streak resets,
--     and the algorithm is due again in 10 minutes.
--   * A success only advances the schedule when it lands at or after
--     next_review_at. Drilling is many reps in one sitting; if every rep
--     counted as a review, twenty reps would push the next review months out.
--     Early reps still count toward attempt_count and success_count.
--   * Review quality is 5 when the rep beats the median of the earlier
--     successes, else 4, fed through the standard SM-2 ease formula
--     (q=5 → +0.10, q=4 → +0.00). Intervals run 1 day, 3 days, then
--     interval × ease.
create or replace function public.recompute_drill_state(p_user uuid, p_alg uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  r           record;
  v_attempts  integer := 0;
  v_successes integer := 0;
  v_ease      numeric := 2.5;
  v_interval  numeric := 0;
  v_streak    integer := 0;
  v_next      timestamptz := null;
  v_last      timestamptz := null;
  v_times     integer[] := '{}';
  v_median    double precision;
  v_q         integer;
begin
  for r in
    select created_at, effective_time_ms, succeeded
    from public.drill_attempts
    where user_id = p_user and algorithm_id = p_alg
    order by created_at, id
  loop
    v_attempts := v_attempts + 1;
    v_last := r.created_at;

    if not r.succeeded then
      v_ease := greatest(1.3, v_ease - 0.2);
      v_streak := 0;
      v_interval := 0;
      v_next := r.created_at + interval '10 minutes';
      continue;
    end if;

    v_successes := v_successes + 1;

    if v_next is null or r.created_at >= v_next then
      if cardinality(v_times) = 0 then
        v_q := 4;
      else
        select percentile_cont(0.5) within group (order by t)
          into v_median
          from unnest(v_times) as t;
        v_q := case when r.effective_time_ms < v_median then 5 else 4 end;
      end if;

      v_ease := greatest(1.3, v_ease + (0.1 - (5 - v_q) * (0.08 + (5 - v_q) * 0.02)));
      v_streak := v_streak + 1;
      v_interval := case v_streak
                      when 1 then 1
                      when 2 then 3
                      else round(v_interval * v_ease, 2)
                    end;
      v_next := r.created_at + v_interval * interval '1 day';
    end if;

    v_times := v_times || r.effective_time_ms;
  end loop;

  if v_attempts = 0 then
    delete from public.drill_state where user_id = p_user and algorithm_id = p_alg;
    return;
  end if;

  insert into public.drill_state as s
    (user_id, algorithm_id, attempt_count, success_count, ease, interval_days,
     next_review_at, last_attempt_at, updated_at)
  values
    (p_user, p_alg, v_attempts, v_successes, v_ease, v_interval,
     v_next, v_last, now())
  on conflict (user_id, algorithm_id) do update
    set attempt_count   = excluded.attempt_count,
        success_count   = excluded.success_count,
        ease            = excluded.ease,
        interval_days   = excluded.interval_days,
        next_review_at  = excluded.next_review_at,
        last_attempt_at = excluded.last_attempt_at,
        updated_at      = excluded.updated_at;
end;
$$;

-- ── 4. Triggers: statement-level, so a bulk insert recomputes each pair once ─
-- Transition tables cannot be shared across events, hence three triggers.
create or replace function public.recompute_drill_state_on_insert()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  r record;
begin
  for r in select distinct user_id, algorithm_id from new_attempts loop
    perform public.recompute_drill_state(r.user_id, r.algorithm_id);
  end loop;
  return null;
end;
$$;

create or replace function public.recompute_drill_state_on_update()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  r record;
begin
  -- Both sides: an update could in principle move a row between algorithms.
  for r in
    select user_id, algorithm_id from old_attempts
    union
    select user_id, algorithm_id from new_attempts
  loop
    perform public.recompute_drill_state(r.user_id, r.algorithm_id);
  end loop;
  return null;
end;
$$;

create or replace function public.recompute_drill_state_on_delete()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  r record;
begin
  for r in select distinct user_id, algorithm_id from old_attempts loop
    perform public.recompute_drill_state(r.user_id, r.algorithm_id);
  end loop;
  return null;
end;
$$;

create trigger trg_drill_attempts_after_insert
  after insert on public.drill_attempts
  referencing new table as new_attempts
  for each statement execute function public.recompute_drill_state_on_insert();

create trigger trg_drill_attempts_after_update
  after update on public.drill_attempts
  referencing old table as old_attempts new table as new_attempts
  for each statement execute function public.recompute_drill_state_on_update();

create trigger trg_drill_attempts_after_delete
  after delete on public.drill_attempts
  referencing old table as old_attempts
  for each statement execute function public.recompute_drill_state_on_delete();

-- Internal only: nothing outside the triggers should call these.
revoke all on function public.recompute_drill_state(uuid, uuid)     from public, anon, authenticated;
revoke all on function public.recompute_drill_state_on_insert()      from public, anon, authenticated;
revoke all on function public.recompute_drill_state_on_update()      from public, anon, authenticated;
revoke all on function public.recompute_drill_state_on_delete()      from public, anon, authenticated;

-- ── 5. Per-variant statistics ──────────────────────────────────────────────
-- What the Drill Lab reads: one row per (user, algorithm) with its case, so
-- variants of one case can be compared side by side. percentile_cont ignores
-- NULLs, so DNFs are excluded from the medians without a filter.
-- security_invoker: callers see only their own attempts, through the RLS above.
create or replace view public.v_drill_variant_stats with (security_invoker = on) as
select a.user_id,
       a.algorithm_id,
       al.case_id,
       count(*)::integer                                           as attempts,
       (count(*) filter (where a.succeeded))::integer              as successes,
       round(percentile_cont(0.5) within group (order by a.effective_time_ms))::integer
                                                                   as median_ms,
       round(percentile_cont(0.5) within group (order by a.recognition_ms))::integer
                                                                   as median_recognition_ms,
       max(a.created_at)                                           as last_attempt_at,
       s.ease,
       s.next_review_at
from public.drill_attempts a
join public.algorithms al on al.id = a.algorithm_id
left join public.drill_state s
  on s.user_id = a.user_id and s.algorithm_id = a.algorithm_id
group by a.user_id, a.algorithm_id, al.case_id, s.ease, s.next_review_at;

-- =============================================================================
-- Verification (run after applying): supabase/tests/drill_lab_test.sql.
-- It runs inside a transaction that rolls back and prints PASS/FAIL rows.
-- =============================================================================
