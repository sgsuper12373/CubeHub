# Home (`/home`)

What shipped. The plan, with the reasoning, is `docs/home-plan.md`; the judgement calls are in
`docs/decisions.md` → Home.

## Who sees what

| Visitor | Detected by | Default cards (main · right rail) |
| --- | --- | --- |
| Guest, first visit | no session, no local solves | Start here, Continue learning, Playground, Cubby's tip · What's new |
| Guest, returning | no session, local solves | Daily scramble, Your stats, Streak, Continue learning, Cubby's tip · What's new |
| Member, new | session, under 20 solves | Start here, Continue learning, Drill queue, Cubby's tip · Friends, Clubs, What's new |
| Member | session, 20+ solves | Daily scramble, Your stats, Continue learning, Drill queue, Next achievement, Cubby's tip · Friends, Clubs, What's new |

The greeting and quick start row (Start session, Drill due cases, Continue a series) is always
there. `Enter` presses its first button; `Space` belongs to the timer only. The card sets live in
`src/lib/home/cards.ts` (`DEFAULT_CARDS`), unit-tested in `tests/unit/home-cards.test.ts`.

## Cards

| Card | Source | Notes |
| --- | --- | --- |
| Start here | `welcome-card.tsx` | Three steps that tick from real data; hides itself for good when done |
| Daily scramble | `components/daily/daily-card.tsx` | Client card; hidden when there's no daily. See `timer.md` → Daily scramble |
| Your stats | `stats-card.tsx` | Read in the browser through the timer's repository, like `/stats` |
| Streak and daily goal | `streak-card.tsx` | Goal is per device (`cubehub.home.dailyGoal`) |
| Continue learning | `learning-card.tsx` | The series with the most cases learned that isn't finished |
| Drill queue | `drill-card.tsx` | Due count, slowest cases, a switch suggestion |
| Next achievement | `achievement-card.tsx` | The unearned badge you're closest to (`lib/home/next-achievement.ts`) |
| Cubby's tip | `tip-card.tsx` | One tip a day from `src/content/cubby-tips.json`, dismissible for the day |
| Playground | `static-cards.tsx` | For first-time guests |
| Friends activity, Your clubs | `social-cards.tsx` | Signed in only; server cards in their own Suspense |
| What's new | `whats-new-card.tsx` | From `src/content/changelog.json`; dismissals per device |

## Customizing

The Customize sheet switches cards on and off and resets to the default. A layout is
`{ hidden, shown }`:
- **Guests:** stored in `cubehub.home.v1`.
- **Members:** stored in `user_settings.home_layout`.
- **On first sign-in:** a guest's layout is copied to the account once.

Unknown card ids are dropped on read, so removing a card never breaks anyone's Home.
Drag-to-reorder (`order`) is reserved but not built yet.

## Tests

- **Unit:** `home-cards`, `home-content`, `home-daily-goal`, `home-drill-queue`,
  `home-snapshot`, `next-achievement`, `daily-scramble`.
- **E2E:** `tests/e2e/home.spec.ts` (guest first visit, Enter/Space, guest and member layouts
  surviving a reload, signed-in `/login` → `/home`) and `daily-scramble.spec.ts`.
