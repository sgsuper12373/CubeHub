"use client";

import { Star } from "lucide-react";
import Link from "next/link";

import { formatMs } from "@/lib/timer/format";
import type { NextSolveNeed } from "@/lib/timer/next-solve";
import type { PbCategory, PersonalBest } from "@/lib/timer/types";
import { cn } from "@/lib/utils";

/**
 * All-time personal bests.
 *
 * Deliberately NOT affected by the filter bar. A personal best is all-time by
 * definition — showing a "best of the last 30 days" under the same word would
 * quietly redefine the number a cuber cares most about. The subtitle says so.
 *
 * Signed in, these are the authoritative `personal_bests` rows the database
 * maintains. Logged out, they are computed from local storage with the same
 * window rules, so they do not move when the solves later sync.
 */

const ORDER: { category: PbCategory; label: string }[] = [
  { category: "single", label: "Single" },
  { category: "mean3", label: "Mo3" },
  { category: "ao5", label: "Ao5" },
  { category: "ao12", label: "Ao12" },
  { category: "ao50", label: "Ao50" },
  { category: "ao100", label: "Ao100" },
];

export function PbRow({
  bests,
  isAuthed,
  needs,
  onOpen,
}: {
  bests: PersonalBest[];
  isAuthed: boolean;
  /** What the next solve in the current session needs, per category; null hides the line. */
  needs: Partial<Record<PbCategory, NextSolveNeed>> | null;
  /** Open the solves behind a PB. */
  onOpen: (best: PersonalBest) => void;
}) {
  const byCategory = new Map(bests.map((b) => [b.category, b]));

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-foreground">
          All-time personal bests
        </h2>
        <p className="text-xs text-muted-foreground">
          {isAuthed
            ? "Best single from any session · averages count within one session · not affected by the filters"
            : "From this device · sign in to keep them"}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ORDER.map(({ category, label }) => {
          const best = byCategory.get(category);
          const isSingle = category === "single";
          const need = needs?.[category];
          const openable = !!best?.solveId;
          const body = (
            <>
              <span className="flex items-center gap-1 text-[0.6rem] font-medium tracking-wider text-muted-foreground uppercase">
                {isSingle && (
                  <Star
                    className="size-2.5 fill-timer-ready text-timer-ready"
                    aria-hidden
                  />
                )}
                {label}
              </span>
              <span
                className={cn(
                  "font-mono text-lg font-semibold tabular-nums",
                  isSingle ? "text-timer-ready" : "text-foreground",
                )}
              >
                {best ? formatMs(best.timeMs) : "—"}
              </span>
              <span className="text-[0.65rem] text-muted-foreground">
                {best
                  ? new Date(best.achievedAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Not set yet"}
              </span>
              {need && <NextLine need={need} />}
            </>
          );
          const className = cn(
            "flex flex-col items-start gap-1 rounded-lg px-3 py-2.5 text-left ring-1 ring-inset",
            isSingle ? "ring-primary/30" : "ring-foreground/10",
          );
          const title = isSingle ? "Best single across all sessions" : `Best ${label} within a single session`;
          return openable ? (
            <button
              key={category}
              type="button"
              title={`${title} · show the solves`}
              aria-label={`${label} personal best ${formatMs(best!.timeMs)}: show the solves`}
              onClick={() => onOpen(best!)}
              className={cn(className, "transition-colors hover:bg-muted/50")}
            >
              {body}
            </button>
          ) : (
            <div key={category} title={title} className={className}>
              {body}
            </div>
          );
        })}
      </div>

      {!isAuthed && (
        <p className="mt-3 text-xs text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>{" "}
          to keep these across devices — this device&apos;s solves come with you.
        </p>
      )}
    </section>
  );
}

/** csTimer's "time needed to improve on the next solve", for this session. */
function NextLine({ need }: { need: NextSolveNeed }) {
  const [text, hint] =
    need.kind === "below"
      ? [`< ${formatMs(need.ms)}`, `A next solve under ${formatMs(need.ms)} in this session sets a new PB`]
      : need.kind === "any"
        ? ["∞", "Any finished next solve in this session sets a new PB"]
        : need.kind === "none"
          ? ["N/A", "No time on the next solve can beat it in this session"]
          : [`${need.solves} more`, `${need.solves} more solve${need.solves === 1 ? "" : "s"} in this session before this average can complete`];
  return (
    <span className="text-[0.65rem] text-muted-foreground" title={hint}>
      Next: <span className="font-mono font-medium text-foreground">{text}</span>
      <span className="sr-only"> ({hint})</span>
    </span>
  );
}
