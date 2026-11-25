# Home plan: `app.cuberhub.me/home`

> **Status:** all seven steps done (Nov 24–25, 2026). What shipped is in `docs/home.md` · Sumit Garad
> **For:** Claude Code. Read `AGENTS.md`, `docs/architecture.md` and `docs/app-shell-plan.md` first.
> Home is the first page of the new app shell, so the shell's steps 1–6 come before step 3 below.
> **Related:** `docs/app-shell-plan.md` (sidebar and hosts), `docs/cubby-cubing-companion.md` (Cubby's
> card and tour), `docs/stats-plan.md`, `docs/timer.md`.

## Summary

`/home` is the app's front door, modelled on chess.com's member home: one click to start practising,
then a few cards that show what to do next and what friends are up to. It replaces `/timer` as the
place users land after sign-in and when they open `app.cuberhub.me`.

The page stays **short and calm**. chess.com's redesigned home drew complaints for being crowded with
features people didn't use, so Home ships with a small default set and lets users add or hide cards,
not the other way round.

**Done when:** `/home` renders for guests, new users and returning users with the right cards for each,
the quick-start button gets a solve going in one click, every card has a real data source and an empty
state, and the layout can be customised and is remembered.

## Who sees what

| Visitor | Detected by | Home shows |
| --- | --- | --- |
| Guest, first visit | No session, no local solves | Welcome card ("Start here"), quick start, Learn and Playground cards, gentle "Sign in to sync" |
| Guest, returning | No session, local solves exist (`cubehub.timer.v1`) | Quick start, stats snapshot from local data, streak, Learn, sign-in nudge |
| Signed in, new (under 20 solves) | Session, solve count | Welcome card with 3 setup steps, quick start, Learn, Drill intro, Cubby tip |
| Signed in, regular | Session | Full default layout (below) |

The welcome card's setup steps: pick your main puzzle, time 5 solves, learn your first PLL. Each ticks
off from real data. When all three are done the card hides itself for good. Later, Cubby's first-visit
onboarding (companion spec) replaces this card.

## Layout

```
┌ sidebar ┬──────────────────────────────────────────────┬──────────────┐
│ (shell) │ Greeting row: "Good evening, Sumit" · streak │              │
│         │ Quick start: [Start 3x3 session] [Drill 6]   │  Friends     │
│         │              [Continue PLL]                  │  activity    │
│         ├──────────────────────┬───────────────────────┤              │
│         │ Daily scramble       │ Your stats            │  Your clubs  │
│         ├──────────────────────┼───────────────────────┤              │
│         │ Continue learning    │ Drill queue           │  What's new  │
│         ├──────────────────────┴───────────────────────┤              │
│         │ Cubby's tip (one line)                       │              │
└─────────┴──────────────────────────────────────────────┴──────────────┘
```

- **Main column:** max width 880 px, a 2-column card grid from `lg`, 1 column below.
- **Right rail:** 300 px, from `xl` only. Below `xl` its cards join the end of the main column.
- **Phones:** single column. A slim top bar holds the avatar and notifications bell (app shell spec, section 6).
- **Cards:** use the existing `components/ui/card.tsx`, theme tokens only, 16 px gap, no shadows beyond
  what `card` already has. Every card has a title row with an optional "See all" link to its page.
- Each card carries `data-tour="home-<card-id>"` for Cubby's Home tour.

## Rendering and data

- Route: `src/app/(app)/home/page.tsx`. Components in `src/components/home/`, one file per card.
- `(app)/layout.tsx` reads cookies, so the page is dynamic. The page itself fetches nothing slow: each
  signed-in card is an async server component in its own `<Suspense>` with a skeleton, so one slow query
  never holds up the page.
- Guest data (local solves, goals, streak) is read on the client from the same repository the timer
  uses (`src/lib/timer/repo-local.ts`). Server components render a skeleton; a client child fills it.
- Read data through the existing DALs, which are wrapped in React `cache()`. Add new reads to the
  matching DAL file, never query Supabase from a component.
- No cubing.js on initial load. The daily scramble's cube preview loads lazily through
  `lib/cubing/runtime.ts` when the card is visible.
- Target: the quick-start row is interactive within 1 second on a mid-range phone; the full page
  settles within 2 seconds.

## Cards

Phase tags: **v1** ships with Home for the beta, **v1.1** right after, **later** when its feature exists.

### 1. Greeting and quick start (v1, always on, not removable)

- Greeting by time of day and first name or username. Guests: "Welcome to CuberHub".
- Streak chip: current practice streak in days, using `practiceStreaks()` from
  `src/lib/timer/practice-stats.ts`. Hidden at 0.
- Three buttons, in this order:
  1. **Start {puzzle} session** — primary. Goes to `/timer` with the last-used puzzle and session
     (`cubehub-default-session` / session store). Label reads e.g. "Start 3x3 session".
  2. **Drill {n} due cases** — shown when the drill queue has due cases; otherwise "Open Drill Lab".
  3. **Continue {series}** — the Learn series with the most recent progress; otherwise "Start learning".
