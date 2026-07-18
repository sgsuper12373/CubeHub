# Database

Postgres via Supabase. **The live Supabase project is the authoritative schema.** Earlier design documents proposed a different, simpler schema; where they disagree, live wins.

Verified against the live project on 2026-07-18 via the read-only Supabase MCP (tables, columns, enums, policies, function bodies, triggers, indexes). The baseline migration in `supabase/migrations/` was generated from the same introspection.

## Design rules

These hold regardless of the details below and are the parts worth internalising.

**RLS is enabled on every table in `public`, and an event trigger enforces it.** The `ensure_rls` event trigger runs `rls_auto_enable()` on `CREATE TABLE` (also `CREATE TABLE AS` / `SELECT INTO`) and enables RLS, so a new table is secure-by-default — and invisible until you write a policy. If a new table "returns nothing", that's why.

**Penalties are computed in the database, never in application code.** `solves.effective_time_ms` is a generated column: `NULL` for DNF, `time_ms + 2000` for +2, else `time_ms`. Always read it; never re-derive +2/DNF in TypeScript or the two will disagree.

**Some tables are readable but not client-writable.** `profiles`, `personal_bests`, `elo_ratings`, `elo_history`, `matches`, `match_games`, `user_achievements`, `subscriptions` and `notifications` have no INSERT policy — they're written by triggers or by server-side code holding the service-role key. `profiles` rows in particular are created only by the `handle_new_user()` signup trigger, which is why signup works without any client insert.

**`(SELECT auth.uid())`, not bare `auth.uid()`, in policies.** The subquery form is cached once per statement instead of re-evaluated per row. Every existing policy uses it; match that.

**Generated columns are used deliberately** — `solves.effective_time_ms`, `algorithms.move_count`, `elo_history.delta`. Don't shadow them with application-side calculations.

## Tables by domain

| Domain | Tables |
|---|---|
| Identity | `profiles`, `user_settings`, `user_follows`, `subscriptions` |
| Timer | `sessions`, `solves`, `personal_bests` |
| Learn | `algorithm_cases`, `algorithms`, `tutorial_series`, `tutorial_steps`, `user_algorithm_bookmarks`, `user_tutorial_progress` |
| Compete | `matches`, `match_games`, `elo_ratings`, `elo_history` |
| Social | `clubs`, `club_members`, `club_join_requests`, `notifications` |
| Commerce | `products` |
| Meta | `achievements`, `user_achievements` |

Views: `v_session_solves`, `v_user_puzzle_summary` — both `security_invoker='on'`, so they respect the caller's RLS rather than the definer's. Keep new views that way unless you specifically need to bypass RLS.

### Enum types

| Type | Values |
|---|---|
| `puzzle_type` | `333` `222` `444` `555` `666` `777` `mega` `pyra` `sq1` `clock` `skewb` `333bf` `333oh` `444bf` `555bf` `333mbf` |
| `penalty_type` | `none` `plus2` `dnf` |
| `scramble_type` | `random_state` `random_moves` `custom` `imported` |
| `inspection_type` | `none` `wca_15s` `custom` |
| `difficulty_level` | `beginner` `intermediate` `advanced` `expert` |
| `match_format` | `bo1` `bo3` `bo5` |
| `match_outcome` | `win` `loss` `draw` `abandoned` |
| `match_status` | `pending` `in_progress` `completed` `cancelled` |
| `club_role` | `member` `moderator` `admin` `owner` |
| `notification_type` | `match_invite` `match_result` `club_invite` `club_request` `achievement_unlocked` `pb_broken` `follow` `system` |
| `sub_status` | `active` `trialing` `past_due` `canceled` `expired` |

`access_tier` is **designed but not yet created** — see `access-control.md`.

## RLS patterns

Three shapes, used consistently. New policies should fit one of them.

**1. Owner-scoped.** `FOR ALL` with both `USING` and `WITH CHECK` on `(SELECT auth.uid()) = user_id`. Used by `solves`, `sessions`, `user_settings`, `user_algorithm_bookmarks`, `user_tutorial_progress`, `club_join_requests`. `notifications` and `user_follows` are the deliberate near-misses: owner-scoped per-command policies with no INSERT for `notifications` (rows are created server-side), and follower-scoped INSERT/DELETE with public SELECT for `user_follows`.

