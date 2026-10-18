"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { AlertTriangle, Download, MoreHorizontal, Upload } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { eventLabel } from "@/lib/timer/events";
import {
  downloadFile,
  exportFilename,
  toCsv,
  toJson,
} from "@/lib/timer/export";
import { parseCsTimer, toSolves, type CsTimerParse } from "@/lib/timer/import-cstimer";
import type { SolveRepository } from "@/lib/timer/repo";
import type { TimerPuzzle } from "@/lib/timer/types";
import { toast } from "@/stores/toast-store";

/**
 * Export and import, kept out of the way: they're used rarely, so they live in
 * the ⋯ menu next to the page title, and csTimer import is offered up front
 * only in the empty state (stats-onboarding.tsx).
 *
 * Both work logged out as well as signed in — a cuber's solves are theirs
 * whether or not they ever made an account. The export read is lossless and
 * deliberately separate from the one the charts use: `loadSolvesForExport`
 * keeps scrambles and notes that `loadSolveMetrics` drops.
 */

const itemClass =
  "flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 outline-none data-highlighted:bg-muted data-disabled:opacity-50";

/** The ⋯ menu: Export CSV, Export JSON, Import. */
export function DataMenu({
  repo,
  puzzle,
  onImport,
}: {
  repo: SolveRepository;
  puzzle: TimerPuzzle;
  /** Opens the import file picker (useImportFlow). */
  onImport: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const run = async (format: "csv" | "json") => {
    setBusy(true);
    try {
      const [solves, sessions] = await Promise.all([
        repo.loadSolvesForExport(puzzle),
        repo.loadSessions(puzzle),
      ]);

      if (solves.length === 0) {
        toast({
          kind: "info",
          message: "Nothing to export for this puzzle yet",
          durationMs: 3000,
        });
        return;
      }

      downloadFile(
        exportFilename(puzzle, format),
        format === "csv" ? "text/csv;charset=utf-8" : "application/json",
        format === "csv"
          ? toCsv(sessions, solves)
          : toJson(puzzle, sessions, solves),
      );
      toast({
        kind: "info",
        message: `Exported ${solves.length} solve${solves.length === 1 ? "" : "s"}`,
        durationMs: 3000,
      });
    } catch (err) {
      console.error("export failed", err);
      toast({
        kind: "error",
        message: "Export failed — please try again",
        durationMs: 4000,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Menu.Root>
      <Menu.Trigger render={<Button variant="outline" size="icon-sm" aria-label="Import and export" />}>
        <MoreHorizontal />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={4} className="isolate z-50">
          <Menu.Popup className="min-w-52 rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden">
            <Menu.Item disabled={busy} onClick={() => void run("csv")} className={itemClass}>
              <Download className="size-4" aria-hidden />
              Export {eventLabel(puzzle)} as CSV
            </Menu.Item>
            <Menu.Item disabled={busy} onClick={() => void run("json")} className={itemClass}>
              <Download className="size-4" aria-hidden />
              Export {eventLabel(puzzle)} as JSON
            </Menu.Item>
            <Menu.Separator className="my-1 h-px bg-border" />
            <Menu.Item onClick={onImport} className={itemClass}>
              <Upload className="size-4" aria-hidden />
              Import (csTimer or CubeHub)
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/**
 * Import: a hidden file input and a dry-run dialog that says what would
 * happen before anything is written. `openPicker` can be called from the ⋯
 * menu or the empty state; render `ui` once.
 */
export function useImportFlow({
  repo,
  puzzle,
  onImported,
}: {
  repo: SolveRepository;
  puzzle: TimerPuzzle;
  /** Fired after a successful import so the page reloads its data. */
  onImported: () => void;
}): { openPicker: () => void; ui: ReactNode } {
  const [preview, setPreview] = useState<CsTimerParse | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPreview(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  /** Read and parse only — nothing is written until the user confirms. */
  const pickFile = async (file: File) => {
    try {
      setPreview(parseCsTimer(await file.text(), puzzle));
    } catch (err) {
      console.error("import read failed", err);
      toast({
        kind: "error",
        message: "Couldn't read that file",
        durationMs: 4000,
      });
    }
  };

  const confirmImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      const existing = await repo.loadSessions(puzzle);
      const { sessions, solves } = toSolves(preview, puzzle, existing.length);
      const written = await repo.importData(sessions, solves);

      toast({
        kind: "info",
        message:
          written === 0
            ? "Already imported — nothing new to add"
            : `Imported ${written} solve${written === 1 ? "" : "s"}`,
        durationMs: 4000,
      });
      reset();
      onImported();
    } catch (err) {
      console.error("import failed", err);
      toast({
        kind: "error",
        message: "Import failed — nothing was changed",
        durationMs: 4000,
      });
    } finally {
      setImporting(false);
    }
  };

  const ui = (
    <>
      <input
        ref={fileInput}
        type="file"
        accept=".txt,.json,application/json,text/plain"
        className="sr-only"
        aria-label="Import file"
        data-testid="import-file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pickFile(file);
        }}
      />
      <Dialog.Root
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open && !importing) reset();
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl outline-none transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            {preview && (
              <>
                <Dialog.Title className="text-base font-semibold text-foreground">
                  {preview.totalSolves === 0
                    ? "No solves found in that file"
                    : `Import ${preview.totalSolves} solve${preview.totalSolves === 1 ? "" : "s"} into ${eventLabel(puzzle)}?`}
                </Dialog.Title>
                {preview.totalSolves > 0 && (
                  <>
                    <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                      From a {preview.source === "cubehub" ? "CubeHub backup" : "csTimer export"}.
                      Imported sessions are added alongside your existing ones; nothing is
                      replaced.
                    </Dialog.Description>
                    <ul className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                      <li>
                        {preview.sessions.length} session
                        {preview.sessions.length === 1 ? "" : "s"}:{" "}
                        {preview.sessions
                          .map((s) => `${s.name} (${s.solves.length})`)
                          .join(", ")}
                      </li>
                      {preview.earliest && preview.latest && (
                        <li>
                          {new Date(preview.earliest).toLocaleDateString()} –{" "}
                          {new Date(preview.latest).toLocaleDateString()}
                        </li>
                      )}
                      <li>
                        {preview.plus2Count} +2 · {preview.dnfCount} DNF
                      </li>
                      <li>Suspected mis-stops are flagged and left out, as on the timer.</li>
                    </ul>

                    {preview.warnings.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {preview.warnings.map((w) => (
                          <li
                            key={w}
                            className="flex items-start gap-1.5 text-xs text-muted-foreground"
                          >
                            <AlertTriangle
                              className="mt-0.5 size-3 shrink-0 text-timer-holding"
                              aria-hidden
                            />
                            {w}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" disabled={importing} onClick={reset}>
                    Cancel
                  </Button>
                  {preview.totalSolves > 0 && (
                    <Button size="sm" disabled={importing} onClick={() => void confirmImport()}>
                      {importing ? "Importing…" : `Import ${preview.totalSolves}`}
                    </Button>
                  )}
                </div>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );

  return { openPicker: () => fileInput.current?.click(), ui };
}
