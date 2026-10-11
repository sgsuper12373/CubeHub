-- Profile progress (docs/profile.md, Step 3).
--
-- 1. `profiles.show_activity` / `show_learning` (default true): a public
--    profile can still keep its practice calendar or its learning private.
-- 2. `profile_visible(p_user)`: the one privacy check (public, or it's you).
-- 3. `get_profile_stats` gains `activity` (IST day counts for the last 53
--    weeks, current and longest streak, active days) and `learning` (learned
--    cases per algorithm set). Each is null for a non-owner when hidden.
-- 4. `get_pb_progression(p_user, p_puzzle)`: every time single, Ao5 or Ao12
--    improved, for the PB timeline. Derived from the solves on the fly, so
--    deleting or penalising a solve reshapes the history with no extra table.
--
-- Like Steps 1 and 2: SECURITY DEFINER, aggregates only. RLS on `solves` and
-- `user_algorithm_bookmarks` stays owner-only.
--
-- ⚠️ Apply via the Supabase dashboard SQL editor, not the read-only MCP.

-- ── 1. Section toggles ─────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists show_activity boolean not null default true,
  add column if not exists show_learning boolean not null default true;

-- ── 2. The privacy check ───────────────────────────────────────────────────
create or replace function public.profile_visible(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user
      and (p.is_public or p.id = (select auth.uid()))
  );
$$;

-- ── 3. Stats, with activity and learning ───────────────────────────────────
create or replace function public.get_profile_stats(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_owner    boolean := coalesce(p_user = (select auth.uid()), false);
  v_profile  record;
  v_base     jsonb;
  v_activity jsonb;
  v_learning jsonb;
  -- "Today" for streaks and the calendar: India time, until profiles carry a timezone.
  v_today    date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if not public.profile_visible(p_user) then
    return jsonb_build_object('private', true);
  end if;

  select p.show_activity, p.show_learning into v_profile
  from public.profiles p where p.id = p_user;

  select jsonb_build_object(
    'private',        false,
    'total_solves',   count(*),
    'by_event',       coalesce(
                        (select jsonb_object_agg(e.puzzle_type, e.n)
                         from (select s2.puzzle_type, count(*) as n
                               from public.solves s2
                               where s2.user_id = p_user and s2.deleted_at is null
                               group by s2.puzzle_type) e),
                        '{}'::jsonb),
    'first_solve_on', (min(s.created_at) at time zone 'Asia/Kolkata')::date,
    'last_solve_on',  (max(s.created_at) at time zone 'Asia/Kolkata')::date
  ) into v_base
  from public.solves s
  where s.user_id = p_user
    and s.deleted_at is null;

  if v_owner or v_profile.show_activity then
    with days as (
      select (s.created_at at time zone 'Asia/Kolkata')::date as d, count(*) as n
      from public.solves s
      where s.user_id = p_user and s.deleted_at is null
      group by 1
    ),
    -- Gaps and islands: consecutive days share the same (day - row number).
    islands as (
      select d, d - (row_number() over (order by d))::integer as grp
      from days
    ),
    runs as (
      select max(d) as last_day, count(*) as len
      from islands
      group by grp
    )
    select jsonb_build_object(
      'days', coalesce(
                (select jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d)
                 from days where d > v_today - 371),
                '[]'::jsonb),
      -- A streak is still alive until a whole day passes without a solve.
      'current_streak', coalesce(
                (select len from runs where last_day >= v_today - 1
                 order by last_day desc limit 1), 0),
      'longest_streak', coalesce((select max(len) from runs), 0),
      'active_days', (select count(*) from days)
    ) into v_activity;
  end if;

  if v_owner or v_profile.show_learning then
    -- A case counts as learned when any of its algorithms is marked learned
    -- (the same rule as the Learn pages, src/lib/learn/dal.ts).
    select coalesce(
             jsonb_agg(jsonb_build_object(
               'puzzle', t.puzzle_type, 'slug', t.slug, 'name', t.name,
               'learned', t.learned, 'total', t.total)
               order by t.puzzle_type, t.order_index, t.slug),
             '[]'::jsonb)
      into v_learning
    from (
      select sub.puzzle_type, sub.slug, sub.name, sub.order_index,
             count(c.id) as total,
             count(c.id) filter (where exists (
               select 1
               from public.algorithms a
               join public.user_algorithm_bookmarks b on b.algorithm_id = a.id
               where a.case_id = c.id and b.user_id = p_user and b.learned
             )) as learned
      from public.algorithm_subsets sub
      join public.algorithm_cases c
        on c.puzzle_type = sub.puzzle_type and c.subset = sub.slug
      where sub.is_published
      group by sub.id, sub.puzzle_type, sub.slug, sub.name, sub.order_index
    ) t
    where t.learned > 0;
  end if;

  return v_base || jsonb_build_object('activity', v_activity, 'learning', v_learning);
end;
$$;

-- ── 4. PB progression ──────────────────────────────────────────────────────
-- Every time the best AoN improved, oldest first. Same window maths as
-- best_average_of_n (20261011000000_timer_round.sql): windows within one
-- session, one DNF trimmed as the worst, two or more make the average a DNF,
-- rounded to 10 ms. n is interpolated as a literal for the window frame and
-- only ever comes from get_pb_progression below.
create or replace function public.average_progression(
  p_user   uuid,
  p_puzzle public.puzzle_type,
  p_n      integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $fn$
declare
  v_points jsonb;
begin
  execute format($sql$
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
    ),
    averages as (
      select id, created_at,
             (round(
               (case when n_dnf = 1 then sum_ms - min_ms else sum_ms - min_ms - max_ms end)::numeric
               / (%1$s - 2)::numeric / 10
             ) * 10)::integer as ms
      from windows
      where n_rows = %1$s and n_dnf < 2
    ),
    running as (
      select id, created_at, ms,
             min(ms) over (order by created_at, id
                           rows between unbounded preceding and 1 preceding) as best_before
      from averages
    )
    select coalesce(
             jsonb_agg(jsonb_build_object('at', created_at, 'ms', ms) order by created_at, id),
             '[]'::jsonb)
    from running
    where best_before is null or ms < best_before
  $sql$, p_n)
  into v_points
  using p_user, p_puzzle;

  return v_points;
end;
$fn$;

create or replace function public.get_pb_progression(p_user uuid, p_puzzle public.puzzle_type)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_single jsonb;
begin
  if not public.profile_visible(p_user) then
    return jsonb_build_object('private', true);
  end if;

  with finished as (
    select s.id, s.created_at, s.effective_time_ms as ms
    from public.solves s
    where s.user_id = p_user
      and s.puzzle_type = p_puzzle
      and s.deleted_at is null
      and s.effective_time_ms is not null
  ),
  running as (
    select id, created_at, ms,
           min(ms) over (order by created_at, id
                         rows between unbounded preceding and 1 preceding) as best_before
    from finished
  )
  select coalesce(
           jsonb_agg(jsonb_build_object('at', created_at, 'ms', ms) order by created_at, id),
           '[]'::jsonb)
    into v_single
  from running
  where best_before is null or ms < best_before;

  return jsonb_build_object(
    'private', false,
    'single',  v_single,
    'ao5',     public.average_progression(p_user, p_puzzle, 5),
    'ao12',    public.average_progression(p_user, p_puzzle, 12)
  );
end;
$$;

-- ── 5. Grants ──────────────────────────────────────────────────────────────
revoke all on function public.profile_visible(uuid)                            from public;
revoke all on function public.get_profile_stats(uuid)                          from public;
revoke all on function public.get_pb_progression(uuid, public.puzzle_type)     from public;
revoke all on function public.average_progression(uuid, public.puzzle_type, integer) from public, anon, authenticated;

grant execute on function public.profile_visible(uuid)                         to anon, authenticated;
grant execute on function public.get_profile_stats(uuid)                       to anon, authenticated;
grant execute on function public.get_pb_progression(uuid, public.puzzle_type)  to anon, authenticated;
