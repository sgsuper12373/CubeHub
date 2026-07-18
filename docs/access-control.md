# Access control

How CubeHub decides who can read what. Read this before adding any gated or paid content.

## The one rule

**RLS in Postgres is the only real enforcement.**

A layout `redirect()` protects a *page*. It does nothing for a `select` on `tutorial_steps`. Supabase exposes every table over REST with the anon key that ships in the browser bundle, so content gated only in the UI or in a layout can be read with one `curl`. Route gates and UI locks are UX; Postgres is the boundary.

## Two separate concerns

These get confused constantly. They are not the same thing and they use different mechanisms.

| Concern | Boundary | Mechanism | Example |
|---|---|---|---|
| **Chrome** — which nav/shell a page gets | Static, per route subtree | Route groups | `/login` has no navbar |
| **Access** — who may read a row | Dynamic, per data row | `access_tier` + RLS | COLL algs are premium |

Chrome is a property of the URL, so route groups fit. Access is a property of the *data*, so route groups cannot express it:

```
/learn/3x3/beginner   → public
/learn/3x3/cfop       → login required
/learn/3x3/coll       → premium
```

Those are one dynamic route, `/learn/[puzzle]/[series]`. Next.js resolves the folder before it knows which series was requested. No arrangement of `(public)`/`(premium)` folders can gate them.

### Which gate to use

> **Route gate** (`src/app/(app)/(protected)/layout.tsx`) when the entire page is meaningless logged out — `/settings`, later `/profile/edit`.
>
> **Data gate** (RLS) when the page is public but some rows aren't — `/learn`, `/shop`, `/compete`.
>
> Never use a route gate for content. Never rely on a route gate for paid content.

`/timer`, `/learn`, `/compete` and `/shop` are **public routes**. The timer has a localStorage fallback for logged-out users; tutorials are meant to be shareable and indexable. Only `/settings` is wholly private today.

## The tier model

```sql
CREATE TYPE public.access_tier AS ENUM ('public', 'free', 'premium');
```

| Tier | Who |
|---|---|
| `public` | Anyone, logged out included |
| `free` | Any authenticated user |
| `premium` | Active subscription (`profiles.premium_until > now()`) |

The tier lives on the two content-grouping tables:

- `tutorial_series.access_tier` — prose courses
- `algorithm_subsets.access_tier` — algorithm sets (OLL, PLL, COLL, Winter Variation…)

Both are needed. Tutorials and algorithm sets are two separate content systems: "3x3 Beginner" is a `tutorial_series`, but COLL is a value of `algorithm_cases.subset`.

### Entitlement helper

```sql
CREATE FUNCTION public.can_access(tier public.access_tier) RETURNS boolean
  LANGUAGE sql STABLE SET search_path TO '' AS $$
  SELECT CASE tier
    WHEN 'public'  THEN true
    WHEN 'free'    THEN (SELECT auth.uid()) IS NOT NULL
    WHEN 'premium' THEN EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.premium_until IS NOT NULL
        AND p.premium_until > now())
  END;
$$;
```

`STABLE` so Postgres evaluates it once per statement rather than once per row. The `(SELECT auth.uid())` wrapping is the same initplan-caching idiom used by every existing policy — keep it.

`premium_until` is the single source of truth for entitlement, matching the existing `is_premium()`. Billing writes it; RLS reads it.

## Visible but locked

Gated content stays **discoverable**. Users see that COLL exists and what it costs — that is what drives upgrades, and it keeps the pages indexable. Only the payload is withheld.

RLS is row-level, not column-level, so the split runs along the *table* boundary. The schema already divides the right way:

| Table | Policy | A locked user sees |
|---|---|---|
| `tutorial_series` | `USING (is_published)` | Course card: title, description, thumbnail, tier |
| `tutorial_steps` | `USING (is_published AND EXISTS(parent series published AND can_access(tier)))` | **Nothing** — lesson bodies hidden |
| `algorithm_subsets` | `USING (is_published)` | "COLL — 42 cases — Premium" |
| `algorithm_cases` | `USING (true)` | The case, its name, its `cube_state` — **the 3D cube still renders** |
| `algorithms` | `USING (is_approved AND EXISTS(parent case's subset can_access))` | **Not `moves`** — the algorithm itself is withheld |

That last row is the paywall, and it falls on a good seam: the case renders in 3D, you just can't see the algorithm that solves it.

**Consequence to remember:** lesson/case *counts* for a locked course cannot come from `tutorial_steps`, which is hidden. Use a `security_definer` view or a denormalised counter column.

## Progress tracking

`user_tutorial_progress(user_id, step_id, completed_at)` — per-step, owner-scoped `FOR ALL` policy. Percentage complete is a count against the series' published steps:

```sql
CREATE VIEW public.v_user_series_progress WITH (security_invoker='on') AS
SELECT p.user_id, s.series_id, count(*) AS completed_steps
FROM public.user_tutorial_progress p
JOIN public.tutorial_steps s ON s.id = p.step_id
GROUP BY p.user_id, s.series_id;
```

**Progress survives a lapsed subscription.** Rows are owner-scoped and never deleted on downgrade — the user loses read access to content, not their history. Don't "clean up" progress rows when a subscription expires.

Algorithm-side progress is thinner: `user_algorithm_bookmarks` has only `learned boolean`, with no spaced-repetition scheduling. See `database.md` → Known gaps.

## Adding gated content later

This is the scalability test. Adding a new paid algorithm set:

```sql
INSERT INTO public.algorithm_subsets (puzzle_type, slug, name, access_tier, is_published)
VALUES ('333', 'ollcp', 'OLLCP', 'premium', true);
```

then insert its cases. **No route changes, no policy changes, no redeploy.** Same for a new course — insert a `tutorial_series` row with the tier you want.

If adding content ever requires touching a route or a policy, the model has been broken. Fix the model, not the route.

## Verifying the paywall

Run this against a **premium** subset whenever policies change:

```bash
curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/algorithms?select=moves&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

- anonymous → `[]`
- authenticated, no subscription → `[]`
- `premium_until > now()` → rows

If it ever returns `moves` to anonymous, the paywall is off regardless of what the UI shows.

## Status

The tier model on this page is **designed, not yet applied.** `access_tier`, `algorithm_subsets`, `can_access()` and the policies above land with the Learn feature. The route-level split in Part 2 is live today.