- Keyboard: when no input is focused, `Enter` triggers the primary button. Not Space: Space belongs to
  the timer only.

### 2. Daily scramble (v1.1, new feature)

The CuberHub version of chess.com's daily puzzle: everyone gets the same 3x3 scramble each day.

- **Card:** today's date, the scramble text, a small 2D cube net preview, "412 cuberhubbers solved it",
  your result if done, and the top 3 times. Button: **Solve today's scramble**.
- **Flow:** `/timer?daily=2026-12-05` opens the timer in daily mode: the scramble is fixed, WCA inspection
  is on, one attempt counts (with +2 / DNF), and the result posts once. A banner shows it's the daily.
  Leaving daily mode restores the normal session.
- **Day boundary:** midnight IST (Asia/Kolkata), matching the India-first audience. Show "new scramble in
  4h 12m" on the card.
- **Data** (new migration):

  ```sql
  create table public.daily_scrambles (
    day        date primary key,          -- IST date
    puzzle     public.puzzle_type not null default '333',
    scramble   text not null,
    created_at timestamptz not null default now()
  );

  create table public.daily_results (
    day        date references public.daily_scrambles(day) on delete cascade,
    user_id    uuid references public.profiles(id) on delete cascade,
    time_ms    integer,                    -- null for DNF
    penalty    text not null default 'none' check (penalty in ('none','plus2','dnf')),
    created_at timestamptz not null default now(),
    primary key (day, user_id)
  );
  ```

  RLS: anyone can read both; a signed-in user can insert only their own row, once (the primary key
  stops repeats); no updates or deletes from clients. Reuse the solve sanity limits from
  `20261019000000_solve_sanity.sql` for the time.
- **Generating the scramble:** a server action creates today's row on the first request of the day with
  `insert … on conflict do nothing`, using the same random-state scrambler the timer uses. If generating
  on the server is awkward because cubing.js runs in the browser, pre-generate 60 days at a time with a
  script into `supabase/DataSeeds/` instead. Decide during implementation and note it in `docs/decisions.md`.
- **Guests** can solve it; their result shows on the card but isn't posted. The card says "Sign in to
  get on the leaderboard".
- **Leaderboard:** top 10 for the day and your rank, on a small `/home/daily` page (or a dialog). Only
  times with no penalty, plus +2 times with the penalty applied, are ranked.
- **Later:** daily streaks, a share card through the existing `src/lib/timer/share-card.ts`, 2x2 and
  OH dailies.

### 3. Your stats (v1)

- PB single, current Ao5 and Ao12 for the main puzzle, and a 30-solve trend sparkline using
  `spreadTrend()` from `practice-stats.ts`.
- "This week: 214 solves across 5 days".
- Signed in: server data (`getPbProgression` and the stats sources in `docs/stats-plan.md`). Guests: local.
- Links: the card opens `/stats`.
- Empty: "Time your first 5 solves to see averages here" with a Start button.

### 4. Continue learning (v1)

- The series with the most recent activity, with progress ("PLL · 14 of 21 learned") and the next
  unlearned case with its small diagram (`src/lib/learn/case-diagram.ts`).
- Source: the `LearningProgress` data behind profiles (`src/lib/profile/dal.ts`). Add a
  `getLearningProgress()` reader there if no standalone one exists.
- Empty: "Start with PLL: 21 cases, the biggest jump for most cubers" linking to the 3x3 PLL series.

### 5. Drill queue (v1)

- Count of due cases and the three slowest, each with its average recognition-plus-execution time.
- Source: `getDrillData()` and the ordering in `src/lib/drill/order.ts` / `case-state.ts`.
- If `src/lib/drill/recommend.ts` suggests switching a case's main algorithm, show one line:
  "Your alt alg for Ua is 0.2 s faster. Switch?" linking to the case.
- Empty: "Add cases from Learn to start drilling."

### 6. Streak and daily goal (v1)

- Daily solve goal (default 25, editable inline) with a progress ring. Stored with the existing goal
  storage (`src/lib/timer/goal-storage.ts`) or a new `home.dailyGoal` field if that one is per-puzzle
  time goals only. Check before building.
- Streak calendar strip: last 14 days, filled for practice days.
- Copy is never guilt-based ("You missed yesterday!" is banned; companion spec rule).

### 7. Cubby's tip (v1 static, v1.5 rule-based)

- v1: one line from a static tips pool (`src/content/cubby-tips.json`), rotated daily, e.g. "Hold
  the cube the same way every inspection; it makes recognition faster."
- v1.5: a rule-based insight from the companion spec ("Your +2 rate went up this week").
- Dismissible for the day. Hidden when Cubby is set to Off.
- Until the companion's art exists, show the CH mark in place of Cubby's face.

### 8. Friends activity (v1, signed in, right rail)

