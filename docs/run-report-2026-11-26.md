# Run report: Cubby v1 and 3x3 BLD (2026-11-26)

Unattended run. Everything the batch asked for is built: Cubby v1 (steps 0–9) and 3x3 BLD with Cubby's
blindfold solve (step 10). Nothing was pushed, merged or deployed, and the live database and dashboards
weren't touched. The two migrations are files only.

## Branches

| Branch | From | Commits | What |
| --- | --- | --- | --- |
| `feat/cubby` | `origin/main` (`ef15631`) | 13 | Cubby v1, behind `NEXT_PUBLIC_SHOW_CUBBY=1` |
| `feat/bld-mode` | `feat/cubby` | 3 | 3x3 BLD with a memo split, Cubby's blindfold solve, this report |

Your local `main` (6 commits ahead of GitHub: PWA, learn next, daily share and streak, Home usage events)
is untouched. Neither branch has those commits, so merging will need small fixes in `docs/` and
`implementationlog.md` only.

## Steps

| # | Step | Commit |
| --- | --- | --- |
| 0 | Plan (`docs/companion-plan.md`) and a repo copy of the spec (`docs/cubby-cubing-companion.md`) | `fab9bd3` |
| 1 | Renderer interface, SVG state machine, renderer factory | `ba1edc5` |
| 2 | v0 art behind a part manifest, theme stickers, `/dev/cubby` review page | `235a3b1` |
| 3 | Director (quiet rules, caps), event bus, content model, settings types | `8ade95c` |
| 4 | Dock: sidebar slot, floating on phones, menu, unseen dot | `a3e52af` |
| 5 | Tour engine: spotlight, interactive steps, What's new, skip/resume, keyboard | `4b4145e` |
| 6 | The four beta tours (Timer, Learn, Drill Lab, Playground) and their `data-tour` markers | `c3b5fd1` |
| 7 | Greetings and reactions (PB, +2/DNF, case learned, mis-stop, errors, an hour of solving) | `cf83a98` |
| 8 | Settings: guests and members, sheet, Settings page section, migration file | `8a029d8` |
| 9 | Cubby on Home's tip card and the landing page's Meet Cubby | `03c6a9b` |
| — | E2E spec; a fix (a tour skipped after asking isn't offered again); docs | `4869682` `2fd35b9` `1e8c7e1` |
| 10 | 3x3 BLD, memo split (migration file), Cubby's blindfold solve; docs | `28f577f` `3f9868a` |

## Checks

- **After every step:** `npm run validate` and `npm run check:colors` (one step's lint failure was fixed and
  the commit amended before moving on). Final: 795 unit tests.
- **SQL:** `companion_test.sql` 7/7 and `bld_memo_test.sql` 6/6 PASS on a throwaway local Postgres (podman).
  Not run on the live project.
- **E2E**, run in a throwaway git worktree, because a `next start` from this repo's `.next` was serving
  port 3000 (your local check) and rebuilding would have broken it:
  - Flag on (`NEXT_PUBLIC_SHOW_CUBBY=1`), `cubby.spec.ts`: **13 passed**.
  - Flag off, full suite at the end of each branch: `feat/cubby` 112 passed; `feat/bld-mode` **114 passed**,
    11 skipped (the flag-on tests).
  - **1 failure both times, not from this run:** `clubs.spec` posts. The test account hit the live limit of
    10 club posts a day ("You've posted 10 times today"). It resets daily.
- **By eye:** every tour stepped through in a browser, plus the dock, greetings, the settings sheet, `/dev/cubby`,
  Meet Cubby and the tip card, in Slate (and Paper for the art).

## Judgement calls (details in `docs/decisions.md` → Cubby and → BLD mode)

- The spec's repo copy didn't exist, so I made it from the Claude Doc. The Claude Doc stays the source of truth.
- 3x3 BLD is an **event** (`333bf`, already in the database), not a switch on 3x3, so blindfolded times don't
  mix into 3x3 averages and PBs.
- Learn has two tours, the index and a set's page, because a tour can't cross pages.
- "Drill case mastered" reacts to **marking a case learned**, since the Drill Lab has no mastery state.
- Dock: 44 px in the sidebar and 40 px floating, not 56 px, which doesn't fit the sidebar row.
- `?` opens the dock everywhere except the Timer and Playground, whose own `?` opens their shortcut lists.
- Mute = Quiet mode. Off hides Cubby; the way back is Settings or Ctrl+K → "Cubby settings".
- Members' Cubby settings and BLD memo times work **before** their migrations are applied: they stay in
  the browser, and the app picks up the columns once they exist.

## Couldn't finish

Nothing was reverted. Not built, on purpose:
- **The inspection coach:** the setting is stored, but the coach is v1.5.
- **The first-visit onboarding questions:** the spec lists them separately from the v1 behaviours.
- **The Stats, Profile, Social and Settings tours:** the beta tours are the four asked for.

## Your checklist

Also added to `docs/founder-checklist.md` → section 7.

1. **Try it:**
   - `git switch feat/bld-mode`, then `NEXT_PUBLIC_SHOW_CUBBY=1 npm run dev`.
   - Open `/timer`, `/learn`, `/learn/333/pll`, `/learn/333/drill` and `/playground` in a private window,
     so every tour starts fresh.
   - `/dev/cubby` shows every pose.
   - Try 3x3 BLD: pick it in the event menu, turn on Timer settings → BLD memo split, and time a solve.
2. **Decide:** is the v0 art good enough for the beta, or does Cubby wait for the final art? The renderer
   and the part manifest are ready for a swap.
3. **Before turning the flag on:** apply `20261126000000_companion.sql`, then run
   `supabase/tests/companion_test.sql`.
4. **For BLD memo times in the cloud:** apply `20261126000100_bld_memo.sql`, then run
   `supabase/tests/bld_memo_test.sql`.
5. **Merge order:** your local `main` first (push it), then `feat/cubby`, then `feat/bld-mode`. 3x3 BLD
   ships with or without the flag: only Cubby's animation depends on it.
