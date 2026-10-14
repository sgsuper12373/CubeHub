-- Solve sanity and fair achievements (pre-beta review, 2026-10-15).
--
-- A tester saw accidental solves as public records: a 0.02 3x3 single, a 0.03
-- Ao12 with a "Sub-8" level, suggested to others as "3x3 Ao12 0.03". And
-- achievements were only worked out when the owner opened the timer or their
-- own profile, so a cuber who signed up earlier showed 0/20, and backfilled
-- badges carried the backfill date instead of the day they were earned.
--
-- 1. Which solves count. A solve counts for records unless
--      * it is a misfire: a raw time under the event's limit (misfire_limit_ms,
--        a little under the world record), or
--      * its owner left it out (`solves.excluded`, set from the solve detail).
--    A solve that doesn't count stays in the session list. It is skipped by
--    personal bests (single and every average window), the PB timeline, the
--    level, achievements and suggestions, as if it weren't there.
-- 2. Every PB function learns that rule, and the update trigger recomputes
--    when `excluded` changes. All PBs are recomputed once at the end.
-- 3. Achievements are awarded by triggers on `solves` and
--    `user_algorithm_bookmarks`, for whoever's rows changed, and each badge is
--    dated by when its condition was first met (the 100th solve, the first
--    sub-20, the 7th day of the streak). `award_achievements()` stays the RPC
--    the timer calls, and now returns the badges not yet shown in a toast.
--    One-time re-derivation: badges that no longer qualify (all of them earned
--    by misfires) are removed, the rest are re-dated, missing ones are added.
-- 4. `get_activity_feed`: PBs, practice days, badges and learned cases from
--    the people you follow (or everyone public), last 30 days by default.
-- 5. `suggest_profiles`: people who follow you first, then same country,
--    nearest 3x3 Ao12, most recently active. Any cuber with a counted solve
--    in the last 90 days qualifies, not just those with PBs.
-- 6. The WCA ID form's placeholder ("2019SING01") is cleared where it was
--    saved. IDs are hidden from other people in the app until verification.
-- 7. Drill Lab: a rep faster than 60 ms a move (over 16 turns a second, with
--    a 0.30 floor) is a misfire. The variant medians leave those out, so an
--    accidental 0.56 OLL 52 stops ranking it as a strength.
--
-- ⚠️ Apply via the Supabase dashboard SQL editor, not the read-only MCP. Then
-- run supabase/tests/solve_sanity_test.sql and expect every row to be PASS.

-- ── 1. Which solves count ──────────────────────────────────────────────────
alter table public.solves
  add column if not exists excluded boolean not null default false;

-- A little under each event's world-record single. Raw time, before any +2,
-- so a +2 doesn't rescue a misfire. Mirrored in src/lib/timer/misfire.ts.
create or replace function public.misfire_limit_ms(p_puzzle public.puzzle_type)
returns integer
language sql
immutable
set search_path to ''
as $$
  select case p_puzzle
    when '333'   then 3000
    when '222'   then 400
    when '444'   then 15000
    when '555'   then 30000
    when '666'   then 55000
    when '777'   then 90000
    when '333oh' then 5000
    when 'pyra'  then 700
    when 'skewb' then 700
    when 'mega'  then 22000
    when 'sq1'   then 3000
    when 'clock' then 1500
    else 1000
  end;
$$;

create or replace function public.solve_counts(
  p_puzzle   public.puzzle_type,
  p_time_ms  integer,
  p_excluded boolean
)
returns boolean
language sql
immutable
set search_path to ''
as $$
  select not p_excluded and p_time_ms >= public.misfire_limit_ms(p_puzzle);
$$;

-- ── 2a. Single PB: insert ratchet and authoritative recompute ──────────────
create or replace function public.maintain_single_pb()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.penalty = 'dnf' or new.effective_time_ms is null
     or not public.solve_counts(new.puzzle_type, new.time_ms, new.excluded) then
    return new;
  end if;

  insert into public.personal_bests (user_id, puzzle_type, category, time_ms, solve_id, achieved_at)
  values (new.user_id, new.puzzle_type, 'single', new.effective_time_ms, new.id, new.created_at)
  on conflict (user_id, puzzle_type, category) do update
    set time_ms     = excluded.time_ms,
        solve_id    = excluded.solve_id,
        achieved_at = excluded.achieved_at,
        updated_at  = now()
    where excluded.time_ms < public.personal_bests.time_ms;

  return new;
