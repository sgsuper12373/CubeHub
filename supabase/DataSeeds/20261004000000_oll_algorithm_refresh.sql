-- 20261004000000_oll_algorithm_refresh.sql
--
-- Refreshes the 333 OLL algorithm set, the same way 20261003000000 did PLL:
-- up to 5 algorithms per case (most cases end up with 4 — that is every
-- distinct algorithm SpeedCubeDB lists once AUF-only and uncancelled-move
-- variants are merged), ordered by SpeedCubeDB ranking, with the top one
-- marked is_main. Written for a database that ALREADY holds the seeded OLL
-- algorithms (20260730000000_seed_learn_content.sql):
--
--   * existing rows are matched on (case, normalised moves) and updated in
--     place, so their ids — and the drill_attempts / drill_state /
--     user_algorithm_bookmarks rows that cascade from them — survive;
--   * only algorithms not already present are inserted;
--   * safe to run twice: a second run changes nothing.
--
-- Every algorithm below was machine-checked with cubing.js: from its case it
-- leaves F2L solved and the last layer oriented (up to pre-AUF), and it solves
-- no other OLL case. Case numbering was cross-checked against SpeedCubeDB.
--
-- The main algorithm changes for cases 2, 11, 13, 15, 17, 18, 21, 22, 23, 28, 43, 47, 52, 55
-- (SpeedCubeDB's top-ranked alg differs from the seeded one). The old main stays as an alternative.
--
-- Seed defects repaired:
--   1. OLL 26 and 27 alternates were typos that do not solve their case
--      ("R U' R' U' R U' R'", "R U R' U R U' R'" — a U2 became U'/U).
--      Each is rewritten to the algorithm it was clearly meant to be, which
--      makes it a duplicate of the main; step 2 then merges it, keeping any
--      drill history and bookmarks.
--   2. cube_state for OLL 9, 49 and 50 was not an OLL state (F2L broken), and
--      OLL 37's showed OLL 33. Replaced with the inverse of the case's main
--      algorithm — only where the column still holds the seeded value.
--
-- Algorithms outside the list (e.g. user submissions) are not touched apart
-- from losing is_main.
--
-- Apply via the Supabase Dashboard SQL editor (MCP is read-only).
-- After applying with the CLI: supabase migration repair --status applied 20261004000000

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.norm_alg(m text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(replace(btrim(m), '2''', '2'), '\s+', ' ', 'g')
$$;

-- ── 0. Target list ─────────────────────────────────────────────────────────
CREATE TEMP TABLE _oll_target (
  case_number integer NOT NULL,
  sort_rank   integer NOT NULL,   -- 1 = main
  moves       text    NOT NULL,
  label       text    NOT NULL
) ON COMMIT DROP;

INSERT INTO _oll_target (case_number, sort_rank, moves, label) VALUES
  ( 1, 1, 'R U2 R2 F R F'' U2 R'' F R F''', 'Most popular'),
  ( 1, 2, 'U R U'' R2 D'' r U'' r'' D R2 U R''', 'RUDr'),
  ( 1, 3, 'f R U R'' U'' R f'' U'' r'' U'' R U M''', 'RUrfM'),
  ( 1, 4, 'L'' U2 L2 F'' L'' F U2 L F'' L'' F', 'Left-hand (UFL)'),
  ( 2, 1, 'f U R U'' R'' S'' U R U'' R'' F''', 'Most popular'),
  ( 2, 2, 'F R U R'' U'' F'' f R U R'' U'' f''', 'RUFf'),
  ( 2, 3, 'U'' R U'' R2 D'' r U r'' D R2 U R''', 'RUDr'),
  ( 2, 4, 'U r U r'' U2 R U2 R'' U2 r U'' r''', 'RUr'),
  ( 3, 1, 'f R U R'' U'' f'' U'' F R U R'' U'' F''', 'Most popular'),
  ( 3, 2, 'U R'' F2 R2 U2 R'' F R U2 R2 F2 R', 'RUF'),
  ( 3, 3, 'r'' R2 U R'' U r U2 r'' U M''', 'RUrM'),
  ( 3, 4, 'M R U R'' U r U2 r'' U M''', 'RUrM'),
  ( 4, 1, 'f R U R'' U'' f'' U F R U R'' U'' F''', 'Most popular'),
  ( 4, 2, 'U'' R'' F2 R2 U2 R'' F'' R U2 R2 F2 R', 'RUF'),
  ( 4, 3, 'R'' F R F'' U'' S R'' U'' R U R S''', 'RUFS'),
  ( 4, 4, 'U F U R U'' R'' F'' U'' F R U R'' U'' F''', 'RUF'),
  ( 5, 1, 'r'' U2 R U R'' U r', 'Most popular'),
  ( 5, 2, 'U2 l'' U2 L U L'' U l', 'Left-hand (ULl)'),
  ( 5, 3, 'U2 R'' F2 r U r'' F R', 'RUFr'),
  ( 5, 4, 'U2 R'' F2 L F L'' F R', 'RUFL'),
  ( 6, 1, 'r U2 R'' U'' R U'' r''', 'Most popular'),
  ( 6, 2, 'F U'' R2 D R'' U'' R D'' R2 U F''', 'RUFD'),
  ( 6, 3, 'U2 l U2 L'' U'' L U'' l''', 'Left-hand (ULl)'),
  ( 6, 4, 'U'' x'' D R2 U'' R'' U R'' D'' x', 'RUD'),
  ( 7, 1, 'r U R'' U R U2 r''', 'Most popular'),
  ( 7, 2, 'S'' R U R'' U R U2 R'' U S', 'RUS'),
  ( 7, 3, 'L'' U2 L U2 L F'' L'' F', 'Left-hand (UFL)'),
  ( 7, 4, 'U2 l U L'' U L U2 l''', 'Left-hand (ULl)'),
  ( 8, 1, 'r'' U'' R U'' R'' U2 r', 'Most popular'),
  ( 8, 2, 'l'' U'' L U'' L'' U2 l', 'Left-hand (ULl)'),
  ( 8, 3, 'R U2 R'' U2 R'' F R F''', 'RUF'),
  ( 8, 4, 'R'' F'' r U'' r'' F2 R', 'RUFr'),
  ( 9, 1, 'R U R'' U'' R'' F R2 U R'' U'' F''', 'Most popular'),
  ( 9, 2, 'R U2 R'' U'' S'' R U'' R'' S', 'RUS'),
  ( 9, 3, 'U2 F'' U'' F r U'' r'' U r U r''', 'UFr'),
  ( 9, 4, 'U'' L'' U'' L U'' L F'' L'' F L'' U2 L', 'Left-hand (UFL)'),
  (10, 1, 'R U R'' U R'' F R F'' R U2 R''', 'Most popular'),
  (10, 2, 'U F U F'' R'' F R U'' R'' F'' R', 'RUF'),
  (10, 3, 'U M'' R'' U2 R U R'' U R U M', 'RUM'),
  (10, 4, 'U2 L'' U'' L U L F'' L2 U'' L U F', 'Left-hand (UFL)'),
  (11, 1, 'M R U R'' U R U2 R'' U M''', 'Most popular'),
  (11, 2, 'r U R'' U R'' F R F'' R U2 r''', 'RUFr'),
  (11, 3, 'r'' R2 U R'' U R U2 R'' U M''', 'RUrM'),
  (11, 4, 'S R U R'' U R U2 R'' U2 S''', 'RUS'),
  (12, 1, 'M'' R'' U'' R U'' R'' U2 R U'' R r''', 'Most popular'),
  (12, 2, 'F R U R'' U'' F'' U F R U R'' U'' F''', 'RUF'),
  (12, 3, 'U'' S R'' U'' R U'' R'' U2 R U2 S''', 'RUS'),
  (12, 4, 'U M L'' U'' L U'' L'' U2 L U'' M''', 'Left-hand (ULM)'),
  (13, 1, 'r U'' r'' U'' r U r'' F'' U F', 'Most popular'),
  (13, 2, 'F U R U2 R'' U'' R U R'' F''', 'RUF'),
  (13, 3, 'F U R U'' R2 F'' R U R U'' R''', 'RUF'),
  (13, 4, 'U2 f R U R2 U'' R'' U R U'' f''', 'RUf'),
  (14, 1, 'R'' F R U R'' F'' R F U'' F''', 'Most popular'),
  (14, 2, 'r U R'' U'' r'' F R2 U R'' U'' F''', 'RUFr'),
  (14, 3, 'l'' U l U l'' U'' l F U'' F''', 'UFl'),
  (14, 4, 'F'' U'' L'' U L2 F L'' U'' L'' U L', 'Left-hand (UFL)'),
  (15, 1, 'r'' U'' M'' U'' R U r'' U r', 'Most popular'),
  (15, 2, 'l'' U'' l L'' U'' L U l'' U l', 'Left-hand (ULl)'),
  (15, 3, 'U2 R'' F'' R L'' U'' L U R'' F R', 'RUFL'),
  (16, 1, 'r U r'' R U R'' U'' r U'' r''', 'Most popular'),
  (16, 2, 'U2 R'' F R U R'' U'' F'' R U'' R'' U2 R', 'RUF'),
  (16, 3, 'U2 l U M'' U L'' U'' l U'' l''', 'Left-hand (ULlM)'),
  (17, 1, 'R U R'' U R'' F R F'' U2 R'' F R F''', 'Most popular'),
  (17, 2, 'F R'' F'' R2 r'' U R U'' R'' U'' M''', 'RUFrM'),
  (17, 3, 'U2 F R'' F'' R U S'' R U'' R'' S', 'RUFS'),
  (17, 4, 'U'' F'' r U r'' U'' S r'' F r S''', 'UFrS'),
  (18, 1, 'U R U2 R2 F R F'' U2 M'' U R U'' r''', 'Most popular'),
  (18, 2, 'r U R'' U R U2 r2 U'' R U'' R'' U2 r', 'RUr'),
  (18, 3, 'U F S'' R U'' R'' S R U2 R'' U'' F''', 'RUFS'),
  (18, 4, 'R D r'' U'' r D'' R'' U'' R2 F R F'' R', 'RUFDr'),
  (19, 1, 'r'' R U R U R'' U'' M'' R'' F R F''', 'Most popular'),
  (19, 2, 'U S'' R U R'' S U'' R'' F R F''', 'RUFS'),
  (19, 3, 'R'' U2 F R U R'' U'' F2 U2 F R', 'RUF'),
  (19, 4, 'M U R U R'' U'' r R2 F R F''', 'RUFrM'),
  (20, 1, 'r U R'' U'' M2 U R U'' R'' U'' M''', 'Most popular'),
  (20, 2, 'M'' U2 M U2 M'' U M U2 M'' U2 M', 'UM'),
  (20, 3, 'S'' R U R'' S U'' M'' U R U'' r''', 'RUrMS'),
  (20, 4, 'S R'' U'' R U R U R U'' R'' S''', 'RUS'),
  (21, 1, 'R U R'' U R U'' R'' U R U2 R''', 'Most popular'),
  (21, 2, 'R U2 R'' U'' R U R'' U'' R U'' R''', 'RU'),
  (21, 3, 'U F R U R'' U'' R U R'' U'' R U R'' U'' F''', 'RUF'),
  (21, 4, 'R'' U'' R U'' R'' U R U'' R'' U2 R', 'RU'),
  (22, 1, 'R'' U2 R2 U R2 U R2 U2 R''', 'Most popular'),
  (22, 2, 'R U2 R2 U'' R2 U'' R2 U2 R', 'RU'),
  (22, 3, 'f R U R'' U'' S'' R U R'' U'' F''', 'RUFfS'),
  (23, 1, 'R2 D R'' U2 R D'' R'' U2 R''', 'Most popular'),
  (23, 2, 'R2 D'' R U2 R'' D R U2 R', 'RUD'),
  (23, 3, 'R U R'' U R U2 R2 U'' R U'' R'' U2 R', 'RU'),
  (23, 4, 'U R U R'' U'' R U'' R'' U2 R U'' R'' U2 R U R''', 'RU'),
  (24, 1, 'r U R'' U'' r'' F R F''', 'Most popular'),
  (24, 2, 'U2 R'' F'' r U R U'' r'' F', 'RUFr'),
  (24, 3, 'U'' l U R'' D R U'' R'' D'' x', 'RUDl'),
  (24, 4, 'U R U R D R'' U'' R D'' R2', 'RUD'),
  (25, 1, 'F'' r U R'' U'' r'' F R', 'Most popular'),
  (25, 2, 'R U2 R D R'' U2 R D'' R2', 'RUD'),
  (25, 3, 'F R'' F'' r U R U'' r''', 'RUFr'),
  (25, 4, 'l'' U R D'' R'' U'' R D x''', 'RUDl'),
  (26, 1, 'R U2 R'' U'' R U'' R''', 'Most popular'),
  (26, 2, 'R'' U'' R U'' R'' U2 R', 'RU'),
  (26, 3, 'U2 L'' U'' L U'' L'' U2 L', 'Left-hand (UL)'),
  (26, 4, 'U2 L'' U R U'' L U R''', 'RUL'),
  (27, 1, 'R U R'' U R U2 R''', 'Most popular'),
  (27, 2, 'U'' R'' U2 R U R'' U R', 'RU'),
  (27, 3, 'U L'' U2 L U L'' U L', 'Left-hand (UL)'),
  (27, 4, 'U2 L U L'' U L U2 L''', 'Left-hand (UL)'),
  (28, 1, 'r U R'' U'' M U R U'' R''', 'Most popular'),
  (28, 2, 'M U M'' U2 M U M''', 'UM'),
  (28, 3, 'R'' F R S R'' F'' R S''', 'RFS'),
  (28, 4, 'U2 M'' U M U2 M'' U M', 'UM'),
  (29, 1, 'R U R'' U'' R U'' R'' F'' U'' F R U R''', 'Most popular'),
  (29, 2, 'r2 D'' r U r'' D r2 U'' r'' U'' r', 'UDr'),
  (29, 3, 'U S'' R U R'' U'' R'' F R F'' U S', 'RUFS'),
  (29, 4, 'M U R U R'' U'' R'' F R F'' M''', 'RUFM'),
  (30, 1, 'F U R U2 R'' U'' R U2 R'' U'' F''', 'Most popular'),
  (30, 2, 'U'' r'' D'' r U'' r'' D r2 U'' r'' U r U r''', 'UDr'),
  (30, 3, 'U2 F R'' F R2 U'' R'' U'' R U R'' F2', 'RUF'),
  (30, 4, 'U S'' R'' U'' R f R'' U R U'' F''', 'RUFfS'),
  (31, 1, 'R'' U'' F U R U'' R'' F'' R', 'Most popular'),
  (31, 2, 'U2 S'' L'' U'' L U L F'' L'' f', 'Left-hand (UFLfS)'),
  (31, 3, 'U S R U R'' U'' f'' U'' F', 'RUFfS'),
  (31, 4, 'U'' F R'' F'' R U R U R'' U'' R U'' R''', 'RUF'),
  (32, 1, 'S R U R'' U'' R'' F R f''', 'Most popular'),
  (32, 2, 'U2 L U F'' U'' L'' U L F L''', 'Left-hand (UFL)'),
  (32, 3, 'R U B'' U'' R'' U R B R''', 'RUB'),
  (32, 4, 'U'' R'' F R F'' U'' r U'' r'' U r U r''', 'RUFr'),
  (33, 1, 'R U R'' U'' R'' F R F''', 'Most popular'),
  (33, 2, 'U2 L'' U'' L U L F'' L'' F', 'Left-hand (UFL)'),
  (33, 3, 'U2 r'' F'' r U r U'' r'' F', 'UFr'),
  (33, 4, 'R U R'' F'' U'' F R U'' R''', 'RUF'),
  (34, 1, 'R U R2 U'' R'' F R U R U'' F''', 'Most popular'),
  (34, 2, 'U f R f'' U'' r'' U'' R U M''', 'RUrfM'),
  (34, 3, 'F R U R'' U'' R'' F'' r U R U'' r''', 'RUFr'),
  (34, 4, 'U2 R U R'' U'' B'' R'' F R F'' B', 'RUFB'),
  (35, 1, 'R U2 R2 F R F'' R U2 R''', 'Most popular'),
  (35, 2, 'f R U R'' U'' f'' R U R'' U R U2 R''', 'RUf'),
  (35, 3, 'R U2 R'' d'' R'' F R U'' R'' F'' R', 'RUFd'),
  (35, 4, 'U L'' U2 L2 F'' L'' F L'' U2 L', 'Left-hand (UFL)'),
  (36, 1, 'L'' U'' L U'' L'' U L U L F'' L'' F', 'Most popular'),
  (36, 2, 'U R U R2 F'' U'' F U R2 U2 R''', 'RUF'),
  (36, 3, 'U2 R U R'' F'' R U R'' U'' R'' F R U'' R'' F R F''', 'RUF'),
  (36, 4, 'U2 R'' F'' U'' F2 U R U'' R'' F'' R', 'RUF'),
  (37, 1, 'F R U'' R'' U'' R U R'' F''', 'Most popular'),
  (37, 2, 'F R'' F'' R U R U'' R''', 'RUF'),
  (37, 3, 'U F'' r U r'' U'' r'' F r', 'UFr'),
  (37, 4, 'U2 r2 D'' r U'' r'' D r U r', 'UDr'),
  (38, 1, 'R U R'' U R U'' R'' U'' R'' F R F''', 'Most popular'),
  (38, 2, 'U F R U'' R'' S U'' R U R'' f''', 'RUFfS'),
  (38, 3, 'r U R'' U'' r'' F R U R U'' R'' F''', 'RUFr'),
  (38, 4, 'U2 L U L'' U L U'' L'' U'' L'' B L B''', 'Left-hand (ULB)'),
  (39, 1, 'L F'' L'' U'' L U F U'' L''', 'Most popular'),
  (39, 2, 'U'' f'' r U r'' U'' r'' F r S', 'UFrfS'),
  (39, 3, 'U'' R U R'' F'' U'' F U R U2 R''', 'RUF'),
  (39, 4, 'U'' f'' L F L'' U'' L'' U L S', 'Left-hand (UFLfS)'),
  (40, 1, 'R'' F R U R'' U'' F'' U R', 'Most popular'),
  (40, 2, 'U'' f R'' F'' R U R U'' R'' S''', 'RUFfS'),
  (40, 3, 'R r D r'' U r D'' r'' U'' R''', 'RUDr'),
  (40, 4, 'U'' L'' U'' L F U F'' U'' L'' U2 L', 'Left-hand (UFL)'),
  (41, 1, 'R U R'' U R U2 R'' F R U R'' U'' F''', 'Most popular'),
  (41, 2, 'U2 F U R2 D R'' U'' R D'' R2 F''', 'RUFD'),
  (41, 3, 'U'' S U'' R'' F'' U'' F U R S''', 'RUFS'),
  (41, 4, 'M U'' F'' L'' U'' L U F M''', 'Left-hand (UFLM)'),
  (42, 1, 'R'' U'' R U'' R'' U2 R F R U R'' U'' F''', 'Most popular'),
  (42, 2, 'U F S'' R U R'' U'' F'' U S', 'RUFS'),
  (42, 3, 'U R'' F R F'' R'' F R F'' R U R'' U'' R U R''', 'RUF'),
  (42, 4, 'U F R'' F'' R U2 R'' U'' R2 U'' R2 U2 R', 'RUF'),
  (43, 1, 'U R'' U'' F'' U F R', 'Most popular'),
  (43, 2, 'f'' L'' U'' L U f', 'Left-hand (ULf)'),
  (43, 3, 'U2 F'' U'' L'' U L F', 'Left-hand (UFL)'),
  (43, 4, 'B'' U'' R'' U R B', 'RUB'),
  (44, 1, 'f R U R'' U'' f''', 'Most popular'),
  (44, 2, 'U2 F U R U'' R'' F''', 'RUF'),
  (44, 3, 'U R U B U'' B'' R''', 'RUB'),
  (44, 4, 'U'' L U F U'' F'' L''', 'Left-hand (UFL)'),
  (45, 1, 'F R U R'' U'' F''', 'Most popular'),
  (45, 2, 'U R'' F'' U'' F U R', 'RUF'),
  (45, 3, 'U2 f U R U'' R'' f''', 'RUf'),
  (45, 4, 'U2 F'' L'' U'' L U F', 'Left-hand (UFL)'),
  (46, 1, 'R'' U'' R'' F R F'' U R', 'Most popular'),
  (46, 2, 'R'' F'' U'' F R U'' R'' U2 R', 'RUF'),
  (46, 3, 'U F R U R'' U'' F'' U'' R U R'' U R U2 R''', 'RUF'),
  (46, 4, 'l'' U2 L2 F'' L'' F U L'' U l', 'Left-hand (UFLl)'),
  (47, 1, 'F'' L'' U'' L U L'' U'' L U F', 'Most popular'),
  (47, 2, 'R'' U'' R'' F R F'' R'' F R F'' U R', 'RUF'),
  (47, 3, 'U'' F R'' F'' R U2 R U'' R'' U R U2 R''', 'RUF'),
  (47, 4, 'U'' R'' F'' U'' F U F'' U'' F U R', 'RUF'),
  (48, 1, 'F R U R'' U'' R U R'' U'' F''', 'Most popular'),
  (48, 2, 'U2 f U R U'' R'' U R U'' R'' f''', 'RUf'),
  (48, 3, 'R U2 R'' U'' R U R'' U2 R'' F R F''', 'RUF'),
  (48, 4, 'F R'' F'' U2 R U R'' U R2 U2 R''', 'RUF'),
  (49, 1, 'r U'' r2 U r2 U r2 U'' r', 'Most popular'),
  (49, 2, 'l U'' l2 U l2 U l2 U'' l', 'Ul'),
  (49, 3, 'R B'' R2 F R2 B R2 F'' R', 'RFB'),
  (49, 4, 'U2 R'' F R'' F'' R2 U2 B'' R B R''', 'RUFB'),
  (50, 1, 'r'' U r2 U'' r2 U'' r2 U r''', 'Most popular'),
  (50, 2, 'U2 R'' F R2 B'' R2 F'' R2 B R''', 'RUFB'),
  (50, 3, 'U'' R U2 R'' U'' R U'' R'' F R U R'' U'' F''', 'RUF'),
  (50, 4, 'U2 l'' U l2 U'' l2 U'' l2 U l''', 'Ul'),
  (51, 1, 'f R U R'' U'' R U R'' U'' f''', 'Most popular'),
  (51, 2, 'U2 F U R U'' R'' U R U'' R'' F''', 'RUF'),
  (51, 3, 'U'' R'' U'' R'' F R F'' R U'' R'' U2 R', 'RUF'),
  (51, 4, 'U r'' F'' U'' F U F'' U'' F U r', 'UFr'),
  (52, 1, 'F R U R'' d R'' U'' R U'' R''', 'Most popular'),
  (52, 2, 'R U R'' U R U'' y R U'' R'' F''', 'RUF'),
  (52, 3, 'U2 R'' F'' U'' F U'' R U R'' U R', 'RUF'),
  (52, 4, 'R U R'' U R U'' B U'' B'' R''', 'RUB'),
  (53, 1, 'r'' U2 R U R'' U'' R U R'' U r', 'Most popular'),
  (53, 2, 'r'' U'' R U'' R'' U R U'' R'' U2 r', 'RUr'),
  (53, 3, 'U2 l'' U'' L U'' L'' U L U'' L'' U2 l', 'Left-hand (ULl)'),
  (53, 4, 'U'' l'' U2 L U L'' U'' L U L'' U l', 'Left-hand (ULl)'),
  (54, 1, 'r U2 R'' U'' R U R'' U'' R U'' r''', 'Most popular'),
  (54, 2, 'r U R'' U R U'' R'' U R U2 r''', 'RUr'),
  (54, 3, 'U'' r U M U R'' U'' R U R'' U'' r U'' r''', 'RUrM'),
  (54, 4, 'U2 l U L'' U L U'' L'' U L U2 l''', 'Left-hand (ULl)'),
  (55, 1, 'R U2 R2 U'' R U'' R'' U2 F R F''', 'Most popular'),
  (55, 2, 'R'' F R U R U'' R2 F'' R2 U'' R'' U R U R''', 'RUF'),
  (55, 3, 'U R'' F U R U'' R2 F'' R2 U R'' U'' R', 'RUF'),
  (55, 4, 'r U2 R2 F R F'' U2 r'' F R F''', 'RUFr'),
  (56, 1, 'r U r'' U R U'' R'' U R U'' R'' r U'' r''', 'Most popular'),
  (56, 2, 'r U r'' U R U'' R'' M'' U R U2 r''', 'RUrM'),
  (56, 3, 'F R U R'' U'' R F'' r U R'' U'' r''', 'RUFr'),
  (56, 4, 'r'' U'' r U'' R'' U R U'' R'' U M U r', 'RUrM'),
  (57, 1, 'R U R'' U'' M'' U R U'' r''', 'Most popular'),
  (57, 2, 'U R U'' R'' S'' R U R'' S', 'RUS'),
  (57, 3, 'U R U R'' S'' R U'' R'' S', 'RUS');

DO $$
BEGIN
  IF (SELECT count(*) FROM public.algorithm_cases
      WHERE puzzle_type = '333' AND subset = 'oll'
        AND case_number BETWEEN 1 AND 57) <> 57 THEN
    RAISE EXCEPTION 'Expected 57 OLL cases (333/oll, case_number 1..57) — aborting';
  END IF;
END $$;

CREATE TEMP TABLE _oll_case ON COMMIT DROP AS
SELECT id, case_number FROM public.algorithm_cases
WHERE puzzle_type = '333' AND subset = 'oll';

-- ── 1. Seed repairs ────────────────────────────────────────────────────────
-- 1a. OLL 26 / 27 typo'd alternates → the intended algorithm.
UPDATE public.algorithms a
SET moves = 'R U2 R'' U'' R U'' R'''
FROM _oll_case c
WHERE a.case_id = c.id AND c.case_number = 26
  AND pg_temp.norm_alg(a.moves) = 'R U'' R'' U'' R U'' R''';

UPDATE public.algorithms a
SET moves = 'R U R'' U R U2 R'''
FROM _oll_case c
WHERE a.case_id = c.id AND c.case_number = 27
  AND pg_temp.norm_alg(a.moves) = 'R U R'' U R U'' R''';

-- 1b. cube_state values that are wrong (only if still the seed value).
UPDATE public.algorithm_cases SET cube_state = 'F U R U'' R2 F'' R U R U'' R'''
WHERE puzzle_type = '333' AND subset = 'oll' AND case_number = 9
  AND cube_state = 'F U R U'' R2 F'' R U R'' U'' R''';

UPDATE public.algorithm_cases SET cube_state = 'F R U'' R'' U R U R'' F'''
WHERE puzzle_type = '333' AND subset = 'oll' AND case_number = 37
  AND cube_state = 'F R U'' R'' U'' R U R'' F''';

UPDATE public.algorithm_cases SET cube_state = 'r'' U r2 U'' r2 U'' r2 U r'''
WHERE puzzle_type = '333' AND subset = 'oll' AND case_number = 49
  AND cube_state = 'r'' U r2 U'' r2 U'' r2 U r';

UPDATE public.algorithm_cases SET cube_state = 'r U'' r2 U r2 U r2 U'' r'
WHERE puzzle_type = '333' AND subset = 'oll' AND case_number = 50
  AND cube_state = 'r U'' r2 U r2 U r2 U'' r''';

-- ── 2. Merge duplicate algorithms within a case ────────────────────────────
CREATE TEMP TABLE _oll_dup ON COMMIT DROP AS
SELECT id, keeper FROM (
  SELECT a.id,
         first_value(a.id) OVER (
           PARTITION BY a.case_id, pg_temp.norm_alg(a.moves)
           ORDER BY a.is_main DESC, a.created_at, a.id
         ) AS keeper
  FROM public.algorithms a
  JOIN _oll_case c ON c.id = a.case_id
) s
WHERE id <> keeper;

UPDATE public.drill_attempts d
SET algorithm_id = x.keeper
FROM _oll_dup x
WHERE d.algorithm_id = x.id;

INSERT INTO public.user_algorithm_bookmarks (user_id, algorithm_id, learned, created_at)
SELECT b.user_id, x.keeper, bool_or(b.learned), min(b.created_at)
FROM public.user_algorithm_bookmarks b
JOIN _oll_dup x ON x.id = b.algorithm_id
GROUP BY b.user_id, x.keeper
ON CONFLICT (user_id, algorithm_id) DO UPDATE
  SET learned = public.user_algorithm_bookmarks.learned OR EXCLUDED.learned;

DELETE FROM public.algorithms WHERE id IN (SELECT id FROM _oll_dup);

-- ── 3. Clear every OLL main (uq_one_main_alg_per_case allows only one) ─────
UPDATE public.algorithms a
SET is_main = false
FROM _oll_case c
WHERE a.case_id = c.id AND a.is_main;

-- ── 4. Update algorithms that already exist ────────────────────────────────
UPDATE public.algorithms a
SET label = t.label,
    is_approved = true
FROM _oll_target t
JOIN _oll_case c ON c.case_number = t.case_number
WHERE a.case_id = c.id
  AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves);

-- ── 5. Insert the ones that don't ──────────────────────────────────────────
INSERT INTO public.algorithms (case_id, moves, label, is_main, is_approved)
SELECT c.id, t.moves, t.label, false, true
FROM _oll_target t
JOIN _oll_case c ON c.case_number = t.case_number
WHERE NOT EXISTS (
  SELECT 1 FROM public.algorithms a
  WHERE a.case_id = c.id
    AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves)
)
ORDER BY t.case_number, t.sort_rank;

-- ── 6. Set the new mains ───────────────────────────────────────────────────
UPDATE public.algorithms a
SET is_main = true
FROM _oll_target t
JOIN _oll_case c ON c.case_number = t.case_number
WHERE t.sort_rank = 1
  AND a.case_id = c.id
  AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves);

