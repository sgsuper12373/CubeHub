# To-do (Claude's list)

Work Claude can pick up without the founder, and improvement ideas. Anything that needs the
founder (dashboards, accounts, decisions, hand checks) is in `founder-checklist.md`. What was
built, and when, is in `implementationlog.md`. Rewritten 2026-11-25; the earlier version, with
its completed history, is in git.

---

## Ready to do

1. **Theme settings page** (design tokens step 8). Then delete the dev theme switcher, and make
   "System" follow OS changes mid-session.
2. **Theme follow-ups:**
   - Sticker colours in the cubing.js 3D/2D players.
   - Remove the hardcoded colours on the stats and profile pages.

## Improvement ideas

Ordered by value for effort.

1. **Installable app and offline timer (PWA).** The timer already works signed out from local
   storage, so a manifest and a service worker would let cubers install CuberHub and time with
   no signal.
2. **"What to learn next."** Suggest the next set from what's marked learned and the Drill
   Lab's weakest cases.
3. **Daily scramble, later:** streaks, a share card (`src/lib/timer/share-card.ts`), a Friends
   tab, 2x2 and OH dailies, and a scheduled job that loads the next scramble batch.
4. **Smart cube and Stackmat support.** cubing.js has Bluetooth for GAN and other smart cubes.
   This is bigger work, and Chrome/Android only.
5. **Database tidy-up (later):** 16 foreign keys without indexes and 21 unused indexes, per the
   performance advisor. Revisit once there are real users, starting with
   `drill_attempts.algorithm_id`.
6. **Challenge on the same scramble** from Compare: the first slice of Compete (founder,
   2026-10-15: later).
7. **WCA ID verification** (WCA OAuth). Until then, IDs show only to their owner.
