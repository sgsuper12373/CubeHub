-- =============================================================================
-- 20260914000000_access_tiers.sql
--
-- Implements the access-control model from docs/access-control.md.
-- Apply via the Supabase Dashboard SQL editor (MCP is read-only).
-- After applying with the CLI: supabase migration repair --status applied 20260914000000
-- =============================================================================

-- 1. Access-tier enum
-- Three tiers: public (anyone), free (any authed user), premium (active subscription)
CREATE TYPE public.access_tier AS ENUM ('public', 'free', 'premium');

-- 2. algorithm_subsets — gives each algorithm subset (OLL, PLL, COLL…) a real
--    row with a stable slug, a display name, and its own access tier.
--    Replaces the unconstrained text on algorithm_cases.subset.
CREATE TABLE public.algorithm_subsets (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_type  public.puzzle_type NOT NULL,
  slug         text        NOT NULL,   -- 'oll', 'pll', 'coll' — always lowercase
  name         text        NOT NULL,   -- 'OLL', 'PLL', 'COLL' — display label
  description  text,
  access_tier  public.access_tier NOT NULL DEFAULT 'public',
  is_published boolean     NOT NULL DEFAULT true,
  order_index  integer     NOT NULL DEFAULT 0,
  UNIQUE (puzzle_type, slug)
);

ALTER TABLE public.algorithm_subsets ENABLE ROW LEVEL SECURITY;

-- Public read: any published subset is visible to everyone (the tier column
-- decides whether the algorithm *moves* are readable — see algorithms policy).
CREATE POLICY alg_subsets_public_read ON public.algorithm_subsets
  FOR SELECT USING (is_published);

-- Admin write policies (is_admin() was created in 20260814210434)
CREATE POLICY alg_subsets_admin_insert ON public.algorithm_subsets
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY alg_subsets_admin_update ON public.algorithm_subsets
  FOR UPDATE USING (public.is_admin());
CREATE POLICY alg_subsets_admin_delete ON public.algorithm_subsets
  FOR DELETE USING (public.is_admin());

-- 3. Add access_tier to tutorial_series so courses can be tiered independently.
ALTER TABLE public.tutorial_series
  ADD COLUMN access_tier public.access_tier NOT NULL DEFAULT 'public';

-- 4. can_access() — the single entitlement helper used by all gating policies.
--    STABLE so Postgres evaluates it once per statement, not once per row.
--    search_path = '' guards against schema-injection in SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.can_access(tier public.access_tier)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT CASE tier
    WHEN 'public'  THEN true
    WHEN 'free'    THEN (SELECT auth.uid()) IS NOT NULL
    WHEN 'premium' THEN EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.premium_until IS NOT NULL
        AND p.premium_until > now()
    )
  END;
$$;

-- 5. Seed algorithm_subsets from existing distinct (puzzle_type, subset) pairs.
--    Sets OLL and PLL to 'free' (login required, per founder decision 2026-09-14).
--    All others default to 'public'.
INSERT INTO public.algorithm_subsets (puzzle_type, slug, name, access_tier, order_index)
SELECT DISTINCT
  puzzle_type::public.puzzle_type,
  lower(subset)                              AS slug,
  upper(subset)                              AS name,
  CASE lower(subset)
    WHEN 'oll' THEN 'free'::public.access_tier
    WHEN 'pll' THEN 'free'::public.access_tier
    ELSE            'public'::public.access_tier
  END                                        AS access_tier,
  ROW_NUMBER() OVER (
    PARTITION BY puzzle_type ORDER BY lower(subset)
  )::integer - 1                             AS order_index
FROM public.algorithm_cases
WHERE subset IS NOT NULL AND subset <> ''
ON CONFLICT (puzzle_type, slug) DO NOTHING;

-- 6. Normalise all existing subset values to lowercase so they match the slugs.
UPDATE public.algorithm_cases
SET subset = lower(subset)
WHERE subset IS NOT NULL AND subset <> lower(subset);

-- =============================================================================
-- Verification (run after applying):
--
--   SELECT * FROM public.algorithm_subsets ORDER BY puzzle_type, order_index;
--   SELECT DISTINCT subset FROM public.algorithm_cases ORDER BY subset;
--   SELECT public.can_access('public'::public.access_tier);   -- should be true
--   SELECT public.can_access('free'::public.access_tier);     -- true if authed
-- =============================================================================