- The last five items from `getActivityFeed("following", 7)` in `src/lib/social/dal.ts`: PBs,
  achievements, new clubs joined.
- Empty: "Follow cubers to see their PBs here" linking to `/people?tab=find`, plus two suggestions from
  `getSuggestions()`.

### 9. Your clubs (v1, signed in, right rail)

- Your clubs with unread post counts, and the newest post's first line. From `src/lib/clubs/dal.ts`.
- Empty: "Join your college club" linking to `/clubs`.

### 10. What's new (v1, right rail)

- The latest one or two items from a changelog file (`src/content/changelog.json`: date, title, one line,
  link). Dismiss hides an item for that user.
- The same file can feed a `/roadmap` "Shipped" list on the marketing site (landing spec).

### 11. Next achievement (v1.1)

- The closest unearned badge with a progress bar ("Sub-15 Ao12: 14.92, 0.08 to go"). From
  `getAchievements()` and `src/lib/profile/achievements.ts`.

### 12. Upcoming competitions (later)

- When the competition calendar exists: the next three WCA comps in India, nearest state first.

### 13. Race a friend / Compete (later)

- When Compete exists: "Race {friend}" for online friends and a "Play a bot" button, like chess.com's
  "Play" card. Goes in the quick-start row as a fourth button.

## Customising Home

- **v1:** a "Customize" button (top right of the greeting row) opens a sheet listing cards 2–11 with
  on/off switches and "Reset to default". The greeting row can't be hidden.
- **v1.1:** drag to reorder in the same sheet. `react-grid-layout` is already a dependency (the timer's
  panel grid uses it), but a simple vertical sortable list is enough here; don't make Home a free grid.
- **Storage:** signed in, a new `user_settings.home_layout jsonb` column (`{ "hidden": ["daily"], "order": [...] }`),
  added by migration with default `null` meaning "use the default". Guests: localStorage
  `cubehub.home.v1`. On sign-in, a guest's layout is copied up if the account has none.
- Unknown card ids in saved layouts are ignored, so removing a card later never breaks anyone's Home.

**Default set for a regular signed-in user:** greeting, daily scramble, stats, continue learning, drill
queue, Cubby's tip, friends, clubs, what's new. Off by default: streak and goal, next achievement.

## Routing changes

- `app.cuberhub.me/` → 307 `/home` (app shell spec).
- After sign-in, `/auth/callback` and the `(auth)` layout send users to `/home`, not `/timer`, unless a
  `next` parameter says otherwise.
- The landing page's **Open app** button goes to `appUrl("/home")`; **Start timing** still goes straight
  to `appUrl("/timer")`. Timing stays zero-friction (roadmap principle: a new user times within five
  seconds of landing).
- The sidebar logo links to `/home`.

## Analytics

Track card use with `track()` from `@vercel/analytics` (already installed; it only runs on Vercel):
`home_card_click { card, action }`, `home_customize { hidden, shown }`, `daily_attempt { result }`.
These feed the Home review after the beta: cards nobody clicks get cut or moved down.

## Accessibility

- One `h1` (the greeting, visually styled as such), each card's title an `h2`.
- Progress rings and sparklines have text equivalents ("14 of 21 learned", "Ao12 trend: improving").
- All card actions are real links or buttons with names; no click handlers on bare divs.
- Respect `prefers-reduced-motion` for any count-up or ring animation.

## Implementation order

1. ✅ Page skeleton, routing to `/home`, greeting and quick start, guest and signed-in variants.
2. ✅ Stats, Continue learning, Drill queue, Streak and goal cards.
3. ✅ Friends, Clubs, What's new, Cubby's tip (static).
4. ✅ Customise sheet with show/hide, storage, sign-in copy-up. *(`home_layout` migration applied Nov 25)*
5. ✅ Daily scramble: migration, generation, daily mode in the timer, card, leaderboard. *(scrambles pre-generated into DataSeeds; see decisions.md)*
6. ✅ Next achievement, drag reorder. *(reorder in the Customize sheet: handle or up/down buttons)*
7. ✅ Docs: `architecture.md` routes, `roadmap.md`, a short `docs/home.md` describing what shipped.

## Tests

**Unit:** visitor-state detection; default layout merge with saved layouts (unknown ids ignored);
quick-start labels; IST day boundary for the daily scramble; daily result validation.

**E2E:**

- Guest with no data sees the welcome card and can start the timer in one click.
- Signed-in user lands on `/home` after login.
- Hiding a card persists across reloads, for guests and signed-in users.
- Daily scramble: solve once, result shows, a second attempt isn't posted; a guest's result isn't posted.
- `Enter` on Home starts a session; Space does nothing on Home.

## Open questions

1. Is the daily scramble 3x3 only for the beta? (Suggested: yes.)
2. Should the daily leaderboard be India-only, global, or both tabs? (Suggested: global for now, India tab
   with the national rankings feature.)
3. Daily goal: solves per day, or minutes per day? (Suggested: solves, simpler to explain.)
