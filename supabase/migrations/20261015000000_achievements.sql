-- Achievements (docs/profile.md, Step 4).
--
-- The baseline created `achievements` (the catalogue) and `user_achievements`
-- (who unlocked what) but nothing ever filled them. This migration:
--   1. hides a private profile's badges (`user_achievements` read policy now
--      goes through profile_visible, like every other profile section);
--   2. seeds the catalogue (idempotent: re-running refreshes the text);
--   3. adds award_achievements(): the signed-in user's facts are computed in
--      one pass, every unmet badge is checked, new ones are inserted and
--      returned for the toast. The app calls it after a signed-in solve is
--      saved, after marking an algorithm learned, and on the owner's profile.
--
-- Founder decision (2026-10-12): typed-in (`source = 'manual'`) times don't
-- count toward speed badges; they still count for milestones and streaks.
-- Badges are permanent: deleting the solve behind one doesn't revoke it.
--
-- ⚠️ Apply via the Supabase dashboard SQL editor, not the read-only MCP.

-- ── 1. Private profiles hide their badges ──────────────────────────────────
drop policy if exists user_ach_read on public.user_achievements;
create policy user_ach_read on public.user_achievements
  for select using (public.profile_visible(user_id));

-- ── 2. The catalogue ───────────────────────────────────────────────────────
insert into public.achievements (slug, title, description, category, condition_type, condition_value, is_hidden) values
  ('first-solve',     'First Turn',      'Time your first solve.',                          'timer',    'solve_count',     '{"n": 1}', false),
  ('solves-100',      'Century',         'Time 100 solves.',                                'timer',    'solve_count',     '{"n": 100}', false),
  ('solves-1000',     'Grinder',         'Time 1,000 solves.',                              'timer',    'solve_count',     '{"n": 1000}', false),
  ('solves-10000',    'Legend',          'Time 10,000 solves.',                             'timer',    'solve_count',     '{"n": 10000}', false),
  ('333-sub-60',      'Sub-60',          'A 3x3 single under a minute.',                    'timer',    'single_under',    '{"puzzle": "333", "ms": 60000}', false),
  ('333-sub-30',      'Sub-30',          'A 3x3 single under 30 seconds.',                  'timer',    'single_under',    '{"puzzle": "333", "ms": 30000}', false),
  ('333-sub-20',      'Sub-20',          'A 3x3 single under 20 seconds.',                  'timer',    'single_under',    '{"puzzle": "333", "ms": 20000}', false),
  ('333-sub-15',      'Sub-15',          'A 3x3 single under 15 seconds.',                  'timer',    'single_under',    '{"puzzle": "333", "ms": 15000}', false),
  ('333-sub-10',      'Sub-10',          'A 3x3 single under 10 seconds.',                  'timer',    'single_under',    '{"puzzle": "333", "ms": 10000}', false),
  ('333-ao5-sub-20',  'Consistent',      'A 3x3 Ao5 under 20 seconds.',                     'timer',    'average_under',   '{"puzzle": "333", "n": 5, "ms": 20000}', false),
  ('333-ao12-sub-15', 'Machine',         'A 3x3 Ao12 under 15 seconds.',                    'timer',    'average_under',   '{"puzzle": "333", "n": 12, "ms": 15000}', false),
  ('events-4',        'Explorer',        'Solve 4 different events.',                       'timer',    'events_count',    '{"n": 4}', false),
  ('events-8',        'All-rounder',     'Solve all 8 timer events.',                       'timer',    'events_count',    '{"n": 8}', false),
  ('streak-7',        'On a Roll',       'Practise 7 days in a row.',                       'timer',    'streak',          '{"days": 7}', false),
  ('streak-30',       'Unstoppable',     'Practise 30 days in a row.',                      'timer',    'streak',          '{"days": 30}', false),
  ('pll-done',        'PLL Master',      'Mark every 3x3 PLL case as learned.',             'tutorial', 'set_learned',     '{"puzzle": "333", "slug": "pll"}', false),
  ('oll-done',        'OLL Master',      'Mark every 3x3 OLL case as learned.',             'tutorial', 'set_learned',     '{"puzzle": "333", "slug": "oll"}', false),
  ('222-set-done',    '2x2 Specialist',  'Learn every case of any 2x2 algorithm set.',      'tutorial', 'any_set_learned', '{"puzzle": "222"}', false),
  ('night-owl',       'Night Owl',       'Time a solve between 2 and 4 am.',                'timer',    'night_solve',     '{}', true),
  ('marathon',        'Marathon',        'Time 100 solves in a single day.',                'timer',    'solves_in_day',   '{"n": 100}', true)
on conflict (slug) do update
  set title           = excluded.title,
      description     = excluded.description,
      category        = excluded.category,
      condition_type  = excluded.condition_type,
      condition_value = excluded.condition_value,
      is_hidden       = excluded.is_hidden;