**2. Public read behind a flag.** `USING (is_active)` on `products`, `USING (is_approved)` on `algorithms`, `USING (is_published)` on `tutorial_series` and `tutorial_steps`. `profiles`, `achievements`, `user_achievements`, `personal_bests`, `elo_ratings`, `elo_history`, `algorithm_cases` and `user_follows` are `USING (true)`.

This is the pattern the access tiers extend — the flag check gains an `AND can_access(...)`.

**3. Participation-scoped.** `EXISTS` against a join. `matches` on `player1_id`/`player2_id`; `match_games` via the parent match; `clubs` on `is_public OR EXISTS(member)`; club updates restricted to admin/owner. Clubs also allow client INSERT (`created_by` must be the caller) and self-service join/leave on `club_members`.

## Functions and triggers

| Function | Fires | Does |
|---|---|---|
| `handle_new_user()` | `AFTER INSERT ON auth.users` | Creates the `profiles` row (username `user_<12 hex>`, display name from OAuth `full_name`/`name` falling back to the email local-part, avatar from OAuth metadata) **and** the `user_settings` row. `SECURITY DEFINER`, `search_path = ''`. |
| `maintain_single_pb()` | `AFTER INSERT ON solves` | Upserts the `single` personal best when the new solve beats it. Skips DNFs. |
| `set_updated_at()` | `BEFORE UPDATE`, 9 tables | Timestamp maintenance on `profiles`, `user_settings`, `subscriptions`, `sessions`, `solves`, `personal_bests`, `tutorial_series`, `tutorial_steps`, `clubs`. |
| `update_club_member_count()` | `AFTER INSERT/DELETE ON club_members` | Maintains the denormalised counter. |
| `is_premium(profiles)` | — | `premium_until IS NOT NULL AND premium_until > now()`. The entitlement source of truth. |
| `rls_auto_enable()` | `ensure_rls` event trigger on `CREATE TABLE` | Enables RLS on new `public` tables. |

## Indexing

Notable choices worth preserving: a partial index on `solves(puzzle_type, effective_time_ms) WHERE penalty <> 'dnf'` for leaderboards; a partial index on unread notifications; a GIN trigram index on `algorithms.moves` for algorithm search; partial index on `matches` restricted to open statuses.

Three partial/expression **unique** indexes encode invariants: `uq_profiles_username_lower` (usernames unique case-insensitively), `uq_one_active_session` (one active session per user + puzzle), `uq_one_main_alg_per_case` (one `is_main` algorithm per case).

## Known gaps

Things the schema does not yet support, each blocking specific roadmap work.

**Only `single` personal bests are maintained.** `personal_bests.category` permits `ao5` `ao12` `ao50` `ao100` `mean3`, but `maintain_single_pb()` writes only `single`. Nothing computes the averages. *Blocks Phase 2.*

**No spaced-repetition storage.** `user_algorithm_bookmarks` has only `learned boolean` — no attempt counts, success counts, or next-review scheduling. *Blocks drill mode in Phase 3.*

**No `access_tier`, no `algorithm_subsets`.** The whole tiered-content model in `access-control.md` is unbuilt, and `algorithm_cases.subset` is unconstrained free text. *Blocks paid content.*

**No `profiles.state`.** *Blocks state-level leaderboards in Phase 5.*

**`products` is minimal.** No magnetic flag, skill level, community score, release year, tags, or per-retailer URLs; no `sponsors` table at all. *Blocks Phase 4.*

**Migration history starts at the baseline.** `supabase/migrations/20260718000000_baseline.sql` is a `public`-only baseline generated from live on 2026-07-18; the historical dump (which mixed in `auth`/`storage`/`realtime` system schemas) is superseded and should not be replayed. The live project has no migration history recorded, so if you link it with the Supabase CLI, run `supabase migration repair --status applied 20260718000000` before pushing anything new. Note the Supabase MCP is configured read-only — future migrations (including the access-tier work, which changes policies deciding who reads paid content) are applied deliberately via the dashboard SQL editor or the CLI, not through an agent.

**Undocumented surface.** `clubs`, `club_members`, `club_join_requests`, `user_follows`, `notifications`, `subscriptions`, `match_games` and `elo_history` exist in the database but appear in no product plan. Either they're intended and unplanned, or they're speculative and should be dropped.
