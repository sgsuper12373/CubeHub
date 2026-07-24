-- Heal personal-best rows that no surviving solve supports.
--
-- Fixes an incomplete backfill in 20260726000000_average_pbs.sql. That one
-- looped over `select distinct user_id, puzzle_type from solves`, which has two
-- holes:
--
--   1. it only called `recompute_average_pbs`, so legacy phantom *single* PBs —
--      the ones Phase 1's trigger work was written to eliminate, but which
--      already existed in rows written before it — were left untouched;
--   2. a user whose solves are all deleted does not appear in `solves` at all,
--      so they are absent from the loop entirely and can never be reached by a
--      backfill driven off that table.
--
-- Found on the live database: one account with zero solves still held a
-- `single` PB of 75 ms with `solve_id` NULL, dated before the Phase 1 fix.
--
-- Driving the loop off `personal_bests` instead is the correction — every row
-- that could be wrong is, by definition, in that table. `recompute_all_pbs` is
-- authoritative and deletes a PB when nothing supports it, so this is safe to
-- run repeatedly.
--
-- ⚠️ Apply via the Supabase dashboard/CLI — NOT the read-only MCP.

do $$
declare
  r record;
begin
  for r in
    select distinct user_id, puzzle_type
    from public.personal_bests
  loop
    perform public.recompute_all_pbs(r.user_id, r.puzzle_type);
  end loop;
end;
$$;
