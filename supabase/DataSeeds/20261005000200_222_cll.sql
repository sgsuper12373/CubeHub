-- 20261005000200_222_cll.sql
--
-- New 2x2 subset: CLL. 42 cases, categorised by the top-face shape:
--   Sune 1-6, Anti-Sune 7-12, Pi 13-18, U 19-24, L 25-30, T 31-36, H 37-40,
--   plus the two already-oriented cases (41 adjacent swap, 42 diagonal swap).
--
-- 146 algorithms, up to 5 per case. Source: Alg-Trainer (tao-yu/Alg-Trainer) CLL set, in its recommended order.
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
-- After applying with the CLI: supabase migration repair --status applied 20261005000200

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.norm_alg(m text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(replace(btrim(m), '2''', '2'), '\s+', ' ', 'g')
$$;

-- ── 1. Subset (what the Learn page lists) ──────────────────────────────────
INSERT INTO public.algorithm_subsets (puzzle_type, slug, name, description, access_tier, order_index, is_published)
VALUES ('222', 'cll', 'CLL', 'Solve the first layer, then the whole last layer in one algorithm. 42 cases.', 'free'::public.access_tier, 2, true)
ON CONFLICT (puzzle_type, slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      order_index = EXCLUDED.order_index;   -- access_tier is never overwritten

-- ── 2. Cases ───────────────────────────────────────────────────────────────
CREATE TEMP TABLE _cll_case_src (
  case_number integer NOT NULL,
  name        text    NOT NULL,
  description text    NOT NULL,
  cube_state  text    NOT NULL,   -- inverse of the main algorithm
  seed_state  text                -- known-bad seeded value to replace, if any
) ON COMMIT DROP;

INSERT INTO _cll_case_src VALUES
  ( 1, 'Sune 1', 'Sune · first layer solved', 'R U2 R'' U'' R U'' R''', NULL),
  ( 2, 'Sune 2', 'Sune · first layer solved', 'R2 U R U2 R'' F R2 F'' R U', NULL),
  ( 3, 'Sune 3', 'Sune · first layer solved', 'R U2 R'' U2 R'' F R F''', NULL),
  ( 4, 'Sune 4', 'Sune · first layer solved', 'L'' U L F'' R U R''', NULL),
  ( 5, 'Sune 5', 'Sune · first layer solved', 'R U R'' y'' U R U'' R U R'' U R'' U2', NULL),
  ( 6, 'Sune 6', 'Sune · first layer solved', 'F'' L F L'' U2 L'' U2 L', NULL),
  ( 7, 'Anti-Sune 1', 'Anti-Sune · first layer solved', 'R'' U2 R U R'' U R', NULL),
  ( 8, 'Anti-Sune 2', 'Anti-Sune · first layer solved', 'R U R'' U R'' F R F'' R U2 R''', NULL),
  ( 9, 'Anti-Sune 3', 'Anti-Sune · first layer solved', 'L'' U2 L U2 L F'' L'' F U2', NULL),
  (10, 'Anti-Sune 4', 'Anti-Sune · first layer solved', 'R U'' R'' F L'' U'' L U2', NULL),
  (11, 'Anti-Sune 5', 'Anti-Sune · first layer solved', 'F R'' F'' R U2 R U2 R'' U2', NULL),
  (12, 'Anti-Sune 6', 'Anti-Sune · first layer solved', 'F R'' F'' R U R'' F2 R F L'' U2 L U2', NULL),
  (13, 'Pi 1', 'Pi · first layer solved', 'F U R U'' R'' U R U'' R'' F''', NULL),
  (14, 'Pi 2', 'Pi · first layer solved', 'R'' U2 R U R'' F R'' F'' R U R U', NULL),
  (15, 'Pi 3', 'Pi · first layer solved', 'R'' F'' R U'' R'' F'' R F'' R U R''', NULL),
  (16, 'Pi 4', 'Pi · first layer solved', 'F R2 F'' R U'' R U R'' U R'' U', NULL),
  (17, 'Pi 5', 'Pi · first layer solved', 'F R'' F'' R U2 R U'' R'' U R U2 R''', NULL),
  (18, 'Pi 6', 'Pi · first layer solved', 'F'' U R U R'' U2 F R'' F2 R', NULL),
  (19, 'U 1', 'U · first layer solved', 'F U R U'' R'' F'' U', NULL),
  (20, 'U 2', 'U · first layer solved', 'R U'' R U'' R U R'' U R'' U R'' U''', NULL),
  (21, 'U 3', 'U · first layer solved', 'x2 U R U R'' U R U R2 U R U2 z U', NULL),
  (22, 'U 4', 'U · first layer solved', 'x2 L'' U L U'' R U R'' U R'' x''', NULL),
  (23, 'U 5', 'U · first layer solved', 'R'' F2 R F R'' F2 R U'' R U2 R'' U2', NULL),
  (24, 'U 6', 'U · first layer solved', 'R'' U'' R U2 R'' F R'' F'' R U'' R', NULL),
  (25, 'L 1', 'L · first layer solved', 'R'' F'' R U R U'' R'' F U2', NULL),
  (26, 'L 2', 'L · first layer solved', 'R U R'' U'' R'' F R F'' U''', NULL),
  (27, 'L 3', 'L · first layer solved', 'R U2 R'' F R'' F'' R2 U2 R'' U''', NULL),
  (28, 'L 4', 'L · first layer solved', 'R2 U R'' U'' R U R'' U2 R U'' R U2', NULL),
  (29, 'L 5', 'L · first layer solved', 'R2 U'' R U R2 y U R U2 R'' U''', NULL),
  (30, 'L 6', 'L · first layer solved', 'R'' U2 R U R2 F'' R U R U'' R'' F R', NULL),
  (31, 'T 1', 'T · first layer solved', 'F R'' F'' R U R U'' R'' U', NULL),
  (32, 'T 2', 'T · first layer solved', 'F'' L F L'' U'' L'' U L U''', NULL),
  (33, 'T 3', 'T · first layer solved', 'R U'' R'' F2 U R U2 R'' U F''', NULL),
  (34, 'T 4', 'T · first layer solved', 'R2 F2 U'' R'' U F'' R U'' R U''', NULL),
  (35, 'T 5', 'T · first layer solved', 'F R U'' R'' U R U R'' U R U'' R'' F'' U2', NULL),
  (36, 'T 6', 'T · first layer solved', 'R'' F R'' F'' R2 U2 R'' U'' R', NULL),
  (37, 'H 1', 'H · first layer solved', 'R2 U2 R'' U2 R2 U''', NULL),
  (38, 'H 2', 'H · first layer solved', 'F U R U'' R'' U R U'' R'' U R U'' R'' F'' U''', NULL),
  (39, 'H 3', 'H · first layer solved', 'R'' F R F'' R U'' R'' U'' R U'' R''', NULL),
  (40, 'H 4', 'H · first layer solved', 'F R2 U'' R2 U R2 U R2 F''', NULL),
  (41, 'Oriented, adjacent swap', 'PLL · top oriented, adjacent corner swap', 'F R U'' R'' U R U R2 F'' R U R U'' R'' y''', NULL),
  (42, 'Oriented, diagonal swap', 'PLL · top oriented, diagonal corner swap', 'F R'' F'' R U R U'' R'' F R U'' R'' U R U R'' F''', NULL);

INSERT INTO public.algorithm_cases (puzzle_type, subset, case_number, name, description, cube_state)
SELECT '222', 'cll', case_number, name, description, cube_state FROM _cll_case_src
ON CONFLICT (puzzle_type, subset, case_number) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description;

-- Replace a cube_state only if it still holds the broken seeded value.
UPDATE public.algorithm_cases c
SET cube_state = s.cube_state
FROM _cll_case_src s
WHERE c.puzzle_type = '222' AND c.subset = 'cll' AND c.case_number = s.case_number
  AND s.seed_state IS NOT NULL AND c.cube_state = s.seed_state;

CREATE TEMP TABLE _cll_case ON COMMIT DROP AS
SELECT id, case_number FROM public.algorithm_cases
WHERE puzzle_type = '222' AND subset = 'cll';

-- ── 3. Target algorithms ───────────────────────────────────────────────────
CREATE TEMP TABLE _cll_target (
  case_number integer NOT NULL,
  sort_rank   integer NOT NULL,   -- 1 = main
  moves       text    NOT NULL,
  label       text    NOT NULL
) ON COMMIT DROP;

INSERT INTO _cll_target (case_number, sort_rank, moves, label) VALUES
  ( 1, 1, 'R U R'' U R U2 R''', 'Main'),
  ( 1, 2, 'U L'' U2 L U L'' U L', 'Left-hand (UL)'),
  ( 1, 3, 'U'' R'' U2 R U R'' U R', 'RU'),
  ( 2, 1, 'U'' R'' F R2 F'' R U2 R'' U'' R2', 'Main'),
  ( 2, 2, 'U2 R U R'' U R'' F R F'' R U2 R''', 'RUF'),
  ( 2, 3, 'U'' R'' F R2 F'' U'' R'' U'' R2 U R''', 'RUF'),
  ( 2, 4, 'R'' F R F'' U R U R'' U2 F R'' F'' R', 'RUF'),
  ( 3, 1, 'F R'' F'' R U2 R U2 R''', 'Main'),
  ( 4, 1, 'R U'' R'' F L'' U'' L', 'Main'),
  ( 4, 2, 'R U'' R'' F R'' F'' R', 'RUF'),
  ( 4, 3, 'R U'' L'' U R'' U'' L', 'RUL'),
  ( 4, 4, 'U2 L U'' R'' U L'' U'' R', 'RUL'),
  ( 5, 1, 'U2 R U'' R U'' R'' U R'' U'' y R U'' R''', 'Main'),
  ( 5, 2, 'R U R'' U'' R'' F R F'' R U R'' U R U2 R''', 'RUF'),
  ( 5, 3, 'U'' R'' U'' R D'' R'' U R'' U'' R U'' R', 'RUD'),
  ( 5, 4, 'U2 R U'' R U'' R'' U R'' U'' F R'' F''', 'RUF'),
  ( 6, 1, 'L'' U2 L U2 L F'' L'' F', 'Main'),
  ( 6, 2, 'R'' F2 R U2 R U'' R'' F', 'RUF'),
  ( 6, 3, 'U2 R'' U2 R U2 R B'' R'' B', 'RUB'),
  ( 7, 1, 'R'' U'' R U'' R'' U2 R', 'Main'),
  ( 7, 2, 'U R U2 R'' U'' R U'' R''', 'RU'),
  ( 7, 3, 'U2 L'' U'' L U'' L'' U2 L', 'Left-hand (UL)'),
  ( 8, 1, 'R U2 R'' F R'' F'' R U'' R U'' R''', 'Main'),
  ( 8, 2, 'U'' R'' U'' R U'' R'' U R'' F R F'' U R', 'RUF'),
  ( 8, 3, 'U2 R'' U R U'' R2 F R F'' R U R'' U'' R', 'RUF'),
  ( 8, 4, 'U'' R2 U R U2 L'' U R2 U'' L', 'RUL'),
  ( 9, 1, 'U2 F'' L F L'' U2 L'' U2 L', 'Main'),
  ( 9, 2, 'U2 F'' R U R'' U2 R'' F2 R', 'RUF'),
  (10, 1, 'U2 L'' U L F'' R U R''', 'Main'),
  (10, 2, 'R'' U L U'' R U L''', 'RUL'),
  (10, 3, 'U2 R'' F R F'' R U R''', 'RUF'),
  (10, 4, 'U2 L'' U R U'' L U R''', 'RUL'),
  (11, 1, 'U2 R U2 R'' U2 R'' F R F''', 'Main'),
  (12, 1, 'U2 L'' U2 L F'' R'' F2 R U'' R'' F R F''', 'Main'),
  (12, 2, 'U R U R'' D R U'' R U R'' U R''', 'RUD'),
  (12, 3, 'L'' U L'' U L U'' L U y'' L'' U L', 'Left-hand (UL)'),
  (12, 4, 'R2 F R U2 R U'' R'' U2 F'' R', 'RUF'),
  (13, 1, 'F R U R'' U'' R U R'' U'' F''', 'Main'),
  (13, 2, 'R'' U R2 U'' R2 U'' R2 U R''', 'RU'),
  (13, 3, 'R U2 R2 U'' R2 U'' R2 U2 R', 'RU'),
  (13, 4, 'U2 F U R U'' R'' U R U'' R'' F''', 'RUF'),
  (14, 1, 'U'' R'' U'' R'' F R F'' R U'' R'' U2 R', 'Main'),
  (14, 2, 'R2 U R'' U'' F R F'' R U'' R2', 'RUF'),
  (14, 3, 'U2 R U R'' U R D'' R U'' R'' F''', 'RUFD'),
  (14, 4, 'U F R U R'' U'' F'' U'' R U2 R'' U'' R U'' R''', 'RUF'),
  (15, 1, 'R U'' R'' F R'' F R U R'' F R', 'Main'),
  (15, 2, 'U2 R'' F R F'' R U'' R'' U'' R U'' R''', 'RUF'),
  (15, 3, 'R U'' L'' U R'' U L U L'' U L', 'RUL'),
  (16, 1, 'U'' R U'' R U'' R'' U R'' F R2 F''', 'Main'),
  (16, 2, 'U F R2 U'' R2 U R2 U R2 F''', 'RUF'),
  (16, 3, 'U'' R'' F R U F U'' R U R'' U'' F''', 'RUF'),
  (16, 4, 'U2 R U R U'' R'' F R'' U R U'' R'' F''', 'RUF'),
  (17, 1, 'R U2 R'' U'' R U R'' U2 R'' F R F''', 'Main'),
  (17, 2, 'R U2 R'' U2 R'' F R2 U R'' U'' F''', 'RUF'),
  (17, 3, 'R U R'' U'' R'' F R2 U R'' U'' R U R'' U'' F''', 'RUF'),
  (17, 4, 'U2 L F2 L'' U2 L'' U2 L F2 U L'' U L', 'Left-hand (UFL)'),
  (18, 1, 'R'' F2 R F'' U2 R U'' R'' U'' F', 'Main'),
  (18, 2, 'L'' U2 L F'' U2 L F'' L'' U'' F', 'Left-hand (UFL)'),
  (18, 3, 'U2 L'' U2 L U L'' U'' L U2 L F'' L'' F', 'Left-hand (UFL)'),
  (18, 4, 'R'' F2 R U2 R U2 R'' F2 U'' R U'' R''', 'RUF'),
  (19, 1, 'U'' F R U R'' U'' F''', 'Main'),
  (19, 2, 'U F U R U'' R'' F''', 'RUF'),
  (19, 3, 'U2 F R U'' R'' U2 R U R'' F''', 'RUF'),
  (19, 4, 'U F'' L'' U'' L U F', 'Left-hand (UFL)'),
  (20, 1, 'U R U'' R U'' R U'' R'' U R'' U R''', 'Main'),
  (20, 2, 'U2 R2 F2 R U R'' F U'' R U R2', 'RUF'),
  (20, 3, 'R U'' R'' F'' L F'' L'' F2 U'' R U R''', 'RUFL'),
  (20, 4, 'U2 R U R'' U R U2 R'' U R U2 R'' U'' R U'' R''', 'RU'),
  (21, 1, 'U'' z'' U2 R'' U'' R2 U'' R'' U'' R U'' R'' U'' x2', 'Main'),
  (21, 2, 'U2 F R U R'' U2 F'' R U'' R'' F', 'RUF'),
  (21, 3, 'R'' F R U'' R'' U'' R U R'' F'' R U R'' U'' R'' F R F'' R', 'RUF'),
  (22, 1, 'x R U'' R U'' R'' U L'' U'' L x2', 'Main'),
  (22, 2, 'R2 F R F'' R'' F2 R U R'' F R2', 'RUF'),
  (22, 3, 'U'' F U'' R U R'' U'' y'' R'' U2 R U'' R''', 'RUF'),
  (22, 4, 'F R'' F'' R U'' R U'' R'' U2 R U'' R''', 'RUF'),
  (23, 1, 'U2 R U2 R'' U R'' F2 R F'' R'' F2 R', 'Main'),
  (23, 2, 'R U'' R2 F R F'' R U R'' U'' R U R''', 'RUF'),
  (23, 3, 'R2 D'' R U2 R'' D R U2 R', 'RUD'),
  (23, 4, 'L U'' L F'' L'' F L'' U2 L U'' L''', 'Left-hand (UFL)'),
  (24, 1, 'R'' U R'' F R F'' R U2 R'' U R', 'Main'),
  (24, 2, 'U2 R2 U R'' U'' R2 U'' y L'' U2 L', 'RUL'),
  (24, 3, 'U2 R2 D R'' U2 R D'' R'' U2 R''', 'RUD'),
  (25, 1, 'U2 F'' R U R'' U'' R'' F R', 'Main'),
  (25, 2, 'U F R U'' R'' U'' R U R'' F''', 'RUF'),
  (25, 3, 'U L'' U L U F U'' F''', 'Left-hand (UFL)'),
  (26, 1, 'U F R'' F'' R U R U'' R''', 'Main'),
  (26, 2, 'U x U R'' U'' L U R U'' R''', 'RUL'),
  (26, 3, 'U F'' U R U'' R'' F2 R U'' R''', 'RUF'),
  (26, 4, 'U2 R U'' R'' U'' F'' U F', 'RUF'),
  (27, 1, 'U R U2 R2 F R F'' R U2 R''', 'Main'),
  (27, 2, 'U'' R'' U'' R U R'' F'' R U R'' U'' R'' F R2', 'RUF'),
  (27, 3, 'U'' L'' U2 L F'' R'' F2 R2 U'' R''', 'RUFL'),
  (27, 4, 'U'' L'' U2 R U'' R'' U2 L R U'' R''', 'RUL'),
  (28, 1, 'U2 R'' U R'' U2 R U'' R'' U R U'' R2', 'Main'),
  (28, 2, 'U R U'' R U'' R U2 R'' U R'' U R''', 'RU'),
  (28, 3, 'U'' R2 U R'' U2 R U2 R'' U R2', 'RU'),
  (28, 4, 'U'' F'' R D2 R'' F U2 F'' R D2 R'' F', 'RUFD'),
  (29, 1, 'U R U2 R'' U'' y'' R2 U'' R'' U R2', 'Main'),
  (29, 2, 'R U'' R'' U R U'' R'' F R'' F'' R2 U R''', 'RUF'),
  (29, 3, 'U2 x'' R'' U2 R'' U'' R U2 R'' F R2 x', 'RUF'),
  (29, 4, 'U R U2 R'' D'' L2 U'' L'' U L2', 'RULD'),
  (30, 1, 'R'' F'' R U R'' U'' R'' F R2 U'' R'' U2 R', 'Main'),
  (30, 2, 'U R'' U'' R U2 R'' F R'' F'' R U'' R', 'RUF'),
  (30, 3, 'U R U2 R'' F'' R U2 R'' U R'' F2 R', 'RUF'),
  (30, 4, 'U2 L'' U2 L D R2 U R U'' R2', 'RULD'),
  (31, 1, 'U'' R U R'' U'' R'' F R F''', 'Main'),
  (32, 1, 'U L'' U'' L U L F'' L'' F', 'Main'),
  (32, 2, 'U'' F R F'' R U R'' U'' R''', 'RUF'),
  (32, 3, 'U R'' F'' R U R U'' R'' F', 'RUF'),
  (32, 4, 'U'' F R U'' R'' U R U R'' F''', 'RUF'),
  (33, 1, 'F U'' R U2 R'' U'' F2 R U R''', 'Main'),
  (33, 2, 'R'' U R2 D R'' U2 R D'' R2 U'' R', 'RUD'),
  (33, 3, 'U2 R'' U'' R U'' R'' U R U R'' F'' R U R'' U'' R'' F R2', 'RUF'),
  (34, 1, 'U R'' U R'' F U'' R U F2 R2', 'Main'),
  (34, 2, 'R U'' R U'' R U R'' U R'' U R''', 'RU'),
  (34, 3, 'U'' R U R'' U R U2 R'' U2 R'' U'' R U'' R'' U2 R', 'RU'),
  (34, 4, 'U2 R'' U R'' U2 R U2 R'' U R2 U'' R''', 'RU'),
  (35, 1, 'U2 F R U R'' U'' R U'' R'' U'' R U R'' F''', 'Main'),
  (35, 2, 'U R U2 R'' F2 R U2 R'' U2 R'' F2 R', 'RUF'),
  (35, 3, 'U'' L'' U2 L F2 L'' U2 L U2 L F2 L''', 'Left-hand (UFL)'),
  (35, 4, 'U2 F R F'' R U R'' U R'' U'' R U'' R''', 'RUF'),
  (36, 1, 'R'' U R U2 R2 F R F'' R', 'Main'),
  (36, 2, 'U2 R'' F R U2 R2 F R U'' R', 'RUF'),
  (37, 1, 'U R2 U2 R U2 R2', 'Main'),
  (37, 2, 'U R2 U2 R'' U2 R2', 'RU'),
  (37, 3, 'U'' R U2 R'' U'' R U R'' U'' R U'' R''', 'RU'),
  (37, 4, 'R U R'' U R U'' R'' U R U2 R''', 'RU'),
  (38, 1, 'U F R U R'' U'' R U R'' U'' R U R'' U'' F''', 'Main'),
  (38, 2, 'U x'' U2 R U2 R2 F2 R U2 x', 'RUF'),
  (38, 3, 'U F2 R'' F2 R2 U2 R'' F2', 'RUF'),
  (38, 4, 'U'' F U R U'' R'' U R U'' R'' U R U'' R'' F''', 'RUF'),
  (39, 1, 'R U R'' U R U R'' F R'' F'' R', 'Main'),
  (39, 2, 'R U R'' U R U L'' U R'' U'' L', 'RUL'),
  (39, 3, 'U R U'' R'' F U2 R2 F R U'' R', 'RUF'),
  (40, 1, 'F R2 U'' R2 U'' R2 U R2 F''', 'Main'),
  (40, 2, 'U'' R'' U2 R y R'' U R'' U'' R U'' R', 'RU'),
  (40, 3, 'U2 F R U R'' U'' R F'' R U R'' U'' R''', 'RUF'),
  (40, 4, 'F'' L2 U L2 U L2 U'' L2 F', 'Left-hand (UFL)'),
  (41, 1, 'y R U R'' U'' R'' F R2 U'' R'' U'' R U R'' F''', 'Main'),
  (41, 2, 'y R U R'' F'' R U R'' U'' R'' F R2 U'' R''', 'RUF'),
  (41, 3, 'y R U2 R'' U'' R U2 L'' U R'' U'' L', 'RUL'),
  (41, 4, 'y2 R'' F R'' F2 R U'' R'' F2 R2', 'RUF'),
  (42, 1, 'F R U'' R'' U'' R U R'' F'' R U R'' U'' R'' F R F''', 'Main'),
  (42, 2, 'R U'' R'' U'' F2 U'' R U R'' D R2', 'RUFD'),
  (42, 3, 'R'' U L'' U2 R U'' x'' U L'' U2 R U'' L U', 'RUL'),
  (42, 4, 'R'' U R'' F2 R F'' U R'' F2 R F'' R', 'RUF');

-- ── 4. Clear mains (uq_one_main_alg_per_case allows only one per case) ─────
UPDATE public.algorithms a SET is_main = false
FROM _cll_case c WHERE a.case_id = c.id AND a.is_main;

-- ── 5. Move algorithms filed under the wrong case ──────────────────────────
UPDATE public.algorithms a
SET case_id = tc.id
FROM _cll_target t
JOIN _cll_case tc ON tc.case_number = t.case_number
WHERE a.case_id IN (SELECT id FROM _cll_case)
  AND a.case_id <> tc.id
  AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves);

-- ── 6. Merge duplicates within a case ──────────────────────────────────────
CREATE TEMP TABLE _cll_dup ON COMMIT DROP AS
SELECT id, keeper FROM (
  SELECT a.id,
         first_value(a.id) OVER (
           PARTITION BY a.case_id, pg_temp.norm_alg(a.moves)
           ORDER BY a.created_at, a.id
         ) AS keeper
  FROM public.algorithms a
  JOIN _cll_case c ON c.id = a.case_id
) s
WHERE id <> keeper;

UPDATE public.drill_attempts d SET algorithm_id = x.keeper
FROM _cll_dup x WHERE d.algorithm_id = x.id;

INSERT INTO public.user_algorithm_bookmarks (user_id, algorithm_id, learned, created_at)
SELECT b.user_id, x.keeper, bool_or(b.learned), min(b.created_at)
FROM public.user_algorithm_bookmarks b
JOIN _cll_dup x ON x.id = b.algorithm_id
GROUP BY b.user_id, x.keeper
ON CONFLICT (user_id, algorithm_id) DO UPDATE
  SET learned = public.user_algorithm_bookmarks.learned OR EXCLUDED.learned;

DELETE FROM public.algorithms WHERE id IN (SELECT id FROM _cll_dup);

-- ── 7. Update existing / insert missing / set mains ────────────────────────
UPDATE public.algorithms a
SET label = t.label, is_approved = true
FROM _cll_target t
JOIN _cll_case c ON c.case_number = t.case_number
WHERE a.case_id = c.id
  AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves);

