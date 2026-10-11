-- Remove the 14 hand-made achievement rows from 2026-06-26 (founder decision,
-- 2026-10-12). They predate the migrations and the award function:
--   * 7 duplicate the catalogue seeded in 20261015000000 under older slugs
--     (first_solve, hundred_solves, sub_60 … sub_10);
--   * 7 are for features that don't exist yet (Compete: first_match,
--     elo_1200/1500/2000; clubs: joined_club; tutorials: first_tutorial,
--     cfop_complete). They'll be designed again with those features.
-- Their condition formats are ones award_achievements() doesn't read, so
-- nobody could have earned them; the `not exists` keeps any row that somehow
-- has an unlock anyway (deleting it would cascade the unlock away).
--
-- ⚠️ Apply via the Supabase dashboard SQL editor, not the read-only MCP.

delete from public.achievements a
where a.slug in (
        'first_solve', 'hundred_solves', 'sub_60', 'sub_30', 'sub_20', 'sub_15', 'sub_10',
        'first_match', 'elo_1200', 'elo_1500', 'elo_2000', 'joined_club',
        'first_tutorial', 'cfop_complete'
      )
  and not exists (
        select 1 from public.user_achievements ua where ua.achievement_id = a.id
      );
