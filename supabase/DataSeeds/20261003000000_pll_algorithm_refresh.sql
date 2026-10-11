-- 20261003000000_pll_algorithm_refresh.sql
--
-- Refreshes the 333 PLL algorithm set: up to 5 algorithms per case, the most
-- popular one marked is_main. Written to run against a database that ALREADY
-- holds the seeded PLL algorithms (20260730000000_seed_learn_content.sql):
--
--   * existing rows are matched on (case, normalised moves) and updated in
--     place, never deleted and re-inserted, so their ids — and every
--     drill_attempts / drill_state / user_algorithm_bookmarks row hanging off
--     them (all ON DELETE CASCADE) — survive;
--   * only algorithms that are not already present are inserted;
--   * safe to run twice: a second run changes nothing.
--
-- Every algorithm below was machine-checked with cubing.js: each one solves
-- its case (up to pre/post AUF) and no other PLL case.
--
-- It also repairs four defects found in the seed while checking it:
--   1. Ab main alg was "x L2 D2 L U L' D2 L U' L x'" — the leading x should be
--      x' (as written it does not solve any PLL). Fixed in place.
--   2. "y x' R2 D2 R' U' R D2 R' U R' x" was filed under Ab but is an Aa.
--      Moved to Aa (keeps its id and any drill history).
--   3. cube_state for Aa, Ab and Gd was not a PLL state at all. Replaced with
--      the inverse of the case's main algorithm — but only where the column
--      still holds the broken seed value, so admin edits are left alone.
--   4. T perm had the same algorithm seeded twice. Duplicates (same case, same
--      normalised moves) are merged: drill attempts are re-pointed at the
--      surviving row (the drill_attempts update trigger recomputes drill_state
--      for both ids), bookmarks are merged, then the duplicate is deleted.
--
-- Algorithms outside the list (e.g. user submissions) are not touched apart
-- from losing is_main.
--
-- Apply via the Supabase Dashboard SQL editor (MCP is read-only).
-- This is a data seed, not a migration: it lives in supabase/DataSeeds/ so a
-- fresh database built from migrations alone doesn't get it, and it has no
-- `migration repair` entry. Already applied live (checked 2026-10-12: all 97
-- target algorithms present, Aa/Ab mains as below).

BEGIN;

