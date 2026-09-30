"use client";

import { Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DrillCase } from "@/lib/drill/dal";
import { currentVariantId, weakestFirst } from "@/lib/drill/order";
import { recommendationText, recommendSwitch } from "@/lib/drill/recommend";
import type { DrillAttempt, StatsByAlgorithm, VariantStats } from "@/lib/drill/types";
import { formatMs, formatResult } from "@/lib/timer/format";
import { cn } from "@/lib/utils";

function median(ms: number | null | undefined): string {
  return ms == null ? "—" : `${formatMs(ms)}s`;
}

function reps(n: number): string {
  return n === 1 ? "1 rep" : `${n} reps`;
}

function successRate(s: VariantStats | undefined): string {
  if (!s || s.attempts === 0) return "—";
  return `${Math.round((s.successes / s.attempts) * 100)}%`;
}

/** The current case's variants: pick one, see how each performs. */
export function VariantPicker({
  drillCase,
  stats,
  selectedId,
  onSelect,
}: {
  drillCase: DrillCase;
  stats: StatsByAlgorithm;
  selectedId: string;
  onSelect: (algorithmId: string) => void;
}) {
  const movesById = new Map(drillCase.algorithms.map((a) => [a.id, a.moves]));
  const rec = recommendSwitch(
    selectedId,
    drillCase.algorithms.map((a) => a.id),
    stats,
  );
  const selected = stats.get(selectedId);

  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-label="Algorithm variants">
      <h2 className="text-sm font-semibold text-foreground">
        {drillCase.name} <span className="font-normal text-muted-foreground">· variants</span>
      </h2>

      <ul className="mt-2 space-y-1.5">
        {drillCase.algorithms.map((a) => {
          const s = stats.get(a.id);
          const active = a.id === selectedId;
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onSelect(a.id)}
                aria-pressed={active}
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-left transition-colors",
                  active ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/50",
                )}
              >
                <span className="block font-mono text-sm text-foreground">{a.moves}</span>
                <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {a.label && <span>{a.label}</span>}
                  {a.is_main && <span>main</span>}
                  <span>{reps(s?.attempts ?? 0)}</span>
                  <span>median {median(s?.medianMs)}</span>
                  <span>success {successRate(s)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {selected?.medianRecognitionMs != null && (
        <p className="mt-3 text-xs text-muted-foreground">
          Recognition median <span className="text-foreground">{median(selected.medianRecognitionMs)}</span>
          {" · "}execution median <span className="text-foreground">{median(selected.medianMs)}</span>
        </p>
      )}

      {rec && (
        <div className="mt-3 flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3" role="status">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <div className="space-y-2">
            <p className="text-sm text-foreground">{recommendationText(rec, movesById)}</p>
            <Button
              size="xs"
              variant="outline"
              onClick={() => onSelect(rec.kind === "switch" ? rec.better.algorithmId : rec.alternativeId)}
            >
              {rec.kind === "switch" ? "Switch to it" : "Try it"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

/** This sitting's reps, newest first. */
export function SessionList({
  attempts,
  caseNames,
}: {
  attempts: readonly DrillAttempt[];
  caseNames: ReadonlyMap<string, string>;
}) {
  if (attempts.length === 0) return null;
  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-label="This session">
      <h2 className="text-sm font-semibold text-foreground">This session · {attempts.length}</h2>
      <ol className="mt-2 divide-y divide-border/60 text-sm" data-testid="drill-session-list">
        {attempts.slice(0, 12).map((a) => (
          <li key={a.id} className="flex items-center justify-between py-1.5">
            <span className="text-muted-foreground">{caseNames.get(a.caseId) ?? "Case"}</span>
            <span className="font-mono tabular-nums text-foreground">
              {a.recognitionMs !== null && (
                <span className="mr-2 text-xs text-muted-foreground">{formatMs(a.recognitionMs)} +</span>
              )}
              {formatResult(a.timeMs, a.penalty)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Every case in the set, weakest first. Doubles as the custom-set picker. */
export function SetRanking({
  cases,
  stats,
  selecting,
  selected,
  onToggle,
  now,
}: {
  cases: readonly DrillCase[];
  stats: StatsByAlgorithm;
  /** Passed in so rendering stays pure; refreshed by the parent on each case. */
  now: number;
  selecting: boolean;
  selected: ReadonlySet<string>;
  onToggle: (caseId: string) => void;
}) {
  const ranked = weakestFirst(cases, stats, now) as DrillCase[];

  return (
    <ol className="mt-2 divide-y divide-border/60 text-sm">
      {ranked.map((c) => {
        const id = currentVariantId(c, stats);
        const s = id ? stats.get(id) : undefined;
        const due = c.algorithms.some((a) => {
          const next = stats.get(a.id)?.nextReviewAt;
          return next != null && Date.parse(next) <= now;
        });
        return (
          <li key={c.id} className="flex items-center gap-3 py-1.5">
            {selecting && (
              <input
                type="checkbox"
                aria-label={`Include ${c.name}`}
                checked={selected.has(c.id)}
                onChange={() => onToggle(c.id)}
                className="size-4 accent-primary"
              />
            )}
            <span className="flex-1 truncate text-foreground">{c.name}</span>
            {due && <span className="rounded bg-primary/10 px-1.5 text-xs text-primary">due</span>}
            <span className="w-14 text-right text-xs text-muted-foreground">{s ? reps(s.attempts) : "new"}</span>
            <span className="w-14 text-right font-mono text-xs tabular-nums text-foreground">{median(s?.medianMs)}</span>
            <span className="w-10 text-right text-xs text-muted-foreground">{successRate(s)}</span>
          </li>
        );
      })}
    </ol>
  );
}
