# To-do (Claude's list)

Work Claude can pick up without the founder, and improvement ideas. Anything that needs the
founder (dashboards, accounts, decisions, hand checks) is in `founder-checklist.md`. What was
built, and when, is in `implementationlog.md`. Rewritten 2026-11-25; the earlier version, with
its completed history, is in git.

---

## Ready to do

1. **Sticker colours in the cubing.js 3D/2D players** (the last theme follow-up). Needs cubing's
   experimental stickering API, and `playground-swipe.spec.ts` reads cubing's default colours
   pixel by pixel, so those checks would need the themed colours too. Hardcoded colours on the
   stats and profile pages are done (2026-11-25).

## Improvement ideas

Ordered by value for effort.

1. **"What to learn next."** Suggest the next set from what's marked learned and the Drill
   Lab's weakest cases.
2. **Daily scramble, later:** streaks, a share card (`src/lib/timer/share-card.ts`), a Friends
   tab, 2x2 and OH dailies, and a scheduled job that loads the next scramble batch.
3. **Smart cube and Stackmat support.** cubing.js has Bluetooth for GAN and other smart cubes.
   This is bigger work, and Chrome/Android only.
4. **Database tidy-up (later):** 16 foreign keys without indexes and 21 unused indexes, per the
   performance advisor. Revisit once there are real users, starting with
   `drill_attempts.algorithm_id`.
5. **Challenge on the same scramble** from Compare: the first slice of Compete (founder,
   2026-10-15: later).
6. **WCA ID verification** (WCA OAuth). Until then, IDs show only to their owner.
