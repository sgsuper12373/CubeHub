-- Soft delete for solves + authoritative personal-best recompute.
--
-- Problem this fixes (see docs/phase1_todo.md):
--   `maintain_single_pb` runs only AFTER INSERT and only ever ratchets a PB
--   *down*. `personal_bests.solve_id` is ON DELETE SET NULL, so deleting the
--   solve behind a PB leaves a phantom PB row with its time intact that nothing
--   can clear. The same hole exists when the PB solve is changed to DNF.
--
-- Fix:
--   1. `solves.deleted_at` — reset/delete now soft-delete (durable undo, and a
--      foundation for a future "Recently deleted" view / retention policy).
--   2. `recompute_single_pb()` — recomputes the all-time single PB for a
--      (user, puzzle) from the *surviving* solves; deletes the PB row when none
--      remain. Authoritative (not a ratchet), so it heals phantom PBs.
--   3. Statement-level triggers fire it on DELETE, soft-delete, restore and
--      penalty change. One recompute per distinct (user, puzzle) per statement,
--      so a 500-solve reset recomputes once, not 500 times.
--
-- The existing AFTER INSERT ratchet (`maintain_single_pb`) is kept as the cheap
-- fast path for a brand-new solve.
--
-- ⚠️ Apply this to the live project via the Supabase dashboard/CLI — NOT via the
-- read-only MCP. The live DB has no migration history recorded; if linking with
-- the CLI, repair the baseline first (see 20260718000000_baseline.sql).

-- ── 1. Soft-delete column ──────────────────────────────────────────────────
alter table public.solves
  add column if not exists deleted_at timestamptz;

-- Hot path: loading a session's live solves, newest first.
create index if not exists idx_solves_active
  on public.solves (session_id, created_at desc)
  where deleted_at is null;

-- ── 2. Authoritative single-PB recompute ───────────────────────────────────
-- Extend to ao5/ao12/... later by looping over categories here (the known
-- single-only gap in docs/database.md is closed in this same function).
create or replace function public.recompute_single_pb(
  p_user   uuid,
  p_puzzle public.puzzle_type
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_best public.solves%rowtype;
begin
  select *
    into v_best
  from public.solves
  where user_id = p_user
    and puzzle_type = p_puzzle
    and deleted_at is null
    and effective_time_ms is not null   -- excludes DNF (generated column is null)
  order by effective_time_ms asc, created_at asc
  limit 1;

  if v_best.id is null then
    -- No qualifying solve left — drop any surviving PB row.
    delete from public.personal_bests
    where user_id = p_user
      and puzzle_type = p_puzzle
      and category = 'single';
  else
    insert into public.personal_bests
      (user_id, puzzle_type, category, time_ms, solve_id, achieved_at)
    values
      (p_user, p_puzzle, 'single', v_best.effective_time_ms, v_best.id, v_best.created_at)
    on conflict (user_id, puzzle_type, category) do update
      set time_ms     = excluded.time_ms,
          solve_id    = excluded.solve_id,
          achieved_at = excluded.achieved_at,
          updated_at  = now();
  end if;
end;
$$;

-- ── 3. Statement-level triggers ────────────────────────────────────────────
-- Two functions, because Postgres forbids a column list (UPDATE OF ...) on a
-- trigger that uses transition tables. The DELETE trigger recomputes for every
-- distinct (user, puzzle) in the removed rows; the UPDATE trigger joins the old
-- and new transition tables and only recomputes when deleted_at or penalty
-- actually changed (so unrelated edits — notes, updated_at — cost nothing).

create or replace function public.recompute_pb_on_solve_delete()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  r record;
begin
  for r in select distinct user_id, puzzle_type from deleted_solves loop
    perform public.recompute_single_pb(r.user_id, r.puzzle_type);
  end loop;
  return null;
end;
$$;

create or replace function public.recompute_pb_on_solve_update()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  r record;
begin
  for r in
    select distinct n.user_id, n.puzzle_type
    from new_solves n
    join old_solves o on o.id = n.id
    where n.deleted_at is distinct from o.deleted_at
       or n.penalty    is distinct from o.penalty
  loop
    perform public.recompute_single_pb(r.user_id, r.puzzle_type);
  end loop;
  return null;
end;
$$;

drop trigger if exists trg_solves_pb_after_delete on public.solves;
create trigger trg_solves_pb_after_delete
  after delete on public.solves
  referencing old table as deleted_solves
  for each statement execute function public.recompute_pb_on_solve_delete();

drop trigger if exists trg_solves_pb_after_update on public.solves;
create trigger trg_solves_pb_after_update
  after update on public.solves
  referencing old table as old_solves new table as new_solves
  for each statement execute function public.recompute_pb_on_solve_update();

-- RLS: no new policy needed. `solves_all` (FOR ALL, owner) already authorizes
-- the deleted_at UPDATE; `personal_bests` stays writable only via these
-- SECURITY DEFINER functions (its only policy is pbs_read / SELECT).
