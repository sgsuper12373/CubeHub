-- 20261005000100_222_ortega.sql
--
-- Rebuilds the existing 2x2 Ortega subset: 12 cases in two categories,
--   OLL  1-7   orient the top face (Sune, Anti-Sune, Pi, H, L, U, T)
--   PBL  8-12  permute both layers (Adj/Adj, Diag/Diag, Adj/Diag, and the two
--              one-layer cases, which the seed was missing)
--
-- The seeded Ortega data had these defects, all repaired here:
--   * cube_state was the algorithm itself rather than its inverse, so most case
--     pictures showed the wrong case (Sune showed Anti-Sune and vice versa, L
--     showed T, T showed L, H showed an already-oriented cube). Replaced with the
--     inverse of each case's main algorithm, only where the seeded value is
--     still there.
--   * Case 6 "U / Bowtie" held a Pi algorithm, so the real U case was missing.
--     That algorithm moves to case 3 (Pi) and case 6 gets U algorithms.
--   * Case 8 "Adjacent / Adjacent" held an Adjacent/Diagonal algorithm, and case
--     10 "Adjacent / Diagonal" held a T perm (adjacent swap on one layer only).
--     Both move to the case they actually solve (10 and the new 11).
--   * Nicknames were swapped: L is the Bowtie and U is Headlights. Names and
--     descriptions are corrected.
-- Moved algorithms keep their ids, so any drill history moves with them.
--
-- 47 algorithms, up to 5 per case. Source: Alg-Trainer (tao-yu/Alg-Trainer) Ortega sets, plus the valid algorithms already in your seed.
-- Every algorithm was machine-checked with cubing.js: it solves its own case
-- (up to U/D adjustments, and an x2 flip for PBL) and no other case in this subset.
--
-- Safe to run on a database that already has some of these rows, and safe to
-- run twice: cases are upserted on (puzzle_type, subset, case_number), existing
-- algorithms are matched on normalised moves and updated in place (their ids,
-- drill history and bookmarks survive), and only missing algorithms are
-- inserted. Algorithms outside the list (e.g. user submissions) are left alone
-- apart from losing is_main.
--
-- Apply via the Supabase Dashboard SQL editor (MCP is read-only).
-- After applying with the CLI: supabase migration repair --status applied 20261005000100

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.norm_alg(m text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(replace(btrim(m), '2''', '2'), '\s+', ' ', 'g')
$$;

-- ── 1. Subset (what the Learn page lists) ──────────────────────────────────
INSERT INTO public.algorithm_subsets (puzzle_type, slug, name, description, order_index, is_published)
VALUES ('222', 'ortega', 'Ortega', 'Solve one face, orient the opposite face (OLL), then permute both layers (PBL). 12 cases.', 1, true)
ON CONFLICT (puzzle_type, slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      order_index = EXCLUDED.order_index;   -- access_tier is never overwritten

-- ── 2. Cases ───────────────────────────────────────────────────────────────
CREATE TEMP TABLE _ortega_case_src (
  case_number integer NOT NULL,
  name        text    NOT NULL,
  description text    NOT NULL,
  cube_state  text    NOT NULL,   -- inverse of the main algorithm
  seed_state  text                -- known-bad seeded value to replace, if any
) ON COMMIT DROP;

INSERT INTO _ortega_case_src VALUES
  ( 1, 'Sune', 'OLL · one corner oriented; mirror of Anti-Sune', 'R U2 R'' U'' R U'' R''', 'R U R'' U R U2 R'''),
  ( 2, 'Anti-Sune', 'OLL · one corner oriented; mirror of Sune', 'R U R'' U R U2 R''', 'R U2 R'' U'' R U'' R'''),
  ( 3, 'Pi / Bruno', 'OLL · no corners oriented; one pair of headlights', 'F U R U'' R'' U R U'' R'' F''', NULL),
  ( 4, 'H / Double Headlights', 'OLL · no corners oriented; headlights on two opposite sides', 'R2 U2 R U2 R2', 'F R U R'' U'' F2 L'' U'' L U F'),
  ( 5, 'L / Bowtie', 'OLL · two diagonal corners oriented', 'F R U'' R'' U R U R'' F''', 'F R U'' R'' U'' R U R'' F'''),
  ( 6, 'U / Headlights', 'OLL · two adjacent corners oriented; the other two form headlights', 'F U R U'' R'' F''', 'R U2 R2 U'' R2 U'' R2 U2 R'),
  ( 7, 'T / Chameleon', 'OLL · two adjacent corners oriented; the other two point sideways', 'F R'' F'' R U R U'' R''', 'R U R'' U'' R'' F R F'''),
  ( 8, 'Adjacent / Adjacent', 'PBL · adjacent swap on both layers', 'R2 U R2 U2 B2 U R2', 'R U'' R F2 R'' U R'''),
  ( 9, 'Diagonal / Diagonal', 'PBL · diagonal swap on both layers', 'R2 F2 R2', NULL),
  (10, 'Adjacent / Diagonal', 'PBL · adjacent swap on one layer, diagonal on the other', 'R U'' R F2 R'' U R''', 'R U R'' U'' R'' F R2 U'' R'' U'' R U R'' F'''),
  (11, 'Adjacent / Solved', 'PBL · adjacent swap on one layer only (do x2 first if it''s on the bottom)', 'F R U'' R'' U R U R2 F'' R U R U'' R''', NULL),
  (12, 'Diagonal / Solved', 'PBL · diagonal swap on one layer only (do x2 first if it''s on the bottom)', 'F R'' F'' R U R U'' R'' F R U'' R'' U R U R'' F''', NULL);

INSERT INTO public.algorithm_cases (puzzle_type, subset, case_number, name, description, cube_state)
SELECT '222', 'ortega', case_number, name, description, cube_state FROM _ortega_case_src
ON CONFLICT (puzzle_type, subset, case_number) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description;

-- Replace a cube_state only if it still holds the broken seeded value.
UPDATE public.algorithm_cases c
SET cube_state = s.cube_state
FROM _ortega_case_src s
WHERE c.puzzle_type = '222' AND c.subset = 'ortega' AND c.case_number = s.case_number
  AND s.seed_state IS NOT NULL AND c.cube_state = s.seed_state;

CREATE TEMP TABLE _ortega_case ON COMMIT DROP AS
SELECT id, case_number FROM public.algorithm_cases
WHERE puzzle_type = '222' AND subset = 'ortega';

-- ── 3. Target algorithms ───────────────────────────────────────────────────
CREATE TEMP TABLE _ortega_target (
  case_number integer NOT NULL,
  sort_rank   integer NOT NULL,   -- 1 = main
  moves       text    NOT NULL,
  label       text    NOT NULL
) ON COMMIT DROP;

INSERT INTO _ortega_target (case_number, sort_rank, moves, label) VALUES
  ( 1, 1, 'R U R'' U R U2 R''', 'Main'),
  ( 1, 2, 'U'' R'' U2 R U R'' U R', 'RU'),
  ( 1, 3, 'U L'' U2 L U L'' U L', 'Left-hand (UL)'),
  ( 1, 4, 'U2 L U L'' U L U2 L''', 'Left-hand (UL)'),
  ( 2, 1, 'R U2 R'' U'' R U'' R''', 'Main'),
  ( 2, 2, 'R'' U'' R U'' R'' U2 R', 'RU'),
  ( 2, 3, 'U2 L'' U'' L U'' L'' U2 L', 'Left-hand (UL)'),
  ( 2, 4, 'U'' L U2 L'' U'' L U'' L''', 'Left-hand (UL)'),
  ( 3, 1, 'F R U R'' U'' R U R'' U'' F''', 'Main'),
  ( 3, 2, 'U'' R'' F R2 U'' R2 F R', 'RUF'),
  ( 3, 3, 'U2 F U R U'' R'' U R U'' R'' F''', 'RUF'),
  ( 3, 4, 'R U2 R2 U'' R2 U'' R2 U2 R', 'RU'),
  ( 4, 1, 'R2 U2 R'' U2 R2', 'Main'),
  ( 4, 2, 'F R U R'' U'' R U R'' U'' R U R'' U'' F''', 'RUF'),
  ( 4, 3, 'R U2 R'' U'' R U R'' U'' R U'' R''', 'RU'),
  ( 4, 4, 'R2 U2 R U2 R2', 'RU'),
  ( 5, 1, 'F R U'' R'' U'' R U R'' F''', 'Main'),
  ( 5, 2, 'U F'' R U R'' U'' R'' F R', 'RUF'),
  ( 5, 3, 'F R'' F'' R U R U'' R''', 'RUF'),
  ( 5, 4, 'U2 R U2 R'' U'' R U R'' U'' R U R'' U'' R U'' R''', 'RU'),
  ( 6, 1, 'F R U R'' U'' F''', 'Main'),
  ( 6, 2, 'U2 F U R U'' R'' F''', 'RUF'),
  ( 6, 3, 'U2 F'' L'' U'' L U F', 'Left-hand (UFL)'),
  ( 7, 1, 'R U R'' U'' R'' F R F''', 'Main'),
  ( 7, 2, 'U2 L'' U'' L U L F'' L'' F', 'Left-hand (UFL)'),
  ( 7, 3, 'U2 R'' F'' R U R U'' R'' F', 'RUF'),
  ( 7, 4, 'R U R'' F2 R U R'' U'' F', 'RUF'),
  ( 8, 1, 'R2 U'' B2 U2 R2 U'' R2', 'Main'),
  ( 8, 2, 'y2 R2 U'' R2 U2 y R2 U'' R2', 'RU'),
  ( 8, 3, 'y2 R2 U'' R2 U2 F2 U'' R2', 'RUF'),
  ( 8, 4, 'R2 U R2 U2 y'' R2 U R2', 'RU'),
  ( 9, 1, 'R2 F2 R2', 'Main'),
  ( 9, 2, 'R2 B2 R2', 'RB'),
  ( 9, 3, 'L2 F2 L2', 'Left-hand (FL)'),
  ( 9, 4, 'L2 B2 L2', 'Left-hand (LB)'),
  (10, 1, 'R U'' R F2 R'' U R''', 'Main'),
  (10, 2, 'y2 R'' U R'' F2 R F'' R', 'RUF'),
  (10, 3, 'z2 L D'' L F2 L'' D L''', 'Left-hand (FLD)'),
  (10, 4, 'y2 R'' U L'' U2 R U'' L', 'RUL'),
  (11, 1, 'R U R'' U'' R'' F R2 U'' R'' U'' R U R'' F''', 'Main'),
  (11, 2, 'y R U R'' F'' R U R'' U'' R'' F R2 U'' R''', 'RUF'),
  (11, 3, 'y R U2 R'' U'' R U2 L'' U R'' U'' L', 'RUL'),
  (11, 4, 'y2 R'' F R'' F2 R U'' R'' F2 R2', 'RUF'),
  (12, 1, 'F R U'' R'' U'' R U R'' F'' R U R'' U'' R'' F R F''', 'Main'),
  (12, 2, 'R U'' R'' U'' F2 U'' R U R'' D R2', 'RUFD'),
  (12, 3, 'R'' U L'' U2 R U'' x'' U L'' U2 R U'' L U', 'RUL'),
  (12, 4, 'R'' U R'' F2 R F'' U R'' F2 R F'' R', 'RUF');

-- ── 4. Clear mains (uq_one_main_alg_per_case allows only one per case) ─────
UPDATE public.algorithms a SET is_main = false
FROM _ortega_case c WHERE a.case_id = c.id AND a.is_main;

-- ── 5. Move algorithms filed under the wrong case ──────────────────────────
UPDATE public.algorithms a
SET case_id = tc.id
FROM _ortega_target t
JOIN _ortega_case tc ON tc.case_number = t.case_number
WHERE a.case_id IN (SELECT id FROM _ortega_case)
  AND a.case_id <> tc.id
  AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves);

-- ── 6. Merge duplicates within a case ──────────────────────────────────────
CREATE TEMP TABLE _ortega_dup ON COMMIT DROP AS
SELECT id, keeper FROM (
  SELECT a.id,
         first_value(a.id) OVER (
           PARTITION BY a.case_id, pg_temp.norm_alg(a.moves)
           ORDER BY a.created_at, a.id
         ) AS keeper
  FROM public.algorithms a
  JOIN _ortega_case c ON c.id = a.case_id
) s
WHERE id <> keeper;

UPDATE public.drill_attempts d SET algorithm_id = x.keeper
FROM _ortega_dup x WHERE d.algorithm_id = x.id;

INSERT INTO public.user_algorithm_bookmarks (user_id, algorithm_id, learned, created_at)
SELECT b.user_id, x.keeper, bool_or(b.learned), min(b.created_at)
FROM public.user_algorithm_bookmarks b
JOIN _ortega_dup x ON x.id = b.algorithm_id
GROUP BY b.user_id, x.keeper
ON CONFLICT (user_id, algorithm_id) DO UPDATE
  SET learned = public.user_algorithm_bookmarks.learned OR EXCLUDED.learned;

DELETE FROM public.algorithms WHERE id IN (SELECT id FROM _ortega_dup);

-- ── 7. Update existing / insert missing / set mains ────────────────────────
UPDATE public.algorithms a
SET label = t.label, is_approved = true
FROM _ortega_target t
JOIN _ortega_case c ON c.case_number = t.case_number
WHERE a.case_id = c.id
  AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves);

