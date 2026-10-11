-- Profile setup, method and level (docs/profile.md, Step 5).
--
-- 1. `profiles.main_method` (Beginner/CFOP/Roux/ZZ/Petrus/Other) and
--    `profiles.learning_now` ("full OLL"), both optional.
-- 2. `user_setups`: one main cube per event. Free text for now; `product_id`
--    is ready for when the Shop has products to link.
-- 3. `get_profile_stats` gains `levels`: the best TIMER-ONLY Ao12 per event,
--    which the app turns into a "Sub-20" style level. Like the speed badges,
--    typed-in times don't count, so a level can't be typed in. The rest of
--    the function is unchanged from 20261014000000_profile_progress.sql.
--
-- ⚠️ Apply via the Supabase dashboard SQL editor, not the read-only MCP.

-- ── 1. Method ──────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists main_method text,
  add column if not exists learning_now text;
alter table public.profiles drop constraint if exists profiles_main_method_check;
alter table public.profiles add constraint profiles_main_method_check
  check (main_method is null or main_method in ('beginner', 'cfop', 'roux', 'zz', 'petrus', 'other'));
alter table public.profiles drop constraint if exists profiles_learning_now_length;
alter table public.profiles add constraint profiles_learning_now_length
  check (learning_now is null or char_length(learning_now) <= 80);

-- ── 2. Main cube per event ─────────────────────────────────────────────────
create table if not exists public.user_setups (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  puzzle_type public.puzzle_type not null,
  cube_name   text not null check (char_length(cube_name) between 1 and 80),
  product_id  uuid references public.products(id) on delete set null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, puzzle_type)
);
create index if not exists idx_user_setups_product on public.user_setups (product_id) where product_id is not null;

alter table public.user_setups enable row level security;

drop policy if exists user_setups_read on public.user_setups;
create policy user_setups_read on public.user_setups
  for select using (public.profile_visible(user_id));

drop policy if exists user_setups_insert on public.user_setups;
create policy user_setups_insert on public.user_setups
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists user_setups_update on public.user_setups;
create policy user_setups_update on public.user_setups
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists user_setups_delete on public.user_setups;
create policy user_setups_delete on public.user_setups
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ── 3. Stats with levels ───────────────────────────────────────────────────
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
  v_levels   jsonb;
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

  -- Level: the best timer-only Ao12 per event the cuber has solves on
  -- (typed-in times don't count, as for the speed badges).
  select coalesce(jsonb_object_agg(e.puzzle_type, e.ms) filter (where e.ms is not null), '{}'::jsonb)
    into v_levels
  from (
    select ev.puzzle_type, public.best_timer_average(p_user, ev.puzzle_type, 12) as ms
    from (select distinct s.puzzle_type from public.solves s
          where s.user_id = p_user and s.deleted_at is null) ev
  ) e;

  return v_base || jsonb_build_object('activity', v_activity, 'learning', v_learning, 'levels', v_levels);
end;
$$;

revoke all on function public.get_profile_stats(uuid) from public;
grant execute on function public.get_profile_stats(uuid) to anon, authenticated;
