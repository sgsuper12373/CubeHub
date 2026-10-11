-- Public profile stats (docs/profile.md, Step 1).
--
-- The profile page counted rows in `solves` to show "total solves". RLS on
-- `solves` is owner-only (`solves_all`), so every visitor but the owner saw 0.
-- Opening `solves` up would expose every scramble and timestamp; instead this
-- SECURITY DEFINER function hands out aggregates only:
--
--   { "total_solves": 1243,
--     "by_event":     { "333": 1203, "pyra": 40 },
--     "first_solve_on": "2026-07-18",
--     "last_solve_on":  "2026-10-11" }
--
-- Dates, never times, so a profile can't be used to see when someone is
-- online. Days are counted in India time (Asia/Kolkata) until profiles carry
-- a timezone. Step 2 adds the privacy check (`profiles.is_public`) inside this
-- function; Step 3 extends it with PB progression and the activity heatmap.
--
-- ⚠️ Apply via the Supabase dashboard SQL editor, not the read-only MCP.

create or replace function public.get_profile_stats(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path to ''
as $$
  select jsonb_build_object(
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
  )
  from public.solves s
  where s.user_id = p_user
    and s.deleted_at is null;
$$;

-- Profiles are public pages: signed-out visitors need this as well.
revoke all on function public.get_profile_stats(uuid) from public;
grant execute on function public.get_profile_stats(uuid) to anon, authenticated;
