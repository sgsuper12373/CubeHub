-- Mis-stops: flagged, left out by default, always the cuber's call (2026-10-19).
--
-- Apply AFTER 20261019000000_solve_sanity.sql.
--
-- The fixed misfire floor (a 3x3 under 3.00 never counted) had two problems:
-- a 3.01 on a ~25 s average still counted and earned Sub-10 and Sub-15, and a
-- real fast solve under the floor could never count. Now:
--
-- 1. Which solves count: every solve that isn't excluded. `solve_counts()`
--    keeps its signature, so every PB, average, timeline, level, achievement,
--    feed and suggestion function that calls it drops the time floor at once.
--    Nothing is left out by a time rule the cuber can't override.
-- 2. Suspected mis-stops are flagged when a solve is saved, by the app
--    (src/lib/timer/misfire.ts, `suspectedMisstop`), on either rule:
--      * implausible: raw time under a per-event limit well below the world
--        record (`misstop_limit_ms`), from the first solve;
--      * relative: raw time under 0.5 × the median raw time of the cuber's
--        last 50 counted solves of that puzzle, across sessions (DNFs and
--        excluded solves left out), once there are at least 12 of them.
--    A flagged solve is saved with excluded = true and
--    excluded_reason = 'auto_misstop'.
-- 3. The cuber can mark any flagged solve as real: excluded = false and
--    misstop_confirmed = true, so nothing flags it again. Leaving a solve out
--    by hand is excluded_reason = 'user'.
-- 4. Changing `excluded` recomputes PBs (already, recompute_pb_on_solve_update)
--    and now achievements too, in both directions: a badge whose only
--    qualifying solve is left out is removed, and badges are re-dated.
-- 5. Backfill (`backfill_misstops()`, re-runnable): applies both rules to
--    existing solves in order, then recomputes every PB and badge once.
--
-- ⚠️ Apply with `supabase db push`. Then run supabase/tests/misstop_test.sql
-- and expect every row to be PASS. supabase/tests/solve_sanity_test.sql
-- describes the old floor; run it before this migration, not after.

-- ── 1. Columns ─────────────────────────────────────────────────────────────
alter table public.solves
  add column if not exists excluded_reason   text,
  add column if not exists misstop_confirmed boolean not null default false;

alter table public.solves drop constraint if exists solves_excluded_reason_check;
alter table public.solves
  add constraint solves_excluded_reason_check
  check (excluded_reason in ('user', 'auto_misstop'));

-- The reason follows `excluded`: none when it counts, 'user' when a client
-- leaves a solve out without saying why (older app versions, the API).
create or replace function public.normalize_solve_exclusion()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if not new.excluded then
    new.excluded_reason := null;
  elsif new.excluded_reason is null then
    new.excluded_reason := 'user';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_solves_normalize_exclusion on public.solves;
create trigger trg_solves_normalize_exclusion
  before insert or update on public.solves
  for each row execute function public.normalize_solve_exclusion();

-- Everything left out so far was left out by hand.
update public.solves set excluded_reason = 'user'
where excluded and excluded_reason is null;

-- ── 2. Which solves count ──────────────────────────────────────────────────
-- p_puzzle and p_time_ms are kept so every caller stays as it is.
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
  select not p_excluded;
$$;

-- The old floor. Nothing reads it any more.
drop function if exists public.misfire_limit_ms(public.puzzle_type);

-- The implausible rule: raw time (before any +2) well below the world record.
-- Mirrored in src/lib/timer/misfire.ts (MISSTOP_LIMIT_MS); events the timer
-- doesn't offer yet get a value in the same spirit.
create or replace function public.misstop_limit_ms(p_puzzle public.puzzle_type)
returns integer
language sql
immutable
set search_path to ''
as $$
  select case p_puzzle
    when '333'   then 2000
    when '222'   then 300
    when '333oh' then 4000
    when '444'   then 12000
    when '555'   then 25000
    when '666'   then 45000
    when '777'   then 75000
    when 'pyra'  then 500
    when 'skewb' then 500
    when 'mega'  then 18000
    when 'sq1'   then 2500
    when 'clock' then 1200
    else 500
  end;
$$;