end;
$$;

create or replace function public.recompute_single_pb(
  p_user   uuid,
  p_puzzle public.puzzle_type
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_best public.solves%rowtype;
begin
  select *
    into v_best
  from public.solves s
  where s.user_id = p_user
    and s.puzzle_type = p_puzzle
    and s.deleted_at is null
    and s.effective_time_ms is not null
    and public.solve_counts(s.puzzle_type, s.time_ms, s.excluded)
  order by s.effective_time_ms asc, s.created_at asc
  limit 1;

  if v_best.id is null then
    delete from public.personal_bests
    where user_id = p_user
      and puzzle_type = p_puzzle
      and category = 'single';
  else
    insert into public.personal_bests
      (user_id, puzzle_type, category, time_ms, solve_id, achieved_at)
    values
      (p_user, p_puzzle, 'single', v_best.effective_time_ms, v_best.id, v_best.created_at)
    on conflict (user_id, puzzle_type, category) do update
      set time_ms     = excluded.time_ms,
          solve_id    = excluded.solve_id,
          achieved_at = excluded.achieved_at,
          updated_at  = now();
  end if;
end;
$$;

-- ── 2b. Average PBs: same maths as 20261011000000_timer_round.sql, over
-- the solves that count. A left-out solve is skipped, not a DNF: the window
-- closes over the counted solves on either side of it.
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
        and public.solve_counts(s.puzzle_type, s.time_ms, s.excluded)
      window w as (
        partition by s.session_id
        order by s.created_at, s.id
        rows between %1$s - 1 preceding and current row
      )
    )
    select
      (round(
        (case
           when %1$s = 3   then sum_ms::numeric / 3
           when n_dnf = 1  then (sum_ms - min_ms)::numeric / (%1$s - 2)
           else                (sum_ms - min_ms - max_ms)::numeric / (%1$s - 2)
         end) / 10
      ) * 10)::integer as time_ms,
      id               as solve_id,
      created_at       as achieved_at
    from windows
    where n_rows = %1$s
      and n_dnf < (case when %1$s = 3 then 1 else 2 end)
    order by time_ms asc, created_at asc
    limit 1
  $sql$, p_n)
  using p_user, p_puzzle;
end;
$fn$;

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
  if not found or v_solve.deleted_at is not null
     or not public.solve_counts(v_solve.puzzle_type, v_solve.time_ms, v_solve.excluded) then
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
        and public.solve_counts(s.puzzle_type, s.time_ms, s.excluded)
        and (s.created_at, s.id) <= (v_solve.created_at, v_solve.id)
      order by s.created_at desc, s.id desc
      limit v_ns[i]
    ) recent;

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

-- Leaving a solve out (or putting it back) reshapes every PB, like a penalty.
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
       or n.excluded   is distinct from o.excluded
  loop
    perform public.recompute_all_pbs(r.user_id, r.puzzle_type);
  end loop;
  return null;
end;
$$;

-- ── 2c. Level and PB timeline ──────────────────────────────────────────────
create or replace function public.best_timer_average(
  p_user   uuid,
  p_puzzle public.puzzle_type,
  p_n      integer
)
returns integer
language plpgsql
stable
security definer
set search_path to ''
as $fn$
declare
  v_best integer;
begin
  execute format($sql$
    with windows as (
      select
        count(*)                                            over w as n_rows,
        count(*) filter (where s.effective_time_ms is null) over w as n_dnf,
        sum(s.effective_time_ms)                            over w as sum_ms,
        min(s.effective_time_ms)                            over w as min_ms,
        max(s.effective_time_ms)                            over w as max_ms
      from public.solves s
      where s.user_id = $1
        and s.puzzle_type = $2
        and s.deleted_at is null
        and s.source <> 'manual'
        and public.solve_counts(s.puzzle_type, s.time_ms, s.excluded)
      window w as (
        partition by s.session_id
        order by s.created_at, s.id
        rows between %1$s - 1 preceding and current row
      )
    )
    select min((round(
             (case when n_dnf = 1 then sum_ms - min_ms else sum_ms - min_ms - max_ms end)::numeric
             / (%1$s - 2)::numeric / 10
           ) * 10)::integer)
    from windows
    where n_rows = %1$s and n_dnf < 2
  $sql$, p_n)
  into v_best
  using p_user, p_puzzle;
  return v_best;
