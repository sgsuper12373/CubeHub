"use client";

import { Flame } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { HomeCard } from "@/components/home/home-card";
import { useHomeSnapshot } from "@/components/home/use-home-snapshot";
import {
  DEFAULT_DAILY_GOAL,
  loadDailyGoal,
  MAX_DAILY_GOAL,
  saveDailyGoal,
  subscribeDailyGoal,
} from "@/lib/home/daily-goal";
import { cn } from "@/lib/utils";

const R = 26;
const C = 2 * Math.PI * R;

/**
 * Streak and daily goal (docs/home-plan.md → card 6). Encouraging only: it
 * counts what was done and never scolds a missed day (companion spec rule).
 */
export function StreakCard({ userId }: { userId: string | null }) {
  const { snapshot } = useHomeSnapshot(userId);
  const goal = useSyncExternalStore(subscribeDailyGoal, loadDailyGoal, () => DEFAULT_DAILY_GOAL);
  const [editing, setEditing] = useState(false);

  const today = snapshot?.today ?? 0;
  const progress = Math.min(1, today / goal);
  const done = today >= goal;

  return (
    <HomeCard id="streak" title="Streak and daily goal">
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 64 64" className="size-16 shrink-0 -rotate-90" aria-hidden>
          <circle cx="32" cy="32" r={R} fill="none" strokeWidth="6" className="stroke-muted" />
          <circle
            cx="32"
            cy="32"
            r={R}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            className="stroke-primary transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
          />
        </svg>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm text-foreground">
            <span className="font-mono font-semibold tabular-nums">{today}</span> of{" "}
            {editing ? (
              <input
                type="number"
                min={1}
                max={MAX_DAILY_GOAL}
                defaultValue={goal}
                autoFocus
                aria-label="Daily solve goal"
                className="w-16 rounded-md border border-input bg-background px-1.5 py-0.5 font-mono text-sm tabular-nums"
                onBlur={(e) => {
                  saveDailyGoal(Number(e.currentTarget.value));
                  setEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") setEditing(false);
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded font-mono font-semibold tabular-nums underline decoration-dotted underline-offset-4 hover:text-primary"
                aria-label={`Daily goal: ${goal} solves. Change it`}
              >
                {goal}
              </button>
            )}{" "}
            solves today
          </p>
          <p className="text-xs text-muted-foreground">
            {done ? "Goal reached. Nice work." : today > 0 ? `${goal - today} to go.` : "A fresh day."}
          </p>
          {snapshot && snapshot.streak > 0 && (
            <p className="flex items-center gap-1 text-xs font-medium text-foreground">
              <Flame className="size-3.5 text-primary" aria-hidden />
              {snapshot.streak}-day streak
            </p>
          )}
        </div>
      </div>
      {snapshot && (
        <ol className="mt-3 flex gap-1" aria-label="Practice, last 14 days">
          {snapshot.last14.map((d) => (
            <li
              key={d.day}
              title={`${d.day}: ${d.count} solve${d.count === 1 ? "" : "s"}`}
              className={cn("h-3 flex-1 rounded-sm", d.count > 0 ? "bg-primary" : "bg-muted")}
            >
              <span className="sr-only">
                {d.day}: {d.count} solve{d.count === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </HomeCard>
  );
}