-- Whitespace- and "2'"-insensitive comparison key for move strings.
CREATE OR REPLACE FUNCTION pg_temp.norm_alg(m text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(replace(btrim(m), '2''', '2'), '\s+', ' ', 'g')
$$;

-- ── 0. Target list ─────────────────────────────────────────────────────────
CREATE TEMP TABLE _pll_target (
  case_number integer NOT NULL,
  sort_rank   integer NOT NULL,   -- 1 = main
  moves       text    NOT NULL,
  label       text    NOT NULL
) ON COMMIT DROP;

INSERT INTO _pll_target (case_number, sort_rank, moves, label) VALUES
  ( 1, 1, 'x L2 D2 L'' U'' L D2 L'' U L'' x''', 'Most popular (L-hand)'),
  ( 1, 2, 'x R'' U R'' D2 R U'' R'' D2 R2 x''', 'R-hand'),
  ( 1, 3, 'R'' F R'' B2 R F'' R'' B2 R2', 'Rotationless'),
  ( 1, 4, 'y'' x'' R'' D R'' U2 R D'' R'' U2 R2 x', 'R moves variant'),
  ( 1, 5, 'y x'' R2 D2 R'' U'' R D2 R'' U R'' x', 'x'' grip'),
  ( 2, 1, 'x R2 D2 R U R'' D2 R U'' R x''', 'Most popular (R-hand)'),
  ( 2, 2, 'x'' L2 D2 L U L'' D2 L U'' L x', 'L-hand'),
  ( 2, 3, 'R B'' R F2 R'' B R F2 R2', 'Rotationless'),
  ( 2, 4, 'x'' R U'' R D2 R'' U R D2 R2 x', 'x'' grip'),
  ( 2, 5, 'l'' R'' D2 R U R'' D2 R U'' l', 'l grip'),
  ( 3, 1, 'x'' L'' U L D'' L'' U'' L D L'' U'' L D'' L'' U L D x', 'Most popular (L-hand)'),
  ( 3, 2, 'x'' R U'' R'' D R U R'' D'' R U R'' D R U'' R'' D'' x', 'R-hand'),
  ( 3, 3, 'R2 U R'' U'' y R U R'' U'' R U R'' U'' R U R'' y'' R U'' R2', 'RU with rotation'),
  ( 3, 4, 'R2 U F'' R'' U R U'' R'' U R U'' R'' U R U'' F U'' R2', 'RUF'),
  ( 3, 5, 'R'' U L'' D2 L U'' R L'' U R'' D2 R U'' L', 'Rotationless (D2)'),
  ( 4, 1, 'R'' U'' F'' R U R'' U'' R'' F R2 U'' R'' U'' R U R'' U R', 'Most popular'),
  ( 4, 2, 'R'' U R U'' R2 F'' U'' F U R F R'' F'' R2', 'Short RUF'),
  ( 4, 3, 'R'' U'' R U'' R'' U R U R2 F'' R U R U'' R'' F U R', 'T-perm based'),
  ( 4, 4, 'M'' U2 L F'' R U2 r'' U r'' R2 U2 R2', 'M-slice'),
  ( 4, 5, 'U R2 F R F'' R'' U'' F'' U F R2 U R'' U'' R', 'Alternate'),
  ( 5, 1, 'R2 U R'' U R'' U'' R U'' R2 U'' D R'' U R D''', 'Most popular'),
  ( 5, 2, 'R2 u R'' U R'' U'' R u'' R2 F'' U F', 'Wide u'),
  ( 5, 3, 'D'' R2 U R'' U R'' U'' R U'' R2 U'' D R'' U R', 'D first'),
  ( 6, 1, 'R'' U'' R U D'' R2 U R'' U R U'' R U'' R2 D', 'Most popular'),
  ( 6, 2, 'F'' U'' F R2 u R'' U R U'' R u'' R2', 'Wide u'),
  ( 6, 3, 'R'' d'' F R2 u R'' U R U'' R u'' R2', 'Wide d/u'),
  ( 6, 4, 'D R'' U'' R U D'' R2 U R'' U R U'' R U'' R2', 'D first'),
  ( 7, 1, 'R2 U'' R U'' R U R'' U R2 U D'' R U'' R'' D', 'Most popular'),
  ( 7, 2, 'R2 u'' R U'' R U R'' u R2 f R'' f''', 'Wide u'),
  ( 7, 3, 'D R2 U'' R U'' R U R'' U R2 D'' U R U'' R''', 'D first'),
  ( 7, 4, 'U2 R2 F2 R U2 R U2 R'' F R U R'' U'' R'' F R2', 'RUF'),
  ( 8, 1, 'R U R'' U'' D R2 U'' R U'' R'' U R'' U R2 D''', 'Most popular'),
  ( 8, 2, 'R U R'' y'' R2 u'' R U'' R'' U R'' u R2', 'Wide u'),
  ( 8, 3, 'f R f'' R2 u'' R U'' R'' U R'' u R2', 'Wide f/u'),
  ( 8, 4, 'D'' R U R'' U'' D R2 U'' R U'' R'' U R'' U R2', 'D first'),
  ( 8, 5, 'U R2 F'' R U R U'' R'' F'' R U2 R'' U2 R'' F2 R2', 'RUF'),
  ( 9, 1, 'M2 U M2 U2 M2 U M2', 'Most popular'),
  ( 9, 2, 'M2 U'' M2 U2 M2 U'' M2', 'U'' variant'),
  ( 9, 3, 'R2 U2 R U2 R2 U2 R2 U2 R U2 R2', 'RU only'),
  ( 9, 4, 'R2 S2 R2 U'' R2 S2 R2', 'S-slice'),
  ( 9, 5, 'M2 U2 M2 U M2 U2 M2', 'U2 first'),
  (10, 1, 'x R2 F R F'' R U2 r'' U r U2 x''', 'Most popular'),
  (10, 2, 'R'' U L'' U2 R U'' R'' U2 R L U''', 'Rotationless RUL'),
  (10, 3, 'L'' U'' L F L'' U'' L U L F'' L2 U L', 'L-hand Jb mirror'),
  (10, 4, 'L'' R'' U2 R U R'' U2 L U'' R', 'Short RUL'),
  (10, 5, 'R U'' L'' U R'' U2 L U'' L'' U2 L', 'Alternate RUL'),
  (11, 1, 'R U R'' F'' R U R'' U'' R'' F R2 U'' R'' U''', 'Most popular'),
  (11, 2, 'R U2 R'' U'' R U2 L'' U R'' U'' L', 'Alternate'),
  (11, 3, 'R U R2 F'' R U R U'' R'' F R U'' R''', 'Short RUF'),
  (11, 4, 'r'' F R F'' r U2 R'' U R U2 R''', 'Wide r'),
  (11, 5, 'L'' U R U'' L U2 R'' U R U2 R''', 'RUL'),
  (12, 1, 'R U R'' U R U R'' F'' R U R'' U'' R'' F R2 U'' R'' U2 R U'' R''', 'Most popular'),
  (12, 2, 'R U R'' U2 R U R2 F'' R U R U'' R'' F R U'' R'' U'' R U'' R''', 'J-perm based'),
  (12, 3, 'z U R'' D R2 U'' R D'' U R'' D R2 U'' R D'' z''', 'RUD with z'),
  (12, 4, 'F'' R U R'' U'' R'' F R2 F U'' R'' U'' R U F'' R''', 'RUF'),
  (12, 5, 'L U'' R U2 L'' U R'' L U'' R U2 L'' U R''', 'Rotationless RUL'),
  (13, 1, 'R'' U R U'' R'' F'' U'' F R U R'' F R'' F'' R U'' R', 'Most popular'),
  (13, 2, 'r'' D'' F r U'' r'' F'' D r2 U r'' U'' r'' F r F''', 'Wide r'),
  (13, 3, 'R'' U L'' U2 R U'' L R'' U L'' U2 R U'' L', 'Rotationless RUL'),
  (13, 4, 'z D'' R U'' R2 D R'' U D'' R U'' R2 D R'' U z''', 'RUD with z'),
  (13, 5, 'F r'' F'' r U r U'' r2 D'' F r U r'' F'' D r', 'Wide r alt'),
  (14, 1, 'R U'' R'' U'' R U R D R'' U'' R D'' R'' U2 R''', 'Most popular'),
  (14, 2, 'R U R'' F'' R U2 R'' U2 R'' F R U R U2 R''', 'RUF'),
  (14, 3, 'R U2 R D R'' U R D'' R'' U'' R'' U R U R''', 'RUD alt'),
  (14, 4, 'L U2 L'' U2 L F'' L'' U'' L U L F L2', 'L-hand'),
  (14, 5, 'R U'' R'' U'' R U R'' U R'' D'' R U'' R'' D R2 U R''', 'RUD long'),
  (15, 1, 'R2 F R U R U'' R'' F'' R U2 R'' U2 R', 'Most popular'),
  (15, 2, 'R'' U2 R U2 R'' F R U R'' U'' R'' F'' R2 U''', 'RUF alt'),
  (15, 3, 'R'' U R U R'' U'' R'' D'' R U R'' D R U2 R', 'RUD'),
  (15, 4, 'R'' U2 R'' D'' R U'' R'' D R U R U'' R'' U'' R', 'RUD alt'),
  (16, 1, 'R U R'' U'' R'' F R2 U'' R'' U'' R U R'' F''', 'Most popular'),
  (16, 2, 'F R U'' R'' U R U R2 F'' R U R U'' R''', 'F first'),
  (16, 3, 'R U R'' U'' R'' F R2 U'' R'' U F'' L'' U L', 'L ending'),
  (16, 4, 'R2 u R2 u'' R2 F2 u'' F2 u F2', 'Wide u'),
  (17, 1, 'M2 U M U2 M'' U M2', 'Most popular'),
  (17, 2, 'R U'' R U R U R U'' R'' U'' R2', 'R U variant'),
  (17, 3, 'R2 U'' R'' U'' R U R U R U'' R', 'RU alt'),
  (17, 4, 'M2 U M'' U2 M U M2', 'M'' variant'),
  (18, 1, 'M2 U'' M U2 M'' U'' M2', 'Most popular'),
  (18, 2, 'R2 U R U R'' U'' R'' U'' R'' U R''', 'R U variant'),
  (18, 3, 'R'' U R'' U'' R'' U'' R'' U R U R2', 'RU alt'),
  (18, 4, 'M2 U'' M'' U2 M U'' M2', 'M'' variant'),
  (19, 1, 'R'' U R'' U'' y R'' F'' R2 U'' R'' U R'' F R F', 'Most popular'),
  (19, 2, 'R'' U R'' d'' R'' F'' R2 U'' R'' U R'' F R F', 'Wide d'),
  (19, 3, 'R'' U R U'' R'' f'' U'' R U2 R'' U'' R U'' R'' f R', 'Wide f'),
  (19, 4, 'R U'' R U R'' D R D'' R U'' D R2 U R2 D'' R2', 'RUD'),
  (19, 5, 'D2 R'' U R D'' R2 U'' R'' U R'' U R'' D'' R U2 R''', 'RUD alt'),
  (20, 1, 'F R U'' R'' U'' R U R'' F'' R U R'' U'' R'' F R F''', 'Most popular'),
  (20, 2, 'F R'' F'' R U R U'' R'' F R U'' R'' U R U R'' F''', 'Alternate'),
  (20, 3, 'F R'' F R2 U'' R'' U'' R U R'' F'' R U R'' U'' F''', 'RUF short'),
  (20, 4, 'R2 U'' R2 U'' R2 U F U F'' R2 F U'' F''', 'R2 based'),
  (20, 5, 'F R'' F'' R U R U'' R2 U'' R U R f'' U'' f', 'Wide f ending'),
  (21, 1, 'M'' U M2 U M2 U M'' U2 M2', 'Most popular'),
  (21, 2, 'M2 U M2 U M'' U2 M2 U2 M''', 'Alternate'),
  (21, 3, 'M'' U'' M2 U'' M2 U'' M'' U2 M2', 'U'' variant'),
  (21, 4, 'M U2 M2 U2 M U'' M2 U'' M2', 'M first'),
  (21, 5, 'R U R'' U R'' U'' R'' U R U'' R'' U'' R2 U R', 'RU only');

-- All 21 cases must exist before we touch anything.
DO $$
BEGIN
  IF (SELECT count(*) FROM public.algorithm_cases
      WHERE puzzle_type = '333' AND subset = 'pll'
        AND case_number BETWEEN 1 AND 21) <> 21 THEN
    RAISE EXCEPTION 'Expected 21 PLL cases (333/pll, case_number 1..21) — aborting';
  END IF;
END $$;

CREATE TEMP TABLE _pll_case ON COMMIT DROP AS
SELECT id, case_number FROM public.algorithm_cases
WHERE puzzle_type = '333' AND subset = 'pll';

-- ── 1. Seed repairs ────────────────────────────────────────────────────────
-- 1a. Ab main typo (x → x').
UPDATE public.algorithms a
SET moves = 'x'' L2 D2 L U L'' D2 L U'' L x'
FROM _pll_case c
WHERE a.case_id = c.id AND c.case_number = 2
  AND pg_temp.norm_alg(a.moves) = 'x L2 D2 L U L'' D2 L U'' L x''';

-- 1b. Aa algorithm filed under Ab → move it to Aa.
UPDATE public.algorithms a
SET case_id = (SELECT id FROM _pll_case WHERE case_number = 1),
    is_main = false
FROM _pll_case c
WHERE a.case_id = c.id AND c.case_number = 2
  AND pg_temp.norm_alg(a.moves) = 'y x'' R2 D2 R'' U'' R D2 R'' U R'' x';

-- 1c. cube_state values that are not PLL states (only if still the seed value).
UPDATE public.algorithm_cases SET cube_state = 'x L U'' L D2 L'' U L D2 L2 x'''
WHERE puzzle_type = '333' AND subset = 'pll' AND case_number = 1
  AND cube_state = 'x L'' U'' L D2 L'' U L D2 L2 x''';

UPDATE public.algorithm_cases SET cube_state = 'x R'' U R'' D2 R U'' R'' D2 R2 x'''
WHERE puzzle_type = '333' AND subset = 'pll' AND case_number = 2
  AND cube_state = 'x L'' U L'' D2 L U'' L'' D2 L2 x''';

UPDATE public.algorithm_cases SET cube_state = 'D R2 U'' R U'' R U R'' U R2 D'' U R U'' R'''
WHERE puzzle_type = '333' AND subset = 'pll' AND case_number = 8
  AND cube_state = 'R2 u'' R U R'' U R u R2 y R U'' R''';

-- ── 2. Merge duplicate algorithms within a case ────────────────────────────
CREATE TEMP TABLE _pll_dup ON COMMIT DROP AS
SELECT id, keeper FROM (
  SELECT a.id,
         first_value(a.id) OVER (
           PARTITION BY a.case_id, pg_temp.norm_alg(a.moves)
           ORDER BY a.is_main DESC, a.created_at, a.id
         ) AS keeper
  FROM public.algorithms a
  JOIN _pll_case c ON c.id = a.case_id
) s
WHERE id <> keeper;

UPDATE public.drill_attempts d
SET algorithm_id = x.keeper
FROM _pll_dup x
WHERE d.algorithm_id = x.id;

INSERT INTO public.user_algorithm_bookmarks (user_id, algorithm_id, learned, created_at)
SELECT b.user_id, x.keeper, bool_or(b.learned), min(b.created_at)
FROM public.user_algorithm_bookmarks b
JOIN _pll_dup x ON x.id = b.algorithm_id
GROUP BY b.user_id, x.keeper
ON CONFLICT (user_id, algorithm_id) DO UPDATE
  SET learned = public.user_algorithm_bookmarks.learned OR EXCLUDED.learned;

DELETE FROM public.algorithms WHERE id IN (SELECT id FROM _pll_dup);

-- ── 3. Clear every PLL main (uq_one_main_alg_per_case allows only one) ─────
UPDATE public.algorithms a
SET is_main = false
FROM _pll_case c
WHERE a.case_id = c.id AND a.is_main;

-- ── 4. Update algorithms that already exist ────────────────────────────────
UPDATE public.algorithms a
SET label = t.label,
    is_approved = true
FROM _pll_target t
JOIN _pll_case c ON c.case_number = t.case_number
WHERE a.case_id = c.id
  AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves);

-- ── 5. Insert the ones that don't ──────────────────────────────────────────
INSERT INTO public.algorithms (case_id, moves, label, is_main, is_approved)
SELECT c.id, t.moves, t.label, false, true
FROM _pll_target t
JOIN _pll_case c ON c.case_number = t.case_number
WHERE NOT EXISTS (
  SELECT 1 FROM public.algorithms a
  WHERE a.case_id = c.id
    AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves)
)
ORDER BY t.case_number, t.sort_rank;

