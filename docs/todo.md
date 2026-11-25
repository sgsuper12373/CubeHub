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

1. **Daily scramble, later:** a share *image* (`src/lib/timer/share-card.ts`), a Friends tab, 2x2
   and OH dailies, and a scheduled job that loads the next scramble batch (needs pg_cron or a
   Vercel cron with a server key: the founder's call). Streaks and a text share are done.
2. **Smart cube and Stackmat support.** cubing.js has Bluetooth for GAN and other smart cubes.
   This is bigger work, and Chrome/Android only.
3. **Database tidy-up (later):** 16 foreign keys without indexes and 21 unused indexes, per the
   performance advisor. Revisit once there are real users, starting with
   `drill_attempts.algorithm_id`.
4. **Challenge on the same scramble** from Compare: the first slice of Compete (founder,
   2026-10-15: later).
5. **WCA ID verification** (WCA OAuth). Until then, IDs show only to their owner.
