"use client";

import { Check, Circle } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { HomeCard } from "@/components/home/home-card";
import { cn } from "@/lib/utils";

const noop = () => () => {};
const EVENT_KEY = "cubehub.timer.event";

function hasPickedPuzzle(): boolean {
  try {
    return localStorage.getItem(EVENT_KEY) !== null;
  } catch {
    return false;
  }
}

type Step = { label: string; href: string; done: boolean };

/**
 * "Start here" (docs/home-plan.md → Who sees what). For a new member: three
 * setup steps that tick off from real data, and the card hides itself for good
 * once all three are done. For a guest: where to begin, and why to sign in.
 * Cubby's first-visit onboarding replaces it later (companion spec).
 */
export function WelcomeCard({
  member,
  solveCount = 0,
  pllLearned = false,
}: {
  member: boolean;
  solveCount?: number;
  pllLearned?: boolean;
}) {
  const picked = useSyncExternalStore(noop, hasPickedPuzzle, () => false);

  const steps: Step[] = member
    ? [
        { label: "Pick your main puzzle", href: "/timer", done: picked },
        { label: `Time 5 solves${solveCount > 0 && solveCount < 5 ? ` (${solveCount} so far)` : ""}`, href: "/timer", done: solveCount >= 5 },
        { label: "Learn your first PLL", href: "/learn/333/pll", done: pllLearned },
      ]
    : [
        { label: "Time your first solve", href: "/timer", done: false },
        { label: "Learn your first PLL, in 3D", href: "/learn/333/pll", done: false },
        { label: "Turn a cube in the Playground", href: "/playground", done: false },
      ];

  if (member && steps.every((s) => s.done)) return null;

  return (
    <HomeCard id="welcome" title="Start here" className="lg:col-span-2">
      <ol className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
        {steps.map((s, i) => (
          <li key={s.label} className="flex-1">
            <Link
              href={s.href}
              className={cn(
                "flex h-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted",
                s.done ? "border-primary/30 text-muted-foreground" : "border-border text-foreground",
              )}
            >
              {s.done ? (
                <Check className="size-4 shrink-0 text-primary" aria-hidden />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className={cn(s.done && "line-through decoration-muted-foreground/50")}>
                <span className="sr-only">{s.done ? "Done: " : `Step ${i + 1}: `}</span>
                {s.label}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {!member && (
        <p className="mt-3 text-xs text-muted-foreground">
          Everything works without an account.{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>{" "}
          to sync your solves across devices and join clubs.
        </p>
      )}
    </HomeCard>
  );
}
