"use client";

import { Star } from "lucide-react";
import Link from "next/link";

import { formatMs } from "@/lib/timer/format";
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
  { category: "ao5", label: "Ao5" },
  { category: "ao12", label: "Ao12" },
  { category: "ao50", label: "Ao50" },
  { category: "ao100", label: "Ao100" },
];

export function PbRow({
  bests,
  isAuthed,
}: {
  bests: PersonalBest[];
  isAuthed: boolean;
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
            ? "Across every session · not affected by the filters"
            : "From this device · sign in to keep them"}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ORDER.map(({ category, label }) => {
          const best = byCategory.get(category);
          const isSingle = category === "single";
          return (
            <div
              key={category}
              className={cn(
                "flex flex-col gap-1 rounded-lg px-3 py-2.5 ring-1 ring-inset",
                isSingle ? "ring-primary/30" : "ring-foreground/10",
              )}
            >
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