-- ── 7. Assert the end state, or roll everything back ───────────────────────
DO $$
DECLARE
  bad_main integer;
  missing  integer;
BEGIN
  SELECT count(*) INTO bad_main FROM (
    SELECT c.id FROM _oll_case c
    LEFT JOIN public.algorithms a ON a.case_id = c.id AND a.is_main
    GROUP BY c.id HAVING count(a.id) <> 1
  ) s;

  SELECT count(*) INTO missing FROM _oll_target t
  JOIN _oll_case c ON c.case_number = t.case_number
  WHERE NOT EXISTS (
    SELECT 1 FROM public.algorithms a
    WHERE a.case_id = c.id
      AND pg_temp.norm_alg(a.moves) = pg_temp.norm_alg(t.moves)
  );

  IF bad_main <> 0 OR missing <> 0 THEN
    RAISE EXCEPTION 'OLL refresh check failed: % case(s) without exactly one main, % target alg(s) missing',
      bad_main, missing;
  END IF;
END $$;

COMMIT;

-- ── Verify afterwards (read-only) ──────────────────────────────────────────
-- SELECT c.case_number, c.description, a.is_main, a.label, a.moves, a.move_count
-- FROM public.algorithm_cases c
-- JOIN public.algorithms a ON a.case_id = c.id
-- WHERE c.puzzle_type = '333' AND c.subset = 'oll'
-- ORDER BY c.case_number, a.is_main DESC, a.move_count;
