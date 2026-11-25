/**
 * Home's "Next achievement" card (docs/home-plan.md → card 11): the unearned
 * badge this cuber is closest to, with a progress bar. Pure, so it's
 * unit-tested. Progress is read from the profile stats and PBs, which can
 * differ slightly from the server's award check (it counts timer-only
 * averages), so the card says how close, never that a badge is earned.
 */
import { formatMs } from "@/lib/timer/format";

export type BadgeForProgress = {
  slug: string;
  title: string;
  description: string;
  hidden: boolean;
  unlockedAt: string | null;
  condition: { type: string; value: Record<string, unknown> };
};

export type ProgressInputs = {
  totalSolves: number;
  byEvent: Record<string, number>;
  currentStreak: number | null;
  learning: { puzzle: string; slug: string; learned: number; total: number }[];
  /** Best time per `${puzzle}:${category}` (category: single, ao5, ao12 …). */
  bests: Record<string, number>;
};

export type NextAchievement = {
  slug: string;
  title: string;
  description: string;
  /** 0 to just under 1. */
  progress: number;
  /** "73 of 100 solves", "best 16.42, 1.43 to go". */
  detail: string;
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === "string" ? v : null);
const plural = (n: number, word: string) => `${n.toLocaleString("en-IN")} ${word}${n === 1 ? "" : "s"}`;

/** Progress towards one badge, or null when it can't be measured from these inputs. */
export function badgeProgress(b: BadgeForProgress, x: ProgressInputs): { progress: number; detail: string } | null {
  const v = b.condition.value;
  switch (b.condition.type) {
    case "solve_count": {
      const n = num(v.n);
      if (!n) return null;
      return { progress: x.totalSolves / n, detail: `${x.totalSolves.toLocaleString("en-IN")} of ${plural(n, "solve")}` };
    }
    case "events_count": {
      const n = num(v.n);
      if (!n) return null;
      const events = Object.values(x.byEvent).filter((c) => c > 0).length;
      return { progress: events / n, detail: `${events} of ${n} events` };
    }
    case "streak": {
      const days = num(v.days);
      if (!days || x.currentStreak === null) return null;
      return { progress: x.currentStreak / days, detail: `${plural(x.currentStreak, "day")} in a row, ${days} needed` };
    }
    case "single_under":
    case "average_under": {
      const puzzle = str(v.puzzle);
      const target = num(v.ms);
      const category = b.condition.type === "single_under" ? "single" : `ao${num(v.n) ?? ""}`;
      if (!puzzle || !target) return null;
      const best = x.bests[`${puzzle}:${category}`];
      if (best === undefined) return { progress: 0, detail: `No ${category === "single" ? "single" : category.replace("ao", "Ao")} yet` };
      if (best < target) return null; // met: the server awards it on the next check
      // The gap counts double: a raw time ratio makes every time badge look
      // nearly done (25 s for sub-20 would read 80%); this reads 50%.
      return {
        progress: Math.max(0, 1 - (2 * (best - target)) / target),
        detail: `Best ${formatMs(best)}, ${formatMs(best - target + 10)} to go`,
      };
    }
    case "set_learned": {
      const set = x.learning.find((l) => l.puzzle === str(v.puzzle) && l.slug === str(v.slug));
      if (!set || set.total === 0) return null;
      return { progress: set.learned / set.total, detail: `${set.learned} of ${set.total} cases learned` };
    }
    case "any_set_learned": {
      const sets = x.learning.filter((l) => l.puzzle === str(v.puzzle) && l.total > 0);
      if (sets.length === 0) return null;
      const best = sets.reduce((a, b2) => (b2.learned / b2.total > a.learned / a.total ? b2 : a));
      return { progress: best.learned / best.total, detail: `${best.learned} of ${best.total} cases learned` };
    }
    default:
      return null; // hidden or not measurable here (night owl, marathon)
  }
}

/** The closest unearned, visible badge with some measurable progress; ties keep catalogue order. */
export function nextAchievement(badges: BadgeForProgress[], inputs: ProgressInputs): NextAchievement | null {
  let pick: NextAchievement | null = null;
  for (const b of badges) {
    if (b.unlockedAt || b.hidden) continue;
    const p = badgeProgress(b, inputs);
    if (!p || p.progress >= 1) continue;
    const progress = Math.max(0, Math.min(p.progress, 0.99));
    if (!pick || progress > pick.progress) {
      pick = { slug: b.slug, title: b.title, description: b.description, progress, detail: p.detail };
    }
  }
  return pick;
}
