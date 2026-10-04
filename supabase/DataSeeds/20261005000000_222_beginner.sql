-- 20261005000000_222_beginner.sql
--
-- New 2x2 subset: the beginner (layer-by-layer) method. 6 cases in three
-- categories (the category is the prefix of each case's description, which is
-- what the Learn page search matches on):
--   First layer       1-3  inserting a bottom corner from each of its 3 twists
--   Orient last layer 4    Sune, repeated with U turns until the top is solved
--   Permute last layer 5-6 adjacent swap (T/J perm) and diagonal swap (Y perm)
--
-- 20 algorithms, up to 5 per case. Source: Standard beginner algorithms (corner inserts, Sune, T/J/A/Y perms).
-- Every algorithm was machine-checked with cubing.js: it solves its own case
-- (up to U/D adjustments) and no other case in this subset
-- (corner inserts: from their case they solve the whole first layer).
--
-- Safe to run on a database that already has some of these rows, and safe to
-- run twice: cases are upserted on (puzzle_type, subset, case_number), existing
-- algorithms are matched on normalised moves and updated in place (their ids,
-- drill history and bookmarks survive), and only missing algorithms are
-- inserted. Algorithms outside the list (e.g. user submissions) are left alone
-- apart from losing is_main.
--
-- Apply via the Supabase Dashboard SQL editor (MCP is read-only).
-- After applying with the CLI: supabase migration repair --status applied 20261005000000

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.norm_alg(m text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(replace(btrim(m), '2''', '2'), '\s+', ' ', 'g')
$$;

-- ── 1. Subset (what the Learn page lists) ──────────────────────────────────
INSERT INTO public.algorithm_subsets (puzzle_type, slug, name, description, access_tier, order_index, is_published)
VALUES ('222', 'beginner', 'Beginner', 'Layer by layer: insert the first-layer corners, orient the top with Sune, then swap the top corners. 6 cases.', 'public'::public.access_tier, 0, true)
ON CONFLICT (puzzle_type, slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      order_index = EXCLUDED.order_index;   -- access_tier is never overwritten

-- ── 2. Cases ───────────────────────────────────────────────────────────────
CREATE TEMP TABLE _beginner_case_src (
  case_number integer NOT NULL,
  name        text    NOT NULL,
  description text    NOT NULL,
  cube_state  text    NOT NULL,   -- inverse of the main algorithm
  seed_state  text                -- known-bad seeded value to replace, if any
) ON COMMIT DROP;

INSERT INTO _beginner_case_src VALUES
  ( 1, 'Corner on top, white facing right', 'First layer · corner above its slot, white sticker on the right', 'R U'' R''', NULL),
  ( 2, 'Corner on top, white facing front', 'First layer · corner above its slot, white sticker on the front', 'F'' U F', NULL),
  ( 3, 'Corner on top, white facing up', 'First layer · corner above its slot, white sticker on top', 'R U'' R'' U R U2 R''', NULL),
  ( 4, 'Orient the top (Sune)', 'Orient last layer · repeat with U turns until the top is one colour', 'R U2 R'' U'' R U'' R''', NULL),
  ( 5, 'Adjacent corner swap', 'Permute last layer · headlights on one side', 'F R U'' R'' U R U R2 F'' R U R U'' R''', NULL),
  ( 6, 'Diagonal corner swap', 'Permute last layer · no headlights', 'F R'' F'' R U R U'' R'' F R U'' R'' U R U R'' F''', NULL);

INSERT INTO public.algorithm_cases (puzzle_type, subset, case_number, name, description, cube_state)
SELECT '222', 'beginner', case_number, name, description, cube_state FROM _beginner_case_src
ON CONFLICT (puzzle_type, subset, case_number) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description;

-- Replace a cube_state only if it still holds the broken seeded value.
UPDATE public.algorithm_cases c
SET cube_state = s.cube_state
FROM _beginner_case_src s
WHERE c.puzzle_type = '222' AND c.subset = 'beginner' AND c.case_number = s.case_number
  AND s.seed_state IS NOT NULL AND c.cube_state = s.seed_state;

CREATE TEMP TABLE _beginner_case ON COMMIT DROP AS
SELECT id, case_number FROM public.algorithm_cases
WHERE puzzle_type = '222' AND subset = 'beginner';

-- ── 3. Target algorithms ───────────────────────────────────────────────────
CREATE TEMP TABLE _beginner_target (
  case_number integer NOT NULL,
  sort_rank   integer NOT NULL,   -- 1 = main
  moves       text    NOT NULL,
  label       text    NOT NULL
) ON COMMIT DROP;

INSERT INTO _beginner_target (case_number, sort_rank, moves, label) VALUES
  ( 1, 1, 'R U R''', 'Main'),
  ( 1, 2, 'U'' F'' U F', 'From the front'),
  ( 1, 3, 'R U R'' U''', 'Sexy move ×1'),
  ( 2, 1, 'F'' U'' F', 'Main'),
  ( 2, 2, 'U R U'' R''', 'From the right'),
  ( 2, 3, 'R U R'' U'' R U R'' U'' R U R'' U'' R U R'' U'' R U R'' U''', 'Sexy move ×5'),
  ( 3, 1, 'R U2 R'' U'' R U R''', 'Main'),
  ( 3, 2, 'F'' U2 F U F'' U'' F', 'From the front'),
  ( 3, 3, 'R U R'' U'' R U R'' U'' R U R'' U''', 'Sexy move ×3'),
  ( 4, 1, 'R U R'' U R U2 R''', 'Main'),
  ( 4, 2, 'U'' R'' U2 R U R'' U R', 'RU'),
  ( 4, 3, 'U L'' U2 L U L'' U L', 'Left-hand (UL)'),
  ( 4, 4, 'U2 L U L'' U L U2 L''', 'Left-hand (UL)'),
  ( 5, 1, 'R U R'' U'' R'' F R2 U'' R'' U'' R U R'' F''', 'Main (T perm)'),
  ( 5, 2, 'R U R'' F'' R U R'' U'' R'' F R2 U'' R''', 'J perm'),
  ( 5, 3, 'R U2 R'' U'' R U2 L'' U R'' U'' L', 'RUL'),
  ( 5, 4, 'R'' F R'' B2 R F'' R'' B2 R2', 'A perm'),
  ( 6, 1, 'F R U'' R'' U'' R U R'' F'' R U R'' U'' R'' F R F''', 'Main (Y perm)'),
  ( 6, 2, 'R U'' R'' U'' F2 U'' R U R'' D R2', 'RUFD'),
  ( 6, 3, 'R'' U R'' F2 R F'' U R'' F2 R F'' R', 'RUF');

-- ── 4. Clear mains (uq_one_main_alg_per_case allows only one per case) ─────
UPDATE public.algorithms a SET is_main = false
FROM _beginner_case c WHERE a.case_id = c.id AND a.is_main;

-- ── 5. Move algorithms filed under the wrong case ──────────────────────────
UPDATE public.algorithms a
SET case_id = tc.id
FROM _beginner_target t
JOIN _beginner_case tc ON tc.case_number = t.case_number
WHERE a.case_id IN (SELECT id FROM _beginner_case)
  AND a.case_id <> tc.id
  AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves);

-- ── 6. Merge duplicates within a case ──────────────────────────────────────
CREATE TEMP TABLE _beginner_dup ON COMMIT DROP AS
SELECT id, keeper FROM (
  SELECT a.id,
         first_value(a.id) OVER (
           PARTITION BY a.case_id, pg_temp.norm_alg(a.moves)
           ORDER BY a.created_at, a.id
         ) AS keeper
  FROM public.algorithms a
  JOIN _beginner_case c ON c.id = a.case_id
) s
WHERE id <> keeper;

UPDATE public.drill_attempts d SET algorithm_id = x.keeper
FROM _beginner_dup x WHERE d.algorithm_id = x.id;

INSERT INTO public.user_algorithm_bookmarks (user_id, algorithm_id, learned, created_at)
SELECT b.user_id, x.keeper, bool_or(b.learned), min(b.created_at)
FROM public.user_algorithm_bookmarks b
JOIN _beginner_dup x ON x.id = b.algorithm_id
GROUP BY b.user_id, x.keeper
ON CONFLICT (user_id, algorithm_id) DO UPDATE
  SET learned = public.user_algorithm_bookmarks.learned OR EXCLUDED.learned;

DELETE FROM public.algorithms WHERE id IN (SELECT id FROM _beginner_dup);

-- ── 7. Update existing / insert missing / set mains ────────────────────────
UPDATE public.algorithms a
SET label = t.label, is_approved = true
FROM _beginner_target t
JOIN _beginner_case c ON c.case_number = t.case_number
WHERE a.case_id = c.id
  AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves);

