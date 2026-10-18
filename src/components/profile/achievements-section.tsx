import { HelpCircle } from "lucide-react";
import { createElement } from "react";

import type { Achievement } from "@/lib/profile/dal";
import { achievementIcon } from "@/lib/profile/achievement-icons";
import { cn } from "@/lib/utils";

/**
 * The badge grid (C9). Unlocked badges are in colour with their date; locked
 * ones are dimmed but still say what they need, so they're something to aim
 * for. Hidden badges stay a mystery until they're earned.
 */
export function AchievementsSection({ achievements }: { achievements: Achievement[] }) {
  if (achievements.length === 0) return null;
  const earned = achievements.filter((a) => a.unlockedAt).length;

  return (
    <section id="achievements" className="scroll-mt-20 space-y-3" aria-labelledby="achievements-title">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="achievements-title" className="text-lg font-bold tracking-tight text-foreground">
          Achievements
        </h2>
        <span className="font-mono text-sm text-muted-foreground tabular-nums">
          {earned}/{achievements.length}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {achievements.map((a) => (
          <Badge key={a.slug} achievement={a} />
        ))}
      </ul>
    </section>
  );
}

function Badge({ achievement: a }: { achievement: Achievement }) {
  const unlocked = a.unlockedAt !== null;
  const mystery = a.hidden && !unlocked;

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3",
        unlocked ? "border-primary/40 bg-primary/5" : "border-border bg-card/40",
      )}
    >
      <div
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg",
          unlocked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground/60",
        )}
      >
        {createElement(mystery ? HelpCircle : achievementIcon(a.slug), {
          className: "size-4.5",
          "aria-hidden": true,
        })}
      </div>
      <div className="min-w-0">
        <p className={cn("text-sm font-semibold", unlocked ? "text-foreground" : "text-muted-foreground")}>
          {mystery ? "???" : a.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {mystery ? "Keep cubing to find out." : a.description}
        </p>
        {unlocked && (
          <p
            className="mt-1 text-[0.7rem] font-medium text-primary"
            title="The day you first met this badge's condition"
          >
            First reached{" "}
            {new Date(a.unlockedAt!).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "Asia/Kolkata",
            })}
          </p>
        )}
      </div>
    </li>
  );
}
