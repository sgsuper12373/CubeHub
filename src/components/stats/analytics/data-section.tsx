"use client";

import { AlertTriangle, Download, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
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
 * Export. Works logged out as well as signed in — a cuber's solves are theirs
 * whether or not they ever made an account, and asking them to sign up before
 * they can have their own data back would be a poor trade.
 *
 * The read is lossless and deliberately separate from the one the charts use:
 * `loadSolvesForExport` keeps scrambles and notes that `loadSolveMetrics`
 * drops.
 */
export function DataSection({
  repo,
  puzzle,
  onImported,
}: {
  repo: SolveRepository;
  puzzle: TimerPuzzle;
  /** Fired after a successful import so the page reloads its data. */
  onImported: () => void;
}) {
  const [busy, setBusy] = useState<"csv" | "json" | null>(null);
  const [preview, setPreview] = useState<CsTimerParse | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const run = async (format: "csv" | "json") => {
    setBusy(format);
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
      setBusy(null);
    }
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
      setPreview(null);
      if (fileInput.current) fileInput.current.value = "";
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

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Your data</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Every solve for this puzzle, scrambles and notes included. Nothing is
        left behind. You can also restore from your exported backups or csTimer.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() => void run("csv")}
        >
          <Download className="size-3.5" />
          {busy === "csv" ? "Exporting…" : "Export CSV"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() => void run("json")}
        >
          <Download className="size-3.5" />
          {busy === "json" ? "Exporting…" : "Export JSON"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={importing}
          onClick={() => fileInput.current?.click()}
        >
          <Upload className="size-3.5" />
          Import JSON (CubeHub / csTimer)
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".txt,.json,application/json,text/plain"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void pickFile(file);
          }}
        />
      </div>

      {/* ── Dry run: what would happen, before anything happens ── */}
      {preview && (
        <div className="mt-4 rounded-md border border-border bg-background p-3">
          {preview.totalSolves === 0 ? (
            <p className="text-sm text-foreground">
              No solves found in that file.
            </p>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">
                Ready to import {preview.totalSolves} solve
                {preview.totalSolves === 1 ? "" : "s"} ({preview.source === "cubehub" ? "CubeHub backup" : "csTimer export"}) into{" "}
                {puzzle === "333" ? "3x3" : "2x2"}
              </p>
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
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
                <li>
                  Imported sessions are added alongside your existing ones —
                  nothing is replaced.
                </li>
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

          <div className="mt-3 flex gap-2">
            {preview.totalSolves > 0 && (
              <Button
                size="sm"
                disabled={importing}
                onClick={() => void confirmImport()}
              >
                {importing ? "Importing…" : `Import ${preview.totalSolves}`}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={importing}
              onClick={() => {
                setPreview(null);
                if (fileInput.current) fileInput.current.value = "";
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
