"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  downloadFile,
  exportFilename,
  toCsv,
  toJson,
} from "@/lib/timer/export";
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
}: {
  repo: SolveRepository;
  puzzle: TimerPuzzle;
}) {
  const [busy, setBusy] = useState<"csv" | "json" | null>(null);

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

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Your data</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Every solve for this puzzle, scrambles and notes included. Nothing is
        left behind.
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
      </div>
    </section>
  );
}
