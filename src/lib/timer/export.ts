import { formatResult } from "./format";
import type { Session, Solve, TimerPuzzle } from "./types";

/**
 * Getting a cuber's data back out.
 *
 * Both formats are **lossless** — scramble and notes included — because the
 * point of an export is that it can stand in for the original. A summary that
 * drops the scrambles is a report, not a backup, and a cuber who leaves should
 * be able to leave with everything.
 *
 * The JSON envelope is versioned so a future importer can branch on shape
 * instead of guessing. CSV carries a human-readable time column alongside the
 * raw milliseconds, since CSV is what people open in a spreadsheet.
 */

export const EXPORT_VERSION = 1;

export interface ExportEnvelope {
  version: number;
  exportedAt: string;
  puzzle: TimerPuzzle;
  sessions: Session[];
  solves: Solve[];
}

export function toJson(
  puzzle: TimerPuzzle,
  sessions: Session[],
  solves: Solve[],
): string {
  const envelope: ExportEnvelope = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    puzzle,
    sessions,
    solves,
  };
  return JSON.stringify(envelope, null, 2);
}

const CSV_HEADERS = [
  "session",
  "created_at",
  "time_ms",
  "penalty",
  "effective_time_ms",
  "result",
  "scramble",
  "notes",
] as const;

/**
 * RFC 4180 quoting: wrap anything containing a comma, quote or newline, and
 * double any quote inside. Notes are free text and scrambles are full of
 * spaces, so this is not optional.
 */
function csvCell(value: string | number | null): string {
  if (value === null) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function toCsv(sessions: Session[], solves: Solve[]): string {
  const names = new Map(sessions.map((s) => [s.id, s.name]));

  const rows = solves.map((s) =>
    [
      names.get(s.sessionId) ?? "",
      s.createdAt,
      s.timeMs,
      s.penalty,
      // Local rows have no generated column; leave it blank rather than
      // inventing a value that the database would have computed differently.
      s.effectiveTimeMs,
      formatResult(s.timeMs, s.penalty),
      s.scramble,
      s.notes,
    ]
      .map(csvCell)
      .join(","),
  );

  return [CSV_HEADERS.join(","), ...rows].join("\n");
}

/** Hand a string to the browser as a file download. */
export function downloadFile(
  filename: string,
  mimeType: string,
  contents: string,
): void {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // Revoking immediately can race the download in some browsers; a tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** `cubehub-3x3-2026-07-25.csv` — sorts chronologically in a downloads folder. */
export function exportFilename(puzzle: TimerPuzzle, extension: string): string {
  const label = puzzle === "333" ? "3x3" : "2x2";
  const day = new Date().toISOString().slice(0, 10);
  return `cubehub-${label}-${day}.${extension}`;
}
