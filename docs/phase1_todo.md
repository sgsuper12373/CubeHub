# Phase 1 — open items

Findings parked for review, newest first.

---

## 2026-07-21 — Resolved: soft-delete + PB-integrity cleanup

The Session Reset findings below (all four points) are addressed in code. Approach:
**soft delete** — reset/delete set `solves.deleted_at` instead of destroying rows.

- **#1 Phantom PBs** — migration `supabase/migrations/20260721000000_soft_delete_and_pb_integrity.sql`
  adds an authoritative `recompute_single_pb()` plus statement-level triggers on
  `AFTER DELETE` and `AFTER UPDATE OF deleted_at, penalty`. PBs now heal on delete,
  soft-delete, restore, and penalty→DNF. ⚠️ **Apply via dashboard/CLI, not the MCP.**
- **#2 Undo memory-only** → soft delete makes the data durable/recoverable; undo is now
  a single atomic restore (`restoreSolves`), not a re-insert loop.
- **#3 Undo fails silently** → `restoreSolves` is wrapped in try/catch with an error toast.
- **#4 No confirmation** → reusable `confirm()` store + `<ConfirmHost/>` (Base UI AlertDialog);
  all three destructive actions (reset, delete-session, single-solve delete) now confirm.

**Verified 2026-07-21:** migration applied to the live DB; schema objects confirmed via
read-only MCP; scripted PB-recompute test passed all five phases (insert→1200, soft-delete
PB→1500, DNF best→1800, restore→1200, delete-all→no row) — no phantom PBs. Static checks
green (`tsc`, `eslint`, `next build --webpack`).

**Manual in-browser pass done 2026-07-21** — confirm/undo flows and the previously
never-exercised interactive items (panel drag/resize, landing demo timer, preview
auto-sizing, settings-form store state) all verified working. **Phase 1 fully closed.**

A "Recently deleted" view + a purge job for old soft-deleted rows are the natural
follow-ups this migration enables (see cubing-website-plan.md §11.3).

---

## 2026-07-20 — Session Reset destroys data and leaves phantom PBs

Traced from the Reset button in `SessionSwitcher` through to the live schema.

### What Reset does today

`SessionSwitcher onReset` → `useSessionStore.resetSession()` → `repo.deleteSolvesInSession(sessionId)` → a real `DELETE FROM solves WHERE session_id = … AND user_id = …`.

The `sessions` row is **not** deleted — the session keeps its name and stays selected, only its solves die. That is a different operation from the adjacent trash button (`deleteSession()`), which removes the session row and lets solves cascade via `solves_session_id_user_id_fkey ON DELETE CASCADE`.

Both buttons destroy every solve in the session. Only one of them looks like it does.

### 1. Phantom personal bests (serious — data is silently wrong)

Live schema:

```
personal_bests_solve_id_fkey  FOREIGN KEY (solve_id) REFERENCES solves(id) ON DELETE SET NULL
trg_solves_single_pb          AFTER INSERT ON solves  → maintain_single_pb()
```

`AFTER INSERT` only. There is no delete or update trigger anywhere on `solves`.

So on reset: solves are deleted → `personal_bests.solve_id` becomes NULL → **the `personal_bests` row survives with `time_ms` intact.** The user's all-time PB still claims a time with no solve behind it.

It can never self-correct, because the trigger only writes when the new time is lower:

```sql
ON CONFLICT (user_id, puzzle_type, category) DO UPDATE
  SET time_ms = EXCLUDED.time_ms, solve_id = EXCLUDED.solve_id, …
  WHERE EXCLUDED.time_ms < public.personal_bests.time_ms;
```

A PB can only ratchet **down**. Once orphaned, the phantom is permanent — no future solve clears it and nothing in the app can. Note `personal_bests` is keyed on `(user_id, puzzle_type, category)`, i.e. all-time, so resetting *one* session can orphan the *all-time* PB.

Related known gap already in `database.md`: `maintain_single_pb()` only ever writes the `single` category. This is a second hole in the same function.

**Fix direction:** an `AFTER DELETE ON solves` trigger that recomputes the PB for the affected `(user_id, puzzle_type)` from surviving solves, deleting the PB row when none remain. Needs a migration — applied via dashboard/CLI, not the MCP.

### 2. Undo is memory-only

`resetSession()` returns `{ undo }` whose closure holds the cleared solves in a JS variable, surfaced as a 5-second toast.

Reload, navigate away, close the tab, or simply let the toast expire, and the solves are gone from Postgres with **no recovery path**. The UI implies a safety net that does not exist.

**Fix direction:** soft delete (`solves.deleted_at`) instead of a hard delete. Makes undo real, survives reload, and closes this and the phantom-PB window in one change. Bigger migration; needs RLS and every read path updated to filter.

### 3. Undo can fail silently

```ts
void (async () => {
  for (const solve of cleared) await repo.saveSolve(solve, activeUserId ?? undefined);
  …
})();
```

No try/catch. One failed insert mid-loop drops every remaining solve, produces an unhandled rejection, and shows the user nothing. Should be a batch upsert with an error toast on failure.

### 4. No confirmation on either destructive action

Reset and Delete-session both destroy a session's solves on a single click, no dialog. `deleteSession` is at least disabled when only one session exists; Reset has no guard at all.

Cheapest meaningful improvement here and needs no schema change — worth doing first.

---

## Carried over from the Phase 1 build

- **Turbopack production build hangs.** `next build` never finishes (30+ min, process idle in `ep_poll`, reproduced in a clean dir with no dev server). `next build --webpack` compiles in ~18s. Suspect cubing.js worker bundling; dev log shows matching `import.meta.resolve(…) failed` warnings. Blocks deploy until resolved or accepted. Also noted in `roadmap.md`.
- **Interactive behaviour is unverified.** The panel grid drag/resize, the landing-page demo timer, and the preview auto-sizing all typecheck and build clean but have never been exercised in a browser. Needs a manual pass.
- **`settings-form.tsx` state refactor unverified.** Settings now read from `useTimerStore` rather than a local copy, and theme via `useSyncExternalStore`. Typechecks, but the form has not been driven while signed in.