INSERT INTO public.algorithms (case_id, moves, label, is_main, is_approved)
SELECT c.id, t.moves, t.label, false, true
FROM _cll_target t
JOIN _cll_case c ON c.case_number = t.case_number
WHERE NOT EXISTS (
  SELECT 1 FROM public.algorithms a
  WHERE a.case_id = c.id
    AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves)
)
ORDER BY t.case_number, t.sort_rank;

UPDATE public.algorithms a
SET is_main = true
FROM _cll_target t
JOIN _cll_case c ON c.case_number = t.case_number
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
  SELECT count(*) INTO n_cases FROM _cll_case c
  JOIN _cll_case_src s ON s.case_number = c.case_number;

  SELECT count(*) INTO bad_main FROM (
    SELECT c.id FROM _cll_case c
    JOIN _cll_case_src s ON s.case_number = c.case_number
    LEFT JOIN public.algorithms a ON a.case_id = c.id AND a.is_main
    GROUP BY c.id HAVING count(a.id) <> 1
  ) x;

  SELECT count(*) INTO missing FROM _cll_target t
  JOIN _cll_case c ON c.case_number = t.case_number
  WHERE NOT EXISTS (
    SELECT 1 FROM public.algorithms a
    WHERE a.case_id = c.id
      AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves)
  );

  IF n_cases <> 42 OR bad_main <> 0 OR missing <> 0 THEN
    RAISE EXCEPTION '222/cll check failed: % of 42 cases, % case(s) without exactly one main, % alg(s) missing',
      n_cases, bad_main, missing;
  END IF;
END $$;

COMMIT;

-- ── Verify afterwards (read-only) ──────────────────────────────────────────
-- SELECT c.case_number, c.name, c.description, a.is_main, a.label, a.moves
-- FROM public.algorithm_cases c
-- JOIN public.algorithms a ON a.case_id = c.id
-- WHERE c.puzzle_type = '222' AND c.subset = 'cll'
-- ORDER BY c.case_number, a.is_main DESC, a.move_count;