end;
$fn$;

-- When a timer-only AoN first went under p_ms (for dating "Consistent" and
-- "Machine"). Same windows as best_timer_average.
create or replace function public.first_timer_average_under(
  p_user   uuid,
  p_puzzle public.puzzle_type,
  p_n      integer,
  p_ms     integer
)
returns timestamptz
language plpgsql
stable
security definer
set search_path to ''
as $fn$
declare
  v_at timestamptz;
begin
  execute format($sql$
    with windows as (
      select
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
        and s.source <> 'manual'
        and public.solve_counts(s.puzzle_type, s.time_ms, s.excluded)
      window w as (
        partition by s.session_id
        order by s.created_at, s.id
        rows between %1$s - 1 preceding and current row
      )
    )
    select min(created_at)
    from windows
    where n_rows = %1$s and n_dnf < 2
      and (round(
             (case when n_dnf = 1 then sum_ms - min_ms else sum_ms - min_ms - max_ms end)::numeric
             / (%1$s - 2)::numeric / 10
           ) * 10)::integer < $3
  $sql$, p_n)
  into v_at
  using p_user, p_puzzle, p_ms;
  return v_at;
end;
$fn$;

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
        and public.solve_counts(s.puzzle_type, s.time_ms, s.excluded)
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
      and public.solve_counts(s.puzzle_type, s.time_ms, s.excluded)
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

-- ── 3. Achievements, on the server, with real dates ────────────────────────
alter table public.user_achievements
  add column if not exists notified_at timestamptz;

-- Learned sets, with when each was completed: a case's learned time is its
-- earliest learned bookmark, a set is complete when its last case was learned.
-- Bookmarks carry only created_at, so a case marked learned on an existing
-- bookmark is dated by when it was bookmarked: never later than the truth.
create or replace function public.learned_sets_at(p_user uuid)
returns table (puzzle public.puzzle_type, slug text, learned bigint, total bigint, completed_at timestamptz)
language sql
stable
security definer
set search_path to ''
as $$
  with per_case as (
    select sub.puzzle_type, sub.slug, c.id,
           (select min(b.created_at)
            from public.algorithms a
            join public.user_algorithm_bookmarks b on b.algorithm_id = a.id
            where a.case_id = c.id and b.user_id = p_user and b.learned) as learned_at
    from public.algorithm_subsets sub
    join public.algorithm_cases c
      on c.puzzle_type = sub.puzzle_type and c.subset = sub.slug
    where sub.is_published
  )
  select puzzle_type, slug,
         count(learned_at), count(*),
         case when count(learned_at) = count(*) then max(learned_at) end
  from per_case
  group by puzzle_type, slug;
$$;

