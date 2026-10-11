-- Timer feature round (branch `timer-page`, docs/timer.md).
--
-- 1. Mo3 personal bests. `personal_bests.category` has always accepted
--    'mean3'; nothing wrote it. The timer now shows Mo3 for every event, so the
--    average-PB functions learn a third window kind. Rule (WCA mean of 3): the
--    plain mean of three solves, nothing trimmed, and any DNF makes the mean a
--    DNF (no PB candidate). Windows stay partitioned by session, like the
--    averages. In these functions `n = 3` means "mean", the same convention
--    as `windowStat()` in src/lib/timer/stats.ts.
-- 2. `solves.source` accepts 'manual' for typed-in times, so later
--    leaderboards can leave them out.
-- 3. Security advisor fixes: `is_admin()` gets a fixed search_path, and the
--    PB trigger functions stop being callable through the API.
--
-- ⚠️ Apply via the Supabase dashboard SQL editor, not the read-only MCP. The
-- live migration history is empty; see docs/todo.md before using `db push`.

-- ── 1a. Best mean/average over the surviving solves ────────────────────────
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
           -- Mo3: a plain mean, nothing trimmed.
           when %1$s = 3   then sum_ms::numeric / 3
           -- One DNF: it is the worst solve, so the trim drops it and the
           -- best finite time — never a second finite time.
           when n_dnf = 1  then (sum_ms - min_ms)::numeric / (%1$s - 2)
           else                (sum_ms - min_ms - max_ms)::numeric / (%1$s - 2)
         end) / 10
      ) * 10)::integer as time_ms,
      id               as solve_id,
      created_at       as achieved_at
    from windows
    where n_rows = %1$s
      -- A mean allows no DNF; a trimmed average allows one.
      and n_dnf < (case when %1$s = 3 then 1 else 2 end)
    -- Ties go to the earliest — the first time the cuber hit it.
    order by time_ms asc, created_at asc
    limit 1
  $sql$, p_n)
  using p_user, p_puzzle;
end;
$fn$;

-- ── 1b. Authoritative recompute: add mean3 ─────────────────────────────────
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
  v_cats constant text[]    := array['mean3', 'ao5', 'ao12', 'ao50', 'ao100'];
  v_ns   constant integer[] := array[3, 5, 12, 50, 100];
  v_best record;
  i      integer;
begin
  for i in 1 .. array_length(v_ns, 1) loop
    select * into v_best
    from public.best_average_of_n(p_user, p_puzzle, v_ns[i]);

    if v_best.time_ms is null then
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
        set time_ms     = excluded.time_ms,
            solve_id    = excluded.solve_id,
            achieved_at = excluded.achieved_at,
            updated_at  = now();
    end if;
  end loop;
end;
$$;

-- ── 1c. Insert fast path: add mean3 ────────────────────────────────────────
create or replace function public.ratchet_average_pbs_for_solve(p_solve_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_cats constant text[]    := array['mean3', 'ao5', 'ao12', 'ao50', 'ao100'];
  v_ns   constant integer[] := array[3, 5, 12, 50, 100];
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

    -- Short window, or the result is itself a DNF: no PB candidate.
    continue when v_rows < v_ns[i];
    continue when v_ns[i] = 3 and v_dnf >= 1;
    continue when v_dnf >= 2;

    if v_ns[i] = 3 then
      v_avg := (round(v_sum::numeric / 3 / 10) * 10)::integer;
    else
      v_avg := (round(
        (case when v_dnf = 1 then v_sum - v_min else v_sum - v_min - v_max end)::numeric
        / (v_ns[i] - 2)::numeric / 10
      ) * 10)::integer;
    end if;

    insert into public.personal_bests
      (user_id, puzzle_type, category, time_ms, solve_id, achieved_at)
    values
      (v_solve.user_id, v_solve.puzzle_type, v_cats[i], v_avg, v_solve.id, v_solve.created_at)
    on conflict (user_id, puzzle_type, category) do update
      set time_ms     = excluded.time_ms,
          solve_id    = excluded.solve_id,
          achieved_at = excluded.achieved_at,
          updated_at  = now()
      where excluded.time_ms < public.personal_bests.time_ms;
  end loop;
end;
$$;

-- `create or replace` keeps existing grants, but restate the lock-down so this
-- file is safe to read on its own.
revoke all on function public.best_average_of_n(uuid, public.puzzle_type, integer) from public, anon, authenticated;
revoke all on function public.recompute_average_pbs(uuid, public.puzzle_type)      from public, anon, authenticated;
revoke all on function public.ratchet_average_pbs_for_solve(uuid)                  from public, anon, authenticated;

-- ── 2. Typed-in times ──────────────────────────────────────────────────────
alter table public.solves drop constraint if exists solves_source_check;
alter table public.solves add constraint solves_source_check
  check (source in ('web', 'mobile', 'import', 'stackmat', 'manual'));

-- ── 3. Security advisor fixes ──────────────────────────────────────────────
-- is_admin() only references schema-qualified objects, so an empty
-- search_path changes nothing except closing the search_path hijack.
alter function public.is_admin() set search_path to '';

-- Trigger functions run as triggers whether or not anyone holds EXECUTE, so
-- revoking only removes them from the API surface.
revoke all on function public.maintain_average_pbs_on_insert() from public, anon, authenticated;
revoke all on function public.recompute_pb_on_solve_delete()   from public, anon, authenticated;
revoke all on function public.recompute_pb_on_solve_update()   from public, anon, authenticated;

-- ── 4. Backfill Mo3 PBs for existing solves ────────────────────────────────
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