-- ── 3a. Best timer-only average ────────────────────────────────────────────
-- best_average_of_n without typed-in solves: windows over the user's timer
-- solves within one session, one DNF trimmed, two make it a DNF. n is
-- interpolated as a literal (window frames need a constant) and only ever
-- comes from the catalogue above.
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

-- ── 3b. Learned cases per set ──────────────────────────────────────────────
-- Same rule as the Learn pages and get_profile_stats: a case is learned when
-- any of its algorithms is.
create or replace function public.learned_sets(p_user uuid)
returns table (puzzle public.puzzle_type, slug text, learned bigint, total bigint)
language sql
stable
security definer
set search_path to ''
as $$
  select sub.puzzle_type, sub.slug,
         count(c.id) filter (where exists (
           select 1
           from public.algorithms a
           join public.user_algorithm_bookmarks b on b.algorithm_id = a.id
           where a.case_id = c.id and b.user_id = p_user and b.learned
         )),
         count(c.id)
  from public.algorithm_subsets sub
  join public.algorithm_cases c
    on c.puzzle_type = sub.puzzle_type and c.subset = sub.slug
  where sub.is_published
  group by sub.puzzle_type, sub.slug;
$$;

-- ── 3c. Award ──────────────────────────────────────────────────────────────
create or replace function public.award_achievements()
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_user     uuid := (select auth.uid());
  f_count    integer;
  f_events   integer;
  f_streak   integer;
  f_day_max  integer;
  f_night    boolean;
  v_new      jsonb;
begin
  if v_user is null then
    return '[]'::jsonb;
  end if;

  -- Facts every condition reads, computed once.
  select count(*), count(distinct s.puzzle_type)
    into f_count, f_events
  from public.solves s
  where s.user_id = v_user and s.deleted_at is null;

  with days as (
    select (s.created_at at time zone 'Asia/Kolkata')::date as d, count(*) as n
    from public.solves s
    where s.user_id = v_user and s.deleted_at is null
    group by 1
  ),
  runs as (
    select count(*) as len
    from (select d, d - (row_number() over (order by d))::integer as grp from days) i
    group by grp
  )
  select coalesce((select max(len) from runs), 0),
         coalesce((select max(n) from days), 0)
    into f_streak, f_day_max;

  select exists (
    select 1 from public.solves s
    where s.user_id = v_user
      and s.deleted_at is null
      and s.source <> 'manual'
      and extract(hour from s.created_at at time zone 'Asia/Kolkata') in (2, 3)
  ) into f_night;

  with unearned as (
    select a.id, a.slug, a.title, a.description, a.condition_type, a.condition_value as c
    from public.achievements a
    where not exists (
      select 1 from public.user_achievements ua
      where ua.user_id = v_user and ua.achievement_id = a.id
    )
  ),
  met as (
    select u.*
    from unearned u
    where case u.condition_type
      when 'solve_count'   then f_count  >= (u.c->>'n')::integer
      when 'events_count'  then f_events >= (u.c->>'n')::integer
      when 'streak'        then f_streak >= (u.c->>'days')::integer
      when 'solves_in_day' then f_day_max >= (u.c->>'n')::integer
      when 'night_solve'   then f_night
      when 'single_under'  then coalesce((
        select min(s.effective_time_ms) < (u.c->>'ms')::integer
        from public.solves s
        where s.user_id = v_user
          and s.puzzle_type = (u.c->>'puzzle')::public.puzzle_type
          and s.deleted_at is null
          and s.source <> 'manual'), false)
      when 'average_under' then coalesce(
        public.best_timer_average(v_user, (u.c->>'puzzle')::public.puzzle_type, (u.c->>'n')::integer)
          < (u.c->>'ms')::integer, false)
      when 'set_learned'   then exists (
        select 1 from public.learned_sets(v_user) l
        where l.puzzle = (u.c->>'puzzle')::public.puzzle_type
          and l.slug = u.c->>'slug'
          and l.total > 0 and l.learned = l.total)
      when 'any_set_learned' then exists (
        select 1 from public.learned_sets(v_user) l
        where l.puzzle = (u.c->>'puzzle')::public.puzzle_type
          and l.total > 0 and l.learned = l.total)
      else false
    end
  ),
  inserted as (
    insert into public.user_achievements (user_id, achievement_id)
    select v_user, m.id from met m
    on conflict do nothing
    returning achievement_id
  )
  select coalesce(
           jsonb_agg(jsonb_build_object('slug', m.slug, 'title', m.title, 'description', m.description)
                     order by m.slug),
           '[]'::jsonb)
    into v_new
  from met m
  where m.id in (select achievement_id from inserted);

  return v_new;
end;
$$;

-- ── 4. Grants ──────────────────────────────────────────────────────────────
revoke all on function public.best_timer_average(uuid, public.puzzle_type, integer) from public, anon, authenticated;
revoke all on function public.learned_sets(uuid)                                     from public, anon, authenticated;
revoke all on function public.award_achievements()                                  from public, anon;
grant execute on function public.award_achievements() to authenticated;