-- When a badge's condition was first met, or null if it isn't met. Only
-- counted solves (no misfires, nothing left out) count for anything; typed-in
-- times count for milestones and streaks but not for speed (2026-10-12).
create or replace function public.achievement_earned_at(
  p_user uuid,
  p_type text,
  p_c    jsonb
)
returns timestamptz
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_at timestamptz;
begin
  case p_type
    when 'solve_count' then
      select s.created_at into v_at
      from public.solves s
      where s.user_id = p_user and s.deleted_at is null
        and public.solve_counts(s.puzzle_type, s.time_ms, s.excluded)
      order by s.created_at, s.id
      offset (p_c->>'n')::integer - 1 limit 1;

    when 'events_count' then
      select e.first_at into v_at
      from (select min(s.created_at) as first_at
            from public.solves s
            where s.user_id = p_user and s.deleted_at is null
              and public.solve_counts(s.puzzle_type, s.time_ms, s.excluded)
            group by s.puzzle_type) e
      order by e.first_at
      offset (p_c->>'n')::integer - 1 limit 1;

    when 'streak', 'solves_in_day' then
      with counted as (
        select s.created_at, (s.created_at at time zone 'Asia/Kolkata')::date as d
        from public.solves s
        where s.user_id = p_user and s.deleted_at is null
          and public.solve_counts(s.puzzle_type, s.time_ms, s.excluded)
      ),
      days as (
        select d, min(created_at) as first_at from counted group by d
      ),
      islands as (
        select d, first_at, d - (row_number() over (order by d))::integer as grp from days
      ),
      -- The day a streak reached its target: the (days)th day of the run.
      streak_days as (
        select first_at,
               row_number() over (partition by grp order by d) as day_no
        from islands
      ),
      -- The nth solve on a day.
      day_solves as (
        select created_at,
               row_number() over (partition by d order by created_at) as k
        from counted
      )
      select case p_type
               when 'streak' then (select min(first_at) from streak_days
                                   where day_no = (p_c->>'days')::integer)
               else (select min(created_at) from day_solves
                     where k = (p_c->>'n')::integer)
             end
        into v_at;

    when 'night_solve' then
      select min(s.created_at) into v_at
      from public.solves s
      where s.user_id = p_user and s.deleted_at is null and s.source <> 'manual'
        and public.solve_counts(s.puzzle_type, s.time_ms, s.excluded)
        and extract(hour from s.created_at at time zone 'Asia/Kolkata') in (2, 3);

    when 'single_under' then
      select min(s.created_at) into v_at
      from public.solves s
      where s.user_id = p_user
        and s.puzzle_type = (p_c->>'puzzle')::public.puzzle_type
        and s.deleted_at is null and s.source <> 'manual'
        and public.solve_counts(s.puzzle_type, s.time_ms, s.excluded)
        and s.effective_time_ms < (p_c->>'ms')::integer;

    when 'average_under' then
      v_at := public.first_timer_average_under(
        p_user, (p_c->>'puzzle')::public.puzzle_type, (p_c->>'n')::integer, (p_c->>'ms')::integer);

    when 'set_learned' then
      select l.completed_at into v_at
      from public.learned_sets_at(p_user) l
      where l.puzzle = (p_c->>'puzzle')::public.puzzle_type
        and l.slug = p_c->>'slug' and l.total > 0;

    when 'any_set_learned' then
      select min(l.completed_at) into v_at
      from public.learned_sets_at(p_user) l
      where l.puzzle = (p_c->>'puzzle')::public.puzzle_type and l.total > 0;

    else
      v_at := null;
  end case;
  return v_at;
end;
$$;

-- Award every badge the cuber now meets, dated when it was met. Badges stay
-- once earned. New rows have notified_at null until a toast shows them.
create or replace function public.award_achievements_for(p_user uuid)
returns void
language sql
volatile
security definer
set search_path to ''
as $$
  insert into public.user_achievements (user_id, achievement_id, unlocked_at)
  select p_user, m.id, m.at
  from (
    select a.id, public.achievement_earned_at(p_user, a.condition_type, a.condition_value) as at
    from public.achievements a
    where not exists (
      select 1 from public.user_achievements ua
      where ua.user_id = p_user and ua.achievement_id = a.id
    )
  ) m
  where m.at is not null
  on conflict do nothing;
$$;

-- The RPC the app calls after a solve or a learned mark: what's new since the
-- last toast. The triggers below have already awarded; awarding again here is
-- a cheap no-op that covers anything they missed.
create or replace function public.award_achievements()
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_new  jsonb;
begin
  if v_user is null then
    return '[]'::jsonb;
  end if;

  perform public.award_achievements_for(v_user);

  with shown as (
    update public.user_achievements ua
    set notified_at = now()
    where ua.user_id = v_user and ua.notified_at is null
    returning ua.achievement_id
  )
  select coalesce(
           jsonb_agg(jsonb_build_object('slug', a.slug, 'title', a.title, 'description', a.description)
                     order by a.slug),
           '[]'::jsonb)
    into v_new
  from shown
  join public.achievements a on a.id = shown.achievement_id;

  return v_new;
end;
$$;

create or replace function public.award_on_solves_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  r record;
begin
  for r in select distinct user_id from changed_solves loop
    perform public.award_achievements_for(r.user_id);
  end loop;
  return null;
