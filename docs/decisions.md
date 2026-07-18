# Decisions

Choices already made and why. Append as new ones land; don't silently reverse an entry — replace it and say what changed.

## Access & routing

**Route groups for chrome, RLS for access.** These are separate concerns and use separate mechanisms. Access is a property of the data row, not the URL — `/learn/3x3/beginner` (public) and `/learn/3x3/coll` (premium) are the same dynamic route, so no folder arrangement can gate them. Full reasoning in `access-control.md`.

**`proxy.ts` refreshes the session and does not gate routes.** Gating lives in layouts (for whole pages) and RLS (for data). One place per concern; two places that both gate would drift.

**`/timer`, `/learn`, `/compete` and `/shop` are public routes.** The timer is specified to work logged-out with a localStorage fallback, tutorials drive organic traffic, and bot mode is meant to work without an account. Only `/settings` requires sign-in today.

**Premium content is visible but locked, not hidden.** Non-entitled users see the course/subset card and, for algorithms, the case and its 3D cube — they just can't read the payload. Hidden content converts nobody and isn't indexable. Cost: metadata and body need separate policies.

**`algorithm_subsets` as a real table, not an `access_tier` column on `algorithm_cases`.** `subset` is unconstrained text today, so `"COLL"`, `"coll"` and `"Coll"` are three different subsets. Tolerable for free content, unacceptable once a string decides who gets charged. The table also gives each subset a stable slug for URLs and a single row to price.

**`getUser()`, not `getSession()`.** `getUser()` revalidates the token with Supabase; `getSession()` trusts the cookie. Wrapped in React `cache()` so the extra round trip happens at most once per render pass.

## Stack

**Next.js 16, not the planned 15.** Brings breaking changes — `middleware.ts` is now `proxy.ts` — hence the standing `AGENTS.md` rule to read `node_modules/next/dist/docs/` before writing Next code.

**Tailwind v4.** No `tailwind.config` file; theme tokens live in `globals.css`. `components.json` carries `"config": ""` as a result.

**shadcn `base-nova` style on Base UI**, rather than stock shadcn on Radix. Consequence: primitives have Base UI's API, e.g. `Button` as a link needs `nativeButton={false}` with `render={<Link/>}`.

**Supabase for everything** — Postgres, Auth, Realtime, Storage. One vendor, generous free tier, and Realtime removes the need for separate WebSocket infrastructure when the competitive tab is built.

## Auth

**Email/password and Google OAuth. GitHub deferred.** Two providers were enough to validate the flow; GitHub is additive whenever it's wanted.

**Email confirmation is ON.**

**Separate `/login` and `/signup` pages** rather than one combined form. Clearer intent, simpler validation, better for linking users straight to the right action.

**Usernames are auto-assigned by the signup trigger** as `user_<12 hex>`. A picker during onboarding is still pending — see `roadmap.md`.

## Data

**The live Supabase project is the authoritative schema.** Earlier design documents proposed a different, simpler schema that the live database has long since diverged from. Where they disagree, live wins. `database.md` documents live.

**Progress rows survive a lapsed subscription.** Downgrading revokes read access to content, not the user's history. Don't delete progress on expiry.

## Product

**Bots before live matchmaking.** Bot opponents work with zero other users online, which solves the cold-start problem; real-time matchmaking is worth nothing until there's a population to match against.

## Open

**ELO starting rating: 1000 or 800?** The live database defaults `elo_ratings.rating` to **1000**. The planned tier bands (Scrambled <900, Beginner 900–1100, Intermediate 1100–1300, …) are anchored to a start of **800**, which would place every new user in the middle of "Beginner" instead of at the bottom. One of the two has to move before the competitive tab ships. Not resolved.
