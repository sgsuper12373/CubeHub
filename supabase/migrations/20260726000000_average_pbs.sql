-- Average personal bests (ao5 / ao12 / ao50 / ao100).
--
-- Closes the "only `single` personal bests are maintained" gap in
-- docs/database.md. `personal_bests.category` has always accepted the average
-- categories; nothing ever wrote them, so Phase 2 analytics had no all-time
-- averages to show.
--
-- Design mirrors 20260721000000_soft_delete_and_pb_integrity.sql exactly:
--   * a CHEAP RATCHET on insert — only the windows *ending at* the new solve
--     can produce a new PB, so the timer's hot path reads ~100 rows, not the
--     user's whole history;
--   * an AUTHORITATIVE RECOMPUTE on every mutation (delete, soft-delete,
--     restore, penalty change), so a PB can heal downward as well as upward
--     and phantom averages are impossible for the same reason phantom singles
--     now are.
--
-- The WCA trimmed average is `(sum - min - max) / (n - 2)` over the window,
-- which is four window aggregates — no per-window sort and no row-by-row loop.
-- DNF handling per WCA: the generated column `effective_time_ms` is NULL for a
-- DNF (and sum/min/max skip nulls for free), one DNF *is* the worst solve so
-- only the best is trimmed, and two or more make the average itself DNF.
--
-- Windows are partitioned BY SESSION. A rolling average spanning two sessions
-- is meaningless to a cuber, and per-session is what csTimer does — which is
-- what users will be comparing these numbers against.
--
-- ⚠️ Apply this to the live project via the Supabase dashboard/CLI — NOT via
-- the read-only MCP. The live DB has no migration history recorded; if linking
-- with the CLI, repair the baseline first (see 20260718000000_baseline.sql).

-- ── 1. Best AoN over the surviving solves ──────────────────────────────────
-- Returns no row when the user has never completed a full window of n.
--
-- On the dynamic SQL: a window frame offset (`rows between N - 1 preceding`)
-- must be a constant expression, so n is interpolated as a literal rather than
-- bound as a parameter. p_n is never user input — every caller passes it from
-- the fixed category list in `recompute_average_pbs` below — and `%s` on an
-- integer-typed variable cannot carry anything but an integer. The user and
-- puzzle, which *are* variable, stay bound through USING.
create or replace function public.best_average_of_n(
  p_user   uuid,
  p_puzzle public.puzzle_type,
  p_n      integer
)
returns table (time_ms integer, solve_id uuid, achieved_at timestamptz)
language plpgsql
stable
security definer
set search_path to ''
as $fn$
begin
  return query execute format($sql$
    with windows as (
      select
        s.id,
        s.created_at,
        count(*)                                            over w as n_rows,
        count(*) filter (where s.effective_time_ms is null) over w as n_dnf,
        sum(s.effective_time_ms)                            over w as sum_ms,
        min(s.effective_time_ms)                            over w as min_ms,
        max(s.effective_time_ms)                            over w as max_ms
      from public.solves s
      where s.user_id = $1
        and s.puzzle_type = $2
        and s.deleted_at is null
      window w as (
        partition by s.session_id
        order by s.created_at, s.id
        rows between %1$s - 1 preceding and current row
      )
    )
    select
      (round(
        (case
           -- One DNF: it is the worst solve, so the trim drops it and the
           -- best finite time — never a second finite time.
           when n_dnf = 1 then sum_ms - min_ms
           else                sum_ms - min_ms - max_ms
         end)::numeric / (%1$s - 2)::numeric / 10
      ) * 10)::integer as time_ms,
      id               as solve_id,
      created_at       as achieved_at
    from windows
    where n_rows = %1$s
      and n_dnf < 2
    -- Ties go to the earliest — the first time the cuber hit it.
    order by time_ms asc, created_at asc
    limit 1
  $sql$, p_n)
  using p_user, p_puzzle;
end;
$fn$;

