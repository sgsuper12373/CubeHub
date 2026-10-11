import { formatAverageText, WINDOW_LABEL } from "./share-text";
import type { WindowSize } from "./stats";
import type { Solve } from "./types";
import { toast } from "@/stores/toast-store";

/** Put text on the clipboard and say so. Client-only. */
export async function copyWithToast(text: string, what: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast({ kind: "info", message: `${what} copied`, durationMs: 2000 });
  } catch {
    toast({ kind: "error", message: "Couldn't copy — check clipboard permissions", durationMs: 3000 });
  }
}

/** Copy the newest `n` solves as csTimer-style text (see share-text.ts). */
export function copyAverage(solves: Solve[], n: WindowSize): void {
  const text = solves.length > 0 ? formatAverageText(solves, n, solves[0].puzzle) : null;
  if (text) void copyWithToast(text, WINDOW_LABEL[n]);
}
