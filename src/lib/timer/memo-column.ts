import { createClient } from "@/lib/supabase/client";

/**
 * Whether `solves.memo_ms` exists yet (migration 20261126000100_bld_memo.sql
 * is applied by hand). Checked once per page view with a one-row select;
 * until it exists, BLD memo times stay on the solve in this browser only and
 * cloud reads and writes leave the column out, so nothing breaks.
 */
let probe: Promise<boolean> | null = null;

export function hasMemoColumn(): Promise<boolean> {
  probe ??= Promise.resolve(createClient().from("solves").select("memo_ms").limit(1)).then(
    ({ error }) => !error,
    () => false,
  );
  return probe;
}

/** The `memo_ms` field for a row, only when the column exists and the solve has one. */
export function memoField(memoMs: number | undefined, columnExists: boolean): { memo_ms?: number } {
  return columnExists && memoMs !== undefined ? { memo_ms: memoMs } : {};
}

/** For tests. */
export function resetMemoColumnProbe(): void {
  probe = null;
}