-- ── 2. Authoritative average-PB recompute ──────────────────────────────────
create or replace function public.recompute_average_pbs(
  p_user   uuid,
  p_puzzle public.puzzle_type
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_cats constant text[]    := array['ao5', 'ao12', 'ao50', 'ao100'];
  v_ns   constant integer[] := array[5, 12, 50, 100];
  v_best record;
  i      integer;
begin
  for i in 1 .. array_length(v_ns, 1) loop
    select * into v_best
    from public.best_average_of_n(p_user, p_puzzle, v_ns[i]);

    if v_best.time_ms is null then
      -- Not enough surviving solves for a full window any more.
      delete from public.personal_bests
      where user_id = p_user
        and puzzle_type = p_puzzle
        and category = v_cats[i];
    else
      insert into public.personal_bests
        (user_id, puzzle_type, category, time_ms, solve_id, achieved_at)
      values
        (p_user, p_puzzle, v_cats[i], v_best.time_ms, v_best.solve_id, v_best.achieved_at)
      on conflict (user_id, puzzle_type, category) do update
        -- Authoritative, not a ratchet: this is the value, whichever way it moved.
        set time_ms     = excluded.time_ms,
            solve_id    = excluded.solve_id,
            achieved_at = excluded.achieved_at,
            updated_at  = now();
    end if;
  end loop;
end;
$$;

-- Single + averages, for the trigger paths that must heal everything.
create or replace function public.recompute_all_pbs(
  p_user   uuid,
  p_puzzle public.puzzle_type
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform public.recompute_single_pb(p_user, p_puzzle);
  perform public.recompute_average_pbs(p_user, p_puzzle);
end;
$$;

-- ── 3. Insert fast path: ratchet only the windows ending at the new solve ───
create or replace function public.ratchet_average_pbs_for_solve(p_solve_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_cats constant text[]    := array['ao5', 'ao12', 'ao50', 'ao100'];
  v_ns   constant integer[] := array[5, 12, 50, 100];
  v_solve  public.solves%rowtype;
  v_rows   integer;
  v_dnf    integer;
  v_sum    bigint;
  v_min    integer;
  v_max    integer;
  v_avg    integer;
  i        integer;
begin
  select * into v_solve from public.solves where id = p_solve_id;
  if not found or v_solve.deleted_at is not null then
    return;
  end if;

  for i in 1 .. array_length(v_ns, 1) loop
    -- The n most recent surviving solves in this session up to and including
    -- the new one. Row comparison keeps the tie-break identical to the
    -- `order by created_at, id` window in best_average_of_n.
    select count(*),
           count(*) filter (where t is null),
           sum(t), min(t), max(t)
      into v_rows, v_dnf, v_sum, v_min, v_max
    from (
      select s.effective_time_ms as t
      from public.solves s
      where s.user_id = v_solve.user_id
        and s.session_id = v_solve.session_id
        and s.deleted_at is null
        and (s.created_at, s.id) <= (v_solve.created_at, v_solve.id)
      order by s.created_at desc, s.id desc
      limit v_ns[i]
    ) recent;

    -- Short window, or the average is itself a DNF: no PB candidate.
    continue when v_rows < v_ns[i] or v_dnf >= 2;

    v_avg := (round(
      (case when v_dnf = 1 then v_sum - v_min else v_sum - v_min - v_max end)::numeric
      / (v_ns[i] - 2)::numeric / 10
    ) * 10)::integer;

    insert into public.personal_bests
      (user_id, puzzle_type, category, time_ms, solve_id, achieved_at)
    values
      (v_solve.user_id, v_solve.puzzle_type, v_cats[i], v_avg, v_solve.id, v_solve.created_at)
    on conflict (user_id, puzzle_type, category) do update
      set time_ms     = excluded.time_ms,
          solve_id    = excluded.solve_id,
          achieved_at = excluded.achieved_at,
          updated_at  = now()
      -- Ratchet: an insert can only ever improve an average PB.
      where excluded.time_ms < public.personal_bests.time_ms;
  end loop;
end;
$$;

-- ── 4. Triggers ────────────────────────────────────────────────────────────
-- INSERT is statement-level so a bulk write (the local→cloud sync upserts in
-- chunks of 500, and Phase 2's csTimer import will too) does not pay the
-- ratchet 500 times. Past the threshold a single authoritative recompute is
-- both cheaper and more correct — a bulk insert can arrive out of
-- chronological order, which the ratchet's "windows ending here" assumption
-- does not cover.
create or replace function public.maintain_average_pbs_on_insert()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_count integer;
  r       record;
begin
  select count(*) into v_count from new_solves;

  if v_count > 20 then
    for r in select distinct user_id, puzzle_type from new_solves loop
      perform public.recompute_all_pbs(r.user_id, r.puzzle_type);
    end loop;
  else
    for r in select id from new_solves loop
      perform public.ratchet_average_pbs_for_solve(r.id);
    end loop;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_solves_avg_pb_after_insert on public.solves;
create trigger trg_solves_avg_pb_after_insert
  after insert on public.solves
  referencing new table as new_solves
  for each statement execute function public.maintain_average_pbs_on_insert();

-- Repoint the Phase 1 healing triggers at the full recompute, so every path
-- that already healed the single PB now heals the averages too.
create or replace function public.recompute_pb_on_solve_delete()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  r record;
begin
  for r in select distinct user_id, puzzle_type from deleted_solves loop
    perform public.recompute_all_pbs(r.user_id, r.puzzle_type);
  end loop;
  return null;
end;
$$;

create or replace function public.recompute_pb_on_solve_update()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  r record;
begin
  for r in
    select distinct n.user_id, n.puzzle_type
    from new_solves n
    join old_solves o on o.id = n.id
    where n.deleted_at is distinct from o.deleted_at
       or n.penalty    is distinct from o.penalty
  loop
    perform public.recompute_all_pbs(r.user_id, r.puzzle_type);
  end loop;
  return null;
end;
$$;

-- ── 5. Lock the helpers down ───────────────────────────────────────────────
-- These are SECURITY DEFINER, and PostgreSQL grants EXECUTE to PUBLIC on new
-- functions by default — which would expose them as PostgREST RPC endpoints
-- taking an arbitrary user id. `best_average_of_n` RETURNS data, so that one
-- would read another user's averages straight through RLS. Triggers do not
-- check EXECUTE, so revoking costs nothing.
--
-- `recompute_single_pb` is from the Phase 1 migration and is revoked here for
-- the same reason (it returns void, so the exposure was a pointless write
-- surface rather than a leak).
revoke all on function public.best_average_of_n(uuid, public.puzzle_type, integer)      from public, anon, authenticated;
revoke all on function public.recompute_average_pbs(uuid, public.puzzle_type)           from public, anon, authenticated;
revoke all on function public.recompute_all_pbs(uuid, public.puzzle_type)               from public, anon, authenticated;
revoke all on function public.ratchet_average_pbs_for_solve(uuid)                       from public, anon, authenticated;
revoke all on function public.recompute_single_pb(uuid, public.puzzle_type)             from public, anon, authenticated;

-- ── 6. Fix: the summary view still counts soft-deleted solves ──────────────
-- Phase 1 added `solves.deleted_at` but did not update this view, so a reset
-- session still inflates total_solves and can hold best_single_ms at a time
-- the user has thrown away. Nothing read the view yet, which is why it went
-- unnoticed; Phase 2 analytics do.
create or replace view public.v_user_puzzle_summary with (security_invoker = on) as
select user_id,
       puzzle_type,
       count(*) as total_solves,
       count(*) filter (where penalty = 'dnf') as dnf_count,
       min(effective_time_ms) as best_single_ms,
       round(avg(effective_time_ms))::integer as mean_ms,
       max(created_at) as last_solved_at
from public.solves
where deleted_at is null
group by user_id, puzzle_type;

-- ── 7. Backfill ────────────────────────────────────────────────────────────
-- Existing users have solves but no average PBs. One authoritative pass over
-- every (user, puzzle) that has surviving solves.
do $$
declare
  r record;
begin
  for r in
    select distinct user_id, puzzle_type
    from public.solves
    where deleted_at is null
  loop
    perform public.recompute_average_pbs(r.user_id, r.puzzle_type);
  end loop;
end;
$$;
