-- 20261017000000_oll_shape_categories.sql
--
-- Rewrites the 57 333 OLL case descriptions as "Group · note", so the
-- category chips appear on /learn/333/oll. caseCategory()
-- (src/lib/learn/case-category.ts) reads the text before " · ", and the chips
-- only show when EVERY case in the set has a category.
--
-- The 15 groups are the standard OLL shape groups. Each group was checked
-- against the case's own main algorithm with cubing.js (edges and corners
-- oriented on top), which also corrected the old descriptions:
--   * 9 and 10 ("Kite") are Fish; 28 ("Arrow") and 57 ("Line") are the two
--     cases with all corners oriented;
--   * 21 is H and 22 is Pi (21 was labelled Pi);
--   * 19 was "Diagonal", but its two oriented corners are adjacent.
--
-- The note after " · " is a nickname when it starts with a capital letter
-- ("Sune", "Kite"), and otherwise a plain fact about the case: "mirror of
-- OLL n", "symmetric", "all corners oriented". The case pages use the
-- nickname in their title and fall back to the group. Every note is
-- re-checked in tests/unit/oll-categories.test.ts.
--
-- Only rows whose description is still the original seeded value (or
-- already the new one) are changed: a description edited in the admin
-- editor is left alone and listed by the check at the end. Safe to run
-- twice: the second run changes nothing.
--
-- This is a seed, not a migration: there is no `migration repair` entry.
-- Apply via the Supabase Dashboard SQL editor (MCP is read-only).

BEGIN;

CREATE TEMP TABLE _oll_desc (
  case_number integer PRIMARY KEY,
  seeded      text    NOT NULL,   -- from 20260730000000_seed_learn_content.sql
  target      text    NOT NULL
) ON COMMIT DROP;

INSERT INTO _oll_desc (case_number, seeded, target) VALUES
  ( 1, 'Dot, Run', 'Dot · Run'),
  ( 2, 'Dot, Zamboni', 'Dot · Zamboni'),
  ( 3, 'Dot, Anti-Frying Pan', 'Dot · Anti-Frying Pan'),
  ( 4, 'Dot, Frying Pan', 'Dot · Frying Pan'),
  ( 5, 'Square shape', 'Square · mirror of OLL 6'),
  ( 6, 'Square shape', 'Square · mirror of OLL 5'),
  ( 7, 'Lightning, Wide', 'Small Lightning · wide, mirror of OLL 8'),
  ( 8, 'Lightning, Wide', 'Small Lightning · wide, mirror of OLL 7'),
  ( 9, 'Kite', 'Fish · Kite'),
  (10, 'Kite', 'Fish · mirror of OLL 9'),
  (11, 'Lightning', 'Small Lightning · mirror of OLL 12'),
  (12, 'Lightning', 'Small Lightning · mirror of OLL 11'),
  (13, 'Knight', 'Knight Move · mirror of OLL 14'),
  (14, 'Knight', 'Knight Move · mirror of OLL 13'),
  (15, 'Knight', 'Knight Move · mirror of OLL 16'),
  (16, 'Knight', 'Knight Move · mirror of OLL 15'),
  (17, 'Dot, Diagonal', 'Dot · two diagonal corners oriented'),
  (18, 'Dot', 'Dot · two adjacent corners oriented'),
  (19, 'Dot, Diagonal', 'Dot · two adjacent corners oriented'),
  (20, 'Dot', 'Dot · all corners oriented'),
  (21, 'Cross, Pi', 'OCLL · H'),
  (22, 'Cross, Wheel', 'OCLL · Pi'),
  (23, 'Cross, Headlights', 'OCLL · Headlights'),
  (24, 'Cross, Chameleon', 'OCLL · Chameleon'),
  (25, 'Cross, Bowtie', 'OCLL · Bowtie'),
  (26, 'Cross, Anti-Sune', 'OCLL · Anti-Sune'),
  (27, 'Cross, Sune', 'OCLL · Sune'),
  (28, 'Arrow', 'Corners Oriented · Arrow'),
  (29, 'Awkward', 'Awkward · mirror of OLL 30'),
  (30, 'Awkward', 'Awkward · mirror of OLL 29'),
  (31, 'P shape', 'P · mirror of OLL 32'),
  (32, 'P shape', 'P · mirror of OLL 31'),
  (33, 'T shape', 'T · symmetric'),
  (34, 'C shape', 'C · symmetric'),
  (35, 'Fish', 'Fish · symmetric'),
  (36, 'W shape', 'W · mirror of OLL 38'),
  (37, 'Fish', 'Fish · symmetric'),
  (38, 'W shape', 'W · mirror of OLL 36'),
  (39, 'Big Lightning', 'Big Lightning · mirror of OLL 40'),
  (40, 'Big Lightning', 'Big Lightning · mirror of OLL 39'),
  (41, 'Awkward', 'Awkward · mirror of OLL 42'),
  (42, 'Awkward', 'Awkward · mirror of OLL 41'),
  (43, 'P shape', 'P · mirror of OLL 44'),
  (44, 'P shape', 'P · mirror of OLL 43'),
  (45, 'T shape', 'T · symmetric'),
  (46, 'C shape', 'C · symmetric'),
  (47, 'Small L', 'Small L · mirror of OLL 48'),
  (48, 'Small L', 'Small L · mirror of OLL 47'),
  (49, 'Small L', 'Small L · mirror of OLL 50'),
  (50, 'Small L', 'Small L · mirror of OLL 49'),
  (51, 'Line', 'Line · symmetric'),
  (52, 'Line', 'Line · symmetric'),
  (53, 'Small L', 'Small L · mirror of OLL 54'),
  (54, 'Small L', 'Small L · mirror of OLL 53'),
  (55, 'Line', 'Line · symmetric'),
  (56, 'Line', 'Line · symmetric'),
  (57, 'Line', 'Corners Oriented · opposite edges oriented');

UPDATE public.algorithm_cases c
   SET description = d.target
  FROM _oll_desc d
 WHERE c.puzzle_type = '333'
   AND c.subset = 'oll'
   AND c.case_number = d.case_number
   AND c.description IS DISTINCT FROM d.target
   AND c.description = d.seeded;

-- ── Check (one result, since the SQL editor shows only the last) ──────────
-- Expect 15 rows whose `cases` add up to 57 and whose `left_alone` is empty.
-- A case in `left_alone` had its description edited by hand, so it was not
-- changed and shows under its edited text's category.
SELECT split_part(c.description, ' · ', 1) AS category,
       count(*)                            AS cases,
       string_agg(c.case_number::text, ', ' ORDER BY c.case_number)
         FILTER (WHERE c.description IS DISTINCT FROM d.target) AS left_alone
  FROM public.algorithm_cases c
  JOIN _oll_desc d USING (case_number)
 WHERE c.puzzle_type = '333' AND c.subset = 'oll'
 GROUP BY 1
 ORDER BY min(c.case_number);

COMMIT;