end;
$$;

drop trigger if exists trg_solves_award_after_insert on public.solves;
create trigger trg_solves_award_after_insert
  after insert on public.solves
  referencing new table as changed_solves
  for each statement execute function public.award_on_solves_change();

-- Updates too: restoring a solve or putting one back in can meet a badge.
drop trigger if exists trg_solves_award_after_update on public.solves;
create trigger trg_solves_award_after_update
  after update on public.solves
  referencing new table as changed_solves
  for each statement execute function public.award_on_solves_change();

create or replace function public.award_on_bookmarks_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  r record;
begin
  for r in select distinct user_id from changed_bookmarks where learned loop
    perform public.award_achievements_for(r.user_id);
  end loop;
  return null;
end;
$$;

drop trigger if exists trg_bookmarks_award_after_insert on public.user_algorithm_bookmarks;
create trigger trg_bookmarks_award_after_insert
  after insert on public.user_algorithm_bookmarks
  referencing new table as changed_bookmarks
  for each statement execute function public.award_on_bookmarks_change();

drop trigger if exists trg_bookmarks_award_after_update on public.user_algorithm_bookmarks;
create trigger trg_bookmarks_award_after_update
  after update on public.user_algorithm_bookmarks
  referencing new table as changed_bookmarks
  for each statement execute function public.award_on_bookmarks_change();

-- ── 4. Activity feed ───────────────────────────────────────────────────────
-- p_scope 'following': accepted follows. 'everyone': every profile you can
-- see, so a small group of testers still has something to look at. Never you.
-- Each section honours the same privacy as the profile: practice days need
-- show_activity, learned cases need show_learning.
create or replace function public.get_activity_feed(
  p_scope text default 'following',
  p_days  integer default 30
)
returns table (
  kind text, user_id uuid, username text, display_name text, avatar_url text,
  puzzle_type public.puzzle_type, category text, time_ms integer,
  n integer, label text, at timestamptz
)
language sql
stable
security definer
set search_path to ''
as $$
  with me as (select (select auth.uid()) as id),
  since as (
    select now() - make_interval(days => least(greatest(p_days, 1), 90)) as t
  ),
  people as (
    select p.id, p.username, p.display_name, p.avatar_url, p.show_activity, p.show_learning
    from public.profiles p, me
    where me.id is not null
      and p.id <> me.id
      and public.profile_visible(p.id)
      and (
        (p_scope = 'everyone')
        or exists (select 1 from public.user_follows f
                   where f.follower_id = me.id and f.following_id = p.id
                     and f.status = 'accepted')
      )
  ),
  pbs as (
    select 'pb'::text as kind, pe.id as user_id, pb.puzzle_type, pb.category,
           pb.time_ms, null::integer as n, null::text as label, pb.achieved_at as at
    from people pe
    join public.personal_bests pb on pb.user_id = pe.id
    cross join since
    where pb.category in ('single', 'mean3', 'ao5', 'ao12', 'ao100')
      and pb.achieved_at > since.t
  ),
  practice as (
    select 'practice'::text, pe.id, s.puzzle_type, null::text,
           min(s.effective_time_ms)::integer, count(*)::integer, null::text, max(s.created_at)
    from people pe
    join public.solves s on s.user_id = pe.id
    cross join since
    where pe.show_activity
      and s.deleted_at is null
      and s.created_at > since.t
      and public.solve_counts(s.puzzle_type, s.time_ms, s.excluded)
    group by pe.id, s.puzzle_type, (s.created_at at time zone 'Asia/Kolkata')::date
  ),
  badges as (
    select 'badge'::text, pe.id, null::public.puzzle_type, a.slug, null::integer,
           null::integer, a.title, ua.unlocked_at
    from people pe
    join public.user_achievements ua on ua.user_id = pe.id
    join public.achievements a on a.id = ua.achievement_id
    cross join since
    where ua.unlocked_at > since.t
  ),
  learned as (
    select 'learned'::text, pe.id, c.puzzle_type, c.subset, null::integer,
           count(distinct c.id)::integer, sub.name, max(b.created_at)
    from people pe
    join public.user_algorithm_bookmarks b on b.user_id = pe.id and b.learned
    join public.algorithms a on a.id = b.algorithm_id
    join public.algorithm_cases c on c.id = a.case_id
    join public.algorithm_subsets sub on sub.puzzle_type = c.puzzle_type and sub.slug = c.subset
    cross join since
    where pe.show_learning
      and b.created_at > since.t
    group by pe.id, c.puzzle_type, c.subset, sub.name, (b.created_at at time zone 'Asia/Kolkata')::date
  ),
  items as (
    select * from pbs
    union all select * from practice
    union all select * from badges
    union all select * from learned
  )
  select i.kind, i.user_id, pe.username, pe.display_name, pe.avatar_url,
         i.puzzle_type, i.category, i.time_ms, i.n, i.label, i.at
  from items i
  join people pe on pe.id = i.user_id
  order by i.at desc
  limit 60;