INSERT INTO public.algorithms (case_id, moves, label, is_main, is_approved)
SELECT c.id, t.moves, t.label, false, true
FROM _beginner_target t
JOIN _beginner_case c ON c.case_number = t.case_number
WHERE NOT EXISTS (
  SELECT 1 FROM public.algorithms a
  WHERE a.case_id = c.id
    AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves)
)
ORDER BY t.case_number, t.sort_rank;

UPDATE public.algorithms a
SET is_main = true
FROM _beginner_target t
JOIN _beginner_case c ON c.case_number = t.case_number
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
  SELECT count(*) INTO n_cases FROM _beginner_case c
  JOIN _beginner_case_src s ON s.case_number = c.case_number;

  SELECT count(*) INTO bad_main FROM (
    SELECT c.id FROM _beginner_case c
    JOIN _beginner_case_src s ON s.case_number = c.case_number
    LEFT JOIN public.algorithms a ON a.case_id = c.id AND a.is_main
    GROUP BY c.id HAVING count(a.id) <> 1
  ) x;

  SELECT count(*) INTO missing FROM _beginner_target t
  JOIN _beginner_case c ON c.case_number = t.case_number
  WHERE NOT EXISTS (
    SELECT 1 FROM public.algorithms a
    WHERE a.case_id = c.id
      AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves)
  );

  IF n_cases <> 6 OR bad_main <> 0 OR missing <> 0 THEN
    RAISE EXCEPTION '222/beginner check failed: % of 6 cases, % case(s) without exactly one main, % alg(s) missing',
      n_cases, bad_main, missing;
  END IF;
END $$;

COMMIT;

-- ── Verify afterwards (read-only) ──────────────────────────────────────────
-- SELECT c.case_number, c.name, c.description, a.is_main, a.label, a.moves
-- FROM public.algorithm_cases c
-- JOIN public.algorithms a ON a.case_id = c.id
-- WHERE c.puzzle_type = '222' AND c.subset = 'beginner'
-- ORDER BY c.case_number, a.is_main DESC, a.move_count;