INSERT INTO public.algorithms (case_id, moves, label, is_main, is_approved)
SELECT c.id, t.moves, t.label, false, true
FROM _ortega_target t
JOIN _ortega_case c ON c.case_number = t.case_number
WHERE NOT EXISTS (
  SELECT 1 FROM public.algorithms a
  WHERE a.case_id = c.id
    AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves)
)
ORDER BY t.case_number, t.sort_rank;

UPDATE public.algorithms a
SET is_main = true
FROM _ortega_target t
JOIN _ortega_case c ON c.case_number = t.case_number
WHERE t.sort_rank = 1
  AND a.case_id = c.id
  AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves);

-- ── 8. Assert the end state, or roll everything back ───────────────────────
DO $$
DECLARE
  n_cases  integer;
  bad_main integer;
  missing  integer;
BEGIN
  SELECT count(*) INTO n_cases FROM _ortega_case c
  JOIN _ortega_case_src s ON s.case_number = c.case_number;

  SELECT count(*) INTO bad_main FROM (
    SELECT c.id FROM _ortega_case c
    JOIN _ortega_case_src s ON s.case_number = c.case_number
    LEFT JOIN public.algorithms a ON a.case_id = c.id AND a.is_main
    GROUP BY c.id HAVING count(a.id) <> 1
  ) x;

  SELECT count(*) INTO missing FROM _ortega_target t
  JOIN _ortega_case c ON c.case_number = t.case_number
  WHERE NOT EXISTS (
    SELECT 1 FROM public.algorithms a
    WHERE a.case_id = c.id
      AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves)
  );

  IF n_cases <> 12 OR bad_main <> 0 OR missing <> 0 THEN
    RAISE EXCEPTION '222/ortega check failed: % of 12 cases, % case(s) without exactly one main, % alg(s) missing',
      n_cases, bad_main, missing;
  END IF;
END $$;

COMMIT;

-- ── Verify afterwards (read-only) ──────────────────────────────────────────
-- SELECT c.case_number, c.name, c.description, a.is_main, a.label, a.moves
-- FROM public.algorithm_cases c
-- JOIN public.algorithms a ON a.case_id = c.id
-- WHERE c.puzzle_type = '222' AND c.subset = 'ortega'
-- ORDER BY c.case_number, a.is_main DESC, a.move_count;