-- ── 3. Achievements follow `excluded` both ways ────────────────────────────
-- Re-derive one cuber's badges: drop the ones no longer met, re-date the
-- rest, add any newly met (those wait for a toast, notified_at null).
create or replace function public.recompute_achievements_for(p_user uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
begin
  with dated as (
    select ua.achievement_id,
           public.achievement_earned_at(p_user, a.condition_type, a.condition_value) as at
    from public.user_achievements ua
    join public.achievements a on a.id = ua.achievement_id
    where ua.user_id = p_user
  ),
  gone as (
    delete from public.user_achievements ua
    using dated d
    where ua.user_id = p_user and ua.achievement_id = d.achievement_id and d.at is null
    returning ua.achievement_id
  )
  update public.user_achievements ua
  set unlocked_at = d.at
  from dated d
  where ua.user_id = p_user and ua.achievement_id = d.achievement_id
    and d.at is not null and ua.unlocked_at is distinct from d.at;

  perform public.award_achievements_for(p_user);
end;
$$;

create or replace function public.recompute_achievements_on_exclusion()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  r record;
begin
  for r in
    select distinct n.user_id
    from new_solves n
    join old_solves o on o.id = n.id
    where n.excluded is distinct from o.excluded
  loop
    perform public.recompute_achievements_for(r.user_id);
  end loop;
  return null;
end;
$$;

drop trigger if exists trg_solves_achievements_on_exclusion on public.solves;
create trigger trg_solves_achievements_on_exclusion
  after update on public.solves
  referencing old table as old_solves new table as new_solves
  for each statement execute function public.recompute_achievements_on_exclusion();

-- ── 4. Backfill ────────────────────────────────────────────────────────────
-- For each cuber and puzzle, walk the live solves oldest first and apply both
-- rules using only the solves before each one. Already excluded and
-- confirmed solves are never flagged; flagged ones are left out of later
-- windows, as the app does. Re-runnable: a second run finds nothing new.
-- Returns how many solves it flagged.
create or replace function public.backfill_misstops()
returns integer
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  -- Mirrored in src/lib/timer/misfire.ts.
  c_ratio  constant numeric := 0.5;
  c_window constant integer := 50;
  c_min    constant integer := 12;
  r        record;
  s        record;
  v_recent integer[];
  v_median numeric;
  v_flags  uuid[] := '{}';
begin
  for r in
    select distinct user_id, puzzle_type from public.solves where deleted_at is null
  loop
    v_recent := '{}';
    for s in
      select id, time_ms, penalty, excluded, misstop_confirmed
      from public.solves
      where user_id = r.user_id and puzzle_type = r.puzzle_type and deleted_at is null
      order by created_at, id
    loop
      -- Not counted, so neither flagged nor part of the window.
      continue when s.excluded or s.penalty = 'dnf';

      v_median := case when cardinality(v_recent) >= c_min then
        (select percentile_cont(0.5) within group (order by t) from unnest(v_recent) t)
      end;

      if not s.misstop_confirmed
         and (s.time_ms < public.misstop_limit_ms(r.puzzle_type)
              or s.time_ms < c_ratio * v_median) then
        v_flags := v_flags || s.id;
      else
        -- Newest first, capped at the window.
        v_recent := (array[s.time_ms] || v_recent)[1:c_window];
      end if;
    end loop;
  end loop;

  if cardinality(v_flags) > 0 then
    update public.solves
    set excluded = true, excluded_reason = 'auto_misstop'
    where id = any(v_flags);
  end if;

  -- Once, for everyone: the time floor is gone, so PBs and badges can move
  -- even where nothing was flagged.
  for r in
    select distinct user_id, puzzle_type from public.solves where deleted_at is null
  loop
    perform public.recompute_all_pbs(r.user_id, r.puzzle_type);
  end loop;
  for r in
    select user_id from public.solves where deleted_at is null
    union
    select user_id from public.user_achievements
    union
    select user_id from public.user_algorithm_bookmarks where learned
  loop
    perform public.recompute_achievements_for(r.user_id);
  end loop;

  return cardinality(v_flags);
end;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────
revoke all on function public.misstop_limit_ms(public.puzzle_type)       from public;
grant execute on function public.misstop_limit_ms(public.puzzle_type)    to anon, authenticated;
revoke all on function public.normalize_solve_exclusion()                from public, anon, authenticated;
revoke all on function public.recompute_achievements_for(uuid)           from public, anon, authenticated;
revoke all on function public.recompute_achievements_on_exclusion()      from public, anon, authenticated;
revoke all on function public.backfill_misstops()                        from public, anon, authenticated;

-- ── Run the backfill ───────────────────────────────────────────────────────
select public.backfill_misstops();

-- Badges this re-derivation adds are old news: no pile of toasts.
update public.user_achievements set notified_at = coalesce(notified_at, now())
where notified_at is null;
