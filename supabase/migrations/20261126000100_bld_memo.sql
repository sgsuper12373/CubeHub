-- 3x3 BLD in the timer: a memo time on the solve, and BLD limits for the
-- misfire and mis-stop checks (docs/companion-plan.md step 10, docs/timer.md → BLD).
--
-- Applied to the live project 2026-11-26 (supabase db push); bld_memo_test.sql 6/6 PASS.
-- Before it was, the app kept memo times in the browser only: it checks for the
-- column once per page view (src/lib/timer/memo-column.ts) and leaves it out of
-- reads and writes when missing.
--
-- '333bf' is already in public.puzzle_type (baseline), so no enum change.

-- ── 1. solves.memo_ms ────────────────────────────────────────────────────────
-- Memo time from the start of the solve, set only when the cuber used the memo
-- split. Nullable, no default: a metadata-only change; the check validates
-- existing rows, which are all null. RLS is per row, so no policy change.

alter table public.solves
  add column if not exists memo_ms integer;

alter table public.solves
  drop constraint if exists solves_memo_ms_check;

alter table public.solves
  add constraint solves_memo_ms_check check (
    memo_ms is null or (memo_ms > 0 and memo_ms < time_ms)
  );

comment on column public.solves.memo_ms is
  'BLD memo split: ms from the start to the end of memo; null when not split. Execution = time_ms - memo_ms.';

-- ── 2. BLD limits ────────────────────────────────────────────────────────────
-- Same functions as 20261019000000_solve_sanity.sql and 20261021000000_misstops.sql,
-- with '333bf' added (it fell to the defaults of 1 s and 0.5 s). The world-record
-- BLD single is about 12 s, memo included. Mirrored in src/lib/timer/misfire.ts.

create or replace function public.misfire_limit_ms(p_puzzle public.puzzle_type)
returns integer
language sql
immutable
set search_path to ''
as $$
  select case p_puzzle
    when '333'   then 3000
    when '222'   then 400
    when '444'   then 15000
    when '555'   then 30000
    when '666'   then 55000
    when '777'   then 90000
    when '333oh' then 5000
    when '333bf' then 10000
    when 'pyra'  then 700
    when 'skewb' then 700
    when 'mega'  then 22000
    when 'sq1'   then 3000
    when 'clock' then 1500
    else 1000
  end;
$$;

create or replace function public.misstop_limit_ms(p_puzzle public.puzzle_type)
returns integer
language sql
immutable
set search_path to ''
as $$
  select case p_puzzle
    when '333'   then 2000
    when '222'   then 300
    when '333oh' then 4000
    when '333bf' then 8000
    when '444'   then 12000
    when '555'   then 25000
    when '666'   then 45000
    when '777'   then 75000
    when 'pyra'  then 500
    when 'skewb' then 500
    when 'mega'  then 18000
    when 'sq1'   then 2500
    when 'clock' then 1200
    else 500
  end;
$$;
