-- 20261005000300_222_eg1.sql
--
-- New 2x2 subset: EG-1 (bottom layer has an adjacent swap). 40 cases,
--   categorised by top-face shape: Sune 1-6, Anti-Sune 7-12, Pi 13-18,
--   U 19-24, L 25-30, T 31-36, H 37-40.
--
-- 68 algorithms, up to 5 per case. Source: Alg-Trainer (tao-yu/Alg-Trainer) EG-1 set, in its recommended order.
-- Every algorithm was machine-checked with cubing.js: it solves its own case
-- (up to U/D adjustments) and no other case in this subset.
--
-- Safe to run on a database that already has some of these rows, and safe to
-- run twice: cases are upserted on (puzzle_type, subset, case_number), existing
-- algorithms are matched on normalised moves and updated in place (their ids,
-- drill history and bookmarks survive), and only missing algorithms are
-- inserted. Algorithms outside the list (e.g. user submissions) are left alone
-- apart from losing is_main.
--
-- Apply via the Supabase Dashboard SQL editor (MCP is read-only).
-- After applying with the CLI: supabase migration repair --status applied 20261005000300

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.norm_alg(m text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(replace(btrim(m), '2''', '2'), '\s+', ' ', 'g')
$$;

-- ── 1. Subset (what the Learn page lists) ──────────────────────────────────
INSERT INTO public.algorithm_subsets (puzzle_type, slug, name, description, access_tier, order_index, is_published)
VALUES ('222', 'eg1', 'EG-1', 'CLL for a first layer with an adjacent corner swap: solves the whole cube in one algorithm. 40 cases.', 'free'::public.access_tier, 3, true)
ON CONFLICT (puzzle_type, slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      order_index = EXCLUDED.order_index;   -- access_tier is never overwritten

-- ── 2. Cases ───────────────────────────────────────────────────────────────
CREATE TEMP TABLE _eg1_case_src (
  case_number integer NOT NULL,
  name        text    NOT NULL,
  description text    NOT NULL,
  cube_state  text    NOT NULL,   -- inverse of the main algorithm
  seed_state  text                -- known-bad seeded value to replace, if any
) ON COMMIT DROP;

INSERT INTO _eg1_case_src VALUES
  ( 1, 'Sune 1', 'Sune · first layer has an adjacent swap', 'x U R'' F2 U2 L'' F y', NULL),
  ( 2, 'Sune 2', 'Sune · first layer has an adjacent swap', 'R U'' R'' F'' U'' F2 R U'' R''', NULL),
  ( 3, 'Sune 3', 'Sune · first layer has an adjacent swap', 'F R'' F2 R2 U R'' U2 R'' F'' R y', NULL),
  ( 4, 'Sune 4', 'Sune · first layer has an adjacent swap', 'R U'' R'' F'' U'' R U R'' U'' F', NULL),
  ( 5, 'Sune 5', 'Sune · first layer has an adjacent swap', 'R U R'' F'' U'' R U R'' U'' R U R'' y''', NULL),
  ( 6, 'Sune 6', 'Sune · first layer has an adjacent swap', 'F'' L F L'' U'' R U R2 F'' R', NULL),
  ( 7, 'Anti-Sune 1', 'Anti-Sune · first layer has an adjacent swap', 'x2 F'' U F2 R2 U B'' y', NULL),
  ( 8, 'Anti-Sune 2', 'Anti-Sune · first layer has an adjacent swap', 'R U R'' F2 U F R U R'' y''', NULL),
  ( 9, 'Anti-Sune 3', 'Anti-Sune · first layer has an adjacent swap', 'L'' U L R U'' R'' U L F'' L'' F', NULL),
  (10, 'Anti-Sune 4', 'Anti-Sune · first layer has an adjacent swap', 'F'' U R U'' R'' U F R U R''', NULL),
  (11, 'Anti-Sune 5', 'Anti-Sune · first layer has an adjacent swap', 'R U'' R'' U R U'' R'' U F R U'' R'' y', NULL),
  (12, 'Anti-Sune 6', 'Anti-Sune · first layer has an adjacent swap', 'F R'' F'' R U R'' F'' R2 U R'' y2', NULL),
  (13, 'Pi 1', 'Pi · first layer has an adjacent swap', 'R2 U R'' U2 R'' U R U'' R B2 R2 y2', NULL),
  (14, 'Pi 2', 'Pi · first layer has an adjacent swap', 'R'' F'' R2 U R2 F'' R y', NULL),
  (15, 'Pi 3', 'Pi · first layer has an adjacent swap', 'R'' U'' R'' F2 U F'' R F'' y', NULL),
  (16, 'Pi 4', 'Pi · first layer has an adjacent swap', 'R U R'' F'' R U R'' U'' R U R'' y', NULL),
  (17, 'Pi 5', 'Pi · first layer has an adjacent swap', 'F R U'' R'' F R U2 R'' U F'' y''', NULL),
  (18, 'Pi 6', 'Pi · first layer has an adjacent swap', 'F U'' R U2 R'' F'' R U R'' F''', NULL),
  (19, 'U 1', 'U · first layer has an adjacent swap', 'R U R2 F'' R2 U'' R'' U'' R U'' R'' y', NULL),
  (20, 'U 2', 'U · first layer has an adjacent swap', 'x U R'' U'' R'' F'' U R'' U'' R U x'' y''', NULL),
  (21, 'U 3', 'U · first layer has an adjacent swap', 'F'' U2 R U2 R'' U2 F', NULL),
  (22, 'U 4', 'U · first layer has an adjacent swap', 'R U R2 F'' R F R'' F'' R y''', NULL),
  (23, 'U 5', 'U · first layer has an adjacent swap', 'R U R'' F'' R U R'' U'' F R'' F'' R y''', NULL),
  (24, 'U 6', 'U · first layer has an adjacent swap', 'R U'' R'' y U'' R U R2 F'' R y2', NULL),
  (25, 'L 1', 'L · first layer has an adjacent swap', 'F'' R'' F R2 U R'' U'' R U R'' y''', NULL),
  (26, 'L 2', 'L · first layer has an adjacent swap', 'F L F'' L2 U'' L U L'' U'' L y2', NULL),
  (27, 'L 3', 'L · first layer has an adjacent swap', 'R U R2 F'' U R2 U R2 U'' R y''', NULL),
  (28, 'L 4', 'L · first layer has an adjacent swap', 'R U2 R'' F R U'' R2 F'' R y''', NULL),
  (29, 'L 5', 'L · first layer has an adjacent swap', 'R'' F R F'' U R U'' R'' F R U'' R'' y2', NULL),
  (30, 'L 6', 'L · first layer has an adjacent swap', 'R2 U'' R U2 R y R U R'' y''', NULL),
  (31, 'T 1', 'T · first layer has an adjacent swap', 'F'' R U2 R'' F'' R2 U R'' U'' R2 y''', NULL),
  (32, 'T 2', 'T · first layer has an adjacent swap', 'R U'' R'' U R U'' R2 F'' R F', NULL),
  (33, 'T 3', 'T · first layer has an adjacent swap', 'R U2 R'' U'' R'' F'' R2 U R'' y''', NULL),
  (34, 'T 4', 'T · first layer has an adjacent swap', 'R U'' R U R'' U R U B2 R2 y', NULL),
  (35, 'T 5', 'T · first layer has an adjacent swap', 'x R'' U R U'' R'' U x'' R2 U'' R'' y''', NULL),
  (36, 'T 6', 'T · first layer has an adjacent swap', 'R U R'' U F'' R U'' R'' F'' R U'' R'' y', NULL),
  (37, 'H 1', 'H · first layer has an adjacent swap', 'F R U'' R'' F'' R U R2 F'' R U', NULL),
  (38, 'H 2', 'H · first layer has an adjacent swap', 'F'' U R'' F2 R2 U R'' U'' F U', NULL),
  (39, 'H 3', 'H · first layer has an adjacent swap', 'F R'' F U'' F2 R U R', NULL),
  (40, 'H 4', 'H · first layer has an adjacent swap', 'U R U'' R'' U R U'' R'' F R U'' R'' U', NULL);

INSERT INTO public.algorithm_cases (puzzle_type, subset, case_number, name, description, cube_state)
SELECT '222', 'eg1', case_number, name, description, cube_state FROM _eg1_case_src
ON CONFLICT (puzzle_type, subset, case_number) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description;

-- Replace a cube_state only if it still holds the broken seeded value.
UPDATE public.algorithm_cases c
SET cube_state = s.cube_state
FROM _eg1_case_src s
WHERE c.puzzle_type = '222' AND c.subset = 'eg1' AND c.case_number = s.case_number
  AND s.seed_state IS NOT NULL AND c.cube_state = s.seed_state;

CREATE TEMP TABLE _eg1_case ON COMMIT DROP AS
SELECT id, case_number FROM public.algorithm_cases
WHERE puzzle_type = '222' AND subset = 'eg1';

-- ── 3. Target algorithms ───────────────────────────────────────────────────
CREATE TEMP TABLE _eg1_target (
  case_number integer NOT NULL,
  sort_rank   integer NOT NULL,   -- 1 = main
  moves       text    NOT NULL,
  label       text    NOT NULL
) ON COMMIT DROP;

INSERT INTO _eg1_target (case_number, sort_rank, moves, label) VALUES
  ( 1, 1, 'y'' F'' L U2 F2 R U'' x''', 'Main'),
  ( 1, 2, 'z'' R'' U'' R U2 x'' U2 R U'' z', 'RU'),
  ( 2, 1, 'R U R'' F2 U F R U R''', 'Main'),
  ( 2, 2, 'y'' R'' F R2 U'' R2 F U'' R U'' R'' U2 R', 'RUF'),
  ( 2, 3, 'y2 F R2 U'' R2 F U'' F2 U'' R', 'RUF'),
  ( 3, 1, 'y'' R'' F R U2 R U'' R2 F2 R F''', 'Main'),
  ( 3, 2, 'y2 F R'' F'' R U R'' F'' R2 U R''', 'RUF'),
  ( 4, 1, 'F'' U R U'' R'' U F R U R''', 'Main'),
  ( 4, 2, 'y2 F U'' R U2 R'' F2 R'' F R', 'RUF'),
  ( 5, 1, 'y R U'' R'' U R U'' R'' U F R U'' R''', 'Main'),
  ( 6, 1, 'R'' F R2 U'' R'' U L F'' L'' F', 'Main'),
  ( 7, 1, 'y'' B U'' R2 F2 U'' F x2', 'Main'),
  ( 7, 2, 'y R'' F R2 U R'' F'' U'' R U'' R''', 'RUF'),
  ( 8, 1, 'y R U'' R'' F'' U'' F2 R U'' R''', 'Main'),
  ( 8, 2, 'R U'' F2 R U2 R U'' F', 'RUF'),
  ( 9, 1, 'F'' L F L'' U'' R U R'' L'' U'' L', 'Main'),
  ( 9, 2, 'y'' R U'' R'' U2 R'' F R2 U2 R'' F', 'RUF'),
  (10, 1, 'R U'' R'' F'' U'' R U R'' U'' F', 'Main'),
  (11, 1, 'y'' R U R'' F'' U'' R U R'' U'' R U R''', 'Main'),
  (12, 1, 'y2 R U'' R2 F R U'' R'' F R F''', 'Main'),
  (13, 1, 'y2 R2 B2 R'' U R'' U'' R U2 R U'' R2', 'Main'),
  (13, 2, 'y2 F2 R U R'' U2 R U R'' U'' F', 'RUF'),
  (14, 1, 'y'' R'' F R2 U'' R2 F R', 'Main'),
  (14, 2, 'y'' R U R'' L'' U'' L R U R''', 'RUL'),
  (15, 1, 'y'' F R'' F U'' F2 R U R', 'Main'),
  (16, 1, 'y'' R U'' R'' U R U'' R'' F R U'' R''', 'Main'),
  (17, 1, 'y F U'' R U2 R'' F'' R U R'' F''', 'Main'),
  (17, 2, 'R U'' R2 F R U R U'' R'' U'' R'' F R F''', 'RUF'),
  (17, 3, 'R'' U'' R'' F2 U'' R U2 F2 R', 'RUF'),
  (18, 1, 'F R U'' R'' F R U2 R'' U F''', 'Main'),
  (18, 2, 'y2 L U L F2 U L'' U2 F2 L''', 'Left-hand (UFL)'),
  (19, 1, 'y'' R U R'' U R U R2 F R2 U'' R''', 'Main'),
  (20, 1, 'y x U'' R'' U R U'' F R U R U'' x''', 'Main'),
  (20, 2, 'y'' F R U'' R'' F U'' F'' R'' F'' R', 'RUF'),
  (20, 3, 'y x U'' R2 U'' R2 U'' x'' U'' F2 R2', 'RUF'),
  (21, 1, 'F'' U2 R U2 R'' U2 F', 'Main'),
  (22, 1, 'y R'' F R F'' R'' F R2 U'' R''', 'Main'),
  (23, 1, 'y R'' F R F'' U R U'' R'' F R U'' R''', 'Main'),
  (23, 2, 'y2 R U'' R'' U R U'' R'' U'' F R U'' R''', 'RUF'),
  (24, 1, 'y2 R'' F R2 U'' R'' U y'' R U R''', 'Main'),
  (25, 1, 'y R U'' R'' U R U'' R2 F'' R F', 'Main'),
  (25, 2, 'y2 R U R'' F'' R U2 R'' U2 R U R''', 'RUF'),
  (26, 1, 'y2 L'' U L U'' L'' U L2 F L'' F''', 'Main'),
  (26, 2, 'y'' R'' F R F'' R'' F R U R U2 R''', 'RUF'),
  (27, 1, 'y R'' U R2 U'' R2 U'' F R2 U'' R''', 'Main'),
  (28, 1, 'y R'' F R2 U R'' F'' R U2 R''', 'Main'),
  (29, 1, 'y2 R U R'' F'' R U R'' U'' F R'' F'' R', 'Main'),
  (29, 2, 'y2 L'' U L y'' R U2 R U'' R2', 'RUL'),
  (30, 1, 'y R U'' R'' y'' R'' U2 R'' U R2', 'Main'),
  (30, 2, 'y'' R'' F R F'' U2 R U2 R'' F R U'' R''', 'RUF'),
  (31, 1, 'y R2 U R U'' R2 F R U2 R'' F', 'Main'),
  (31, 2, 'y'' L'' U L U2 R'' F2 R F'' L'' U L', 'RUFL'),
  (32, 1, 'F'' R'' F R2 U R'' U'' R U R''', 'Main'),
  (33, 1, 'y R U'' R2 F R U R U2 R''', 'Main'),
  (33, 2, 'y'' L'' U L2 F'' L'' U'' L'' U2 L', 'Left-hand (UFL)'),
  (34, 1, 'y'' R2 B2 U'' R'' U'' R U'' R'' U R''', 'Main'),
  (35, 1, 'y R U R2 x U'' R U R'' U'' R x''', 'Main'),
  (36, 1, 'y'' R U R'' F R U R'' F U'' R U'' R''', 'Main'),
  (36, 2, 'y2 R U'' R'' U2 F R U2 R'' F', 'RUF'),
  (37, 1, 'U'' R'' F R2 U'' R'' F R U R'' F''', 'Main'),
  (37, 2, 'U'' R'' F R2 U'' R2 U'' F U R', 'RUF'),
  (38, 1, 'U'' F'' U R U'' R2 F2 R U'' F', 'Main'),
  (38, 2, 'F R U'' R2 F U'' F2 U R', 'RUF'),
  (38, 3, 'y R2 U2 R U'' R2 U'' R2 U R2 U'' R2', 'RU'),
  (39, 1, 'R'' U'' R'' F2 U F'' R F''', 'Main'),
  (39, 2, 'U2 R U R2 F2 U2 F R U R2', 'RUF'),
  (39, 3, 'U'' F U2 R U'' R'' F2 R'' F2 R F''', 'RUF'),
  (40, 1, 'U'' R U R'' F'' R U R'' U'' R U R'' U''', 'Main');

-- ── 4. Clear mains (uq_one_main_alg_per_case allows only one per case) ─────
UPDATE public.algorithms a SET is_main = false
FROM _eg1_case c WHERE a.case_id = c.id AND a.is_main;

-- ── 5. Move algorithms filed under the wrong case ──────────────────────────
UPDATE public.algorithms a
SET case_id = tc.id
FROM _eg1_target t
JOIN _eg1_case tc ON tc.case_number = t.case_number
WHERE a.case_id IN (SELECT id FROM _eg1_case)
  AND a.case_id <> tc.id
  AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves);

-- ── 6. Merge duplicates within a case ──────────────────────────────────────
CREATE TEMP TABLE _eg1_dup ON COMMIT DROP AS
SELECT id, keeper FROM (
  SELECT a.id,
         first_value(a.id) OVER (
           PARTITION BY a.case_id, pg_temp.norm_alg(a.moves)
           ORDER BY a.created_at, a.id
         ) AS keeper
  FROM public.algorithms a
  JOIN _eg1_case c ON c.id = a.case_id
) s
WHERE id <> keeper;

UPDATE public.drill_attempts d SET algorithm_id = x.keeper
FROM _eg1_dup x WHERE d.algorithm_id = x.id;

INSERT INTO public.user_algorithm_bookmarks (user_id, algorithm_id, learned, created_at)
SELECT b.user_id, x.keeper, bool_or(b.learned), min(b.created_at)
FROM public.user_algorithm_bookmarks b
JOIN _eg1_dup x ON x.id = b.algorithm_id
GROUP BY b.user_id, x.keeper
ON CONFLICT (user_id, algorithm_id) DO UPDATE
  SET learned = public.user_algorithm_bookmarks.learned OR EXCLUDED.learned;

DELETE FROM public.algorithms WHERE id IN (SELECT id FROM _eg1_dup);

-- ── 7. Update existing / insert missing / set mains ────────────────────────
UPDATE public.algorithms a
SET label = t.label, is_approved = true
FROM _eg1_target t
JOIN _eg1_case c ON c.case_number = t.case_number
WHERE a.case_id = c.id
  AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves);