$$;

-- ── 5. Suggestions ─────────────────────────────────────────────────────────
drop function if exists public.suggest_profiles();
create or replace function public.suggest_profiles()
returns table (
  user_id uuid, username text, display_name text, avatar_url text,
  ao12_ms integer, follows_me boolean, last_active_at timestamptz
)
language sql
stable
security definer
set search_path to ''
as $$
  with me as (
    select p.id, p.country,
           (select pb.time_ms from public.personal_bests pb
            where pb.user_id = p.id and pb.puzzle_type = '333' and pb.category = 'ao12') as ao12
    from public.profiles p
    where p.id = (select auth.uid())
  ),
  candidates as (
    select p.id, p.username, p.display_name, p.avatar_url, p.country,
           pb.time_ms as ao12,
           exists (select 1 from public.user_follows f
                   where f.follower_id = p.id and f.following_id = me.id
                     and f.status = 'accepted') as follows_me,
           (select max(s.created_at) from public.solves s
            where s.user_id = p.id and s.deleted_at is null
              and public.solve_counts(s.puzzle_type, s.time_ms, s.excluded)) as last_active_at
    from public.profiles p
    cross join me
    left join public.personal_bests pb
      on pb.user_id = p.id and pb.puzzle_type = '333' and pb.category = 'ao12'
    where p.is_public
      and p.id <> me.id
      and not exists (select 1 from public.user_follows f
                      where f.follower_id = me.id and f.following_id = p.id)
      and not public.is_blocked_between(me.id, p.id)
  )
  select c.id, c.username, c.display_name, c.avatar_url, c.ao12, c.follows_me, c.last_active_at
  from candidates c
  cross join me
  where c.last_active_at > now() - interval '90 days' or c.follows_me
  order by
    c.follows_me desc,
    (c.country is not distinct from me.country) desc,
    case when me.ao12 is not null and c.ao12 is not null then abs(c.ao12 - me.ao12) end nulls last,
    c.last_active_at desc nulls last
  limit 10;
$$;

-- ── 6. WCA placeholder ─────────────────────────────────────────────────────
update public.profiles set wca_id = null where wca_id = '2019SING01';

-- ── 7. Drill misfires ──────────────────────────────────────────────────────
-- Mirrored in src/lib/timer/misfire.ts (drillMisfireLimitMs).
create or replace function public.drill_misfire_limit_ms(p_move_count integer)
returns integer
language sql
immutable
set search_path to ''
as $$
  select greatest(300, coalesce(p_move_count, 0) * 60);
$$;

-- As in 20260930000000_drill_lab.sql, but the medians skip misfires. Counts
-- still include every rep.
create or replace view public.v_drill_variant_stats with (security_invoker = on) as
select a.user_id,
       a.algorithm_id,
       al.case_id,
       count(*)::integer                                           as attempts,
       (count(*) filter (where a.succeeded))::integer              as successes,
       round(percentile_cont(0.5) within group (order by a.effective_time_ms)
             filter (where a.time_ms >= public.drill_misfire_limit_ms(al.move_count)))::integer
                                                                   as median_ms,
       round(percentile_cont(0.5) within group (order by a.recognition_ms)
             filter (where a.time_ms >= public.drill_misfire_limit_ms(al.move_count)))::integer
                                                                   as median_recognition_ms,
       max(a.created_at)                                           as last_attempt_at,
       s.ease,
       s.next_review_at
