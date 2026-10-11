import Link from "next/link";

import type { LearningProgress } from "@/lib/profile/dal";
import { eventLabel } from "@/lib/timer/events";

import { SectionTitle } from "./activity-section";

/**
 * Algorithm sets in progress (B7): learned cases out of the set, from what the
 * cuber marked as learned in Learn. Each row opens that set.
 */
export function LearningSection({
  learning,
  hiddenNote,
  isOwner,
}: {
  learning: LearningProgress[];
  hiddenNote?: boolean;
  isOwner: boolean;
}) {
  return (
    <section className="space-y-3" aria-labelledby="learning-title">
      <SectionTitle id="learning-title" title="Learning" hiddenNote={hiddenNote} />
      {learning.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {isOwner ? (
            <>
              Mark algorithms as learned in{" "}
              <Link href="/learn" className="text-primary hover:underline">
                Learn
              </Link>{" "}
              to track your progress here.
            </>
          ) : (
            "Nothing learned yet."
          )}
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {learning.map((set) => {
            const pct = set.total > 0 ? Math.round((set.learned / set.total) * 100) : 0;
            const done = set.learned >= set.total && set.total > 0;
            return (
              <li key={`${set.puzzle}-${set.slug}`}>
                <Link
                  href={`/learn/${set.puzzle}/${set.slug}`}
                  className="block rounded-xl border border-border bg-card/60 p-3 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-foreground">
                      {eventLabel(set.puzzle)} {set.name}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {set.learned}/{set.total}
                      {done && " ✓"}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={set.total}
                    aria-valuenow={set.learned}
                    aria-label={`${set.name}: ${set.learned} of ${set.total} learned`}
                  >
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