INSERT INTO public.algorithms (case_id, moves, label, is_main, is_approved)
SELECT c.id, t.moves, t.label, false, true
FROM _eg1_target t
JOIN _eg1_case c ON c.case_number = t.case_number
WHERE NOT EXISTS (
  SELECT 1 FROM public.algorithms a
  WHERE a.case_id = c.id
    AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves)
)
ORDER BY t.case_number, t.sort_rank;

UPDATE public.algorithms a
SET is_main = true
FROM _eg1_target t
JOIN _eg1_case c ON c.case_number = t.case_number
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
  SELECT count(*) INTO n_cases FROM _eg1_case c
  JOIN _eg1_case_src s ON s.case_number = c.case_number;

  SELECT count(*) INTO bad_main FROM (
    SELECT c.id FROM _eg1_case c
    JOIN _eg1_case_src s ON s.case_number = c.case_number
    LEFT JOIN public.algorithms a ON a.case_id = c.id AND a.is_main
    GROUP BY c.id HAVING count(a.id) <> 1
  ) x;

  SELECT count(*) INTO missing FROM _eg1_target t
  JOIN _eg1_case c ON c.case_number = t.case_number
  WHERE NOT EXISTS (
    SELECT 1 FROM public.algorithms a
    WHERE a.case_id = c.id
      AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves)
  );

  IF n_cases <> 40 OR bad_main <> 0 OR missing <> 0 THEN
    RAISE EXCEPTION '222/eg1 check failed: % of 40 cases, % case(s) without exactly one main, % alg(s) missing',
      n_cases, bad_main, missing;
  END IF;
END $$;

COMMIT;

-- ── Verify afterwards (read-only) ──────────────────────────────────────────
-- SELECT c.case_number, c.name, c.description, a.is_main, a.label, a.moves
-- FROM public.algorithm_cases c
-- JOIN public.algorithms a ON a.case_id = c.id
-- WHERE c.puzzle_type = '222' AND c.subset = 'eg1'
-- ORDER BY c.case_number, a.is_main DESC, a.move_count;