-- ── 6. Set the new mains ───────────────────────────────────────────────────
UPDATE public.algorithms a
SET is_main = true
FROM _pll_target t
JOIN _pll_case c ON c.case_number = t.case_number
WHERE t.sort_rank = 1
  AND a.case_id = c.id
  AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves);

-- ── 7. Assert the end state, or roll everything back ───────────────────────
DO $$
DECLARE
  bad_main  integer;
  missing   integer;
BEGIN
  SELECT count(*) INTO bad_main FROM (
    SELECT c.id FROM _pll_case c
    LEFT JOIN public.algorithms a ON a.case_id = c.id AND a.is_main
    GROUP BY c.id HAVING count(a.id) <> 1
  ) s;

  SELECT count(*) INTO missing FROM _pll_target t
  JOIN _pll_case c ON c.case_number = t.case_number
  WHERE NOT EXISTS (
    SELECT 1 FROM public.algorithms a
    WHERE a.case_id = c.id
      AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves)
  );

  IF bad_main <> 0 OR missing <> 0 THEN
    RAISE EXCEPTION 'PLL refresh check failed: % case(s) without exactly one main, % target alg(s) missing',
      bad_main, missing;
  END IF;
END $$;

COMMIT;

-- ── Verify afterwards (read-only) ──────────────────────────────────────────
-- SELECT c.case_number, c.name, a.is_main, a.label, a.moves, a.move_count
-- FROM public.algorithm_cases c
-- JOIN public.algorithms a ON a.case_id = c.id
-- WHERE c.puzzle_type = '333' AND c.subset = 'pll'
-- ORDER BY c.case_number, a.is_main DESC, a.move_count;