from public.drill_attempts a
join public.algorithms al on al.id = a.algorithm_id
left join public.drill_state s
  on s.user_id = a.user_id and s.algorithm_id = a.algorithm_id
group by a.user_id, a.algorithm_id, al.case_id, s.ease, s.next_review_at;

-- ── Grants ─────────────────────────────────────────────────────────────────
revoke all on function public.drill_misfire_limit_ms(integer)                          from public;
grant execute on function public.drill_misfire_limit_ms(integer)                       to anon, authenticated;
revoke all on function public.misfire_limit_ms(public.puzzle_type)                      from public;
revoke all on function public.solve_counts(public.puzzle_type, integer, boolean)        from public;
grant execute on function public.misfire_limit_ms(public.puzzle_type)                   to anon, authenticated;
grant execute on function public.solve_counts(public.puzzle_type, integer, boolean)     to anon, authenticated;

revoke all on function public.first_timer_average_under(uuid, public.puzzle_type, integer, integer) from public, anon, authenticated;
revoke all on function public.learned_sets_at(uuid)                                    from public, anon, authenticated;
revoke all on function public.achievement_earned_at(uuid, text, jsonb)                 from public, anon, authenticated;
revoke all on function public.award_achievements_for(uuid)                             from public, anon, authenticated;
revoke all on function public.award_on_solves_change()                                 from public, anon, authenticated;
revoke all on function public.award_on_bookmarks_change()                              from public, anon, authenticated;
revoke all on function public.best_timer_average(uuid, public.puzzle_type, integer)    from public, anon, authenticated;
revoke all on function public.best_average_of_n(uuid, public.puzzle_type, integer)     from public, anon, authenticated;
revoke all on function public.ratchet_average_pbs_for_solve(uuid)                      from public, anon, authenticated;
revoke all on function public.recompute_single_pb(uuid, public.puzzle_type)            from public, anon, authenticated;
revoke all on function public.recompute_pb_on_solve_update()                           from public, anon, authenticated;
revoke all on function public.maintain_single_pb()                                     from public, anon, authenticated;
revoke all on function public.average_progression(uuid, public.puzzle_type, integer)   from public, anon, authenticated;

revoke all on function public.award_achievements()                                     from public, anon;
grant execute on function public.award_achievements()                                  to authenticated;

revoke all on function public.get_activity_feed(text, integer)                         from public, anon;
grant execute on function public.get_activity_feed(text, integer)                      to authenticated;
revoke all on function public.suggest_profiles()                                       from public, anon;
grant execute on function public.suggest_profiles()                                    to authenticated;

-- ── Backfill ───────────────────────────────────────────────────────────────
-- Every PB again, under the new rule (misfire PBs drop or fall back).
do $$
declare
  r record;
begin
  for r in select distinct user_id, puzzle_type from public.solves where deleted_at is null loop
    perform public.recompute_all_pbs(r.user_id, r.puzzle_type);
  end loop;
end;
$$;

-- Achievements, once: re-date what still qualifies, drop what doesn't, add
-- what was never worked out. Everything here counts as already shown, so
-- nobody gets a pile of toasts for old badges.
with dated as (
  select ua.user_id, ua.achievement_id,
         public.achievement_earned_at(ua.user_id, a.condition_type, a.condition_value) as at
  from public.user_achievements ua
  join public.achievements a on a.id = ua.achievement_id
),
gone as (
  delete from public.user_achievements ua
  using dated d
  where ua.user_id = d.user_id and ua.achievement_id = d.achievement_id and d.at is null
  returning ua.user_id
)
update public.user_achievements ua
set unlocked_at = d.at
from dated d
where ua.user_id = d.user_id and ua.achievement_id = d.achievement_id and d.at is not null;

do $$
declare
  r record;
begin
  for r in
    select distinct user_id from public.solves where deleted_at is null
    union
    select distinct user_id from public.user_algorithm_bookmarks where learned
  loop
    perform public.award_achievements_for(r.user_id);
  end loop;
end;
$$;

update public.user_achievements set notified_at = coalesce(notified_at, now());
