/**
 * Home's daily solve goal (docs/home-plan.md → Streak and daily goal). The
 * timer's goal storage holds per-puzzle *time* goals, so this is its own key.
 * Per device for now: a synced setting would need a column (decisions.md → Home).
 */
const KEY = "cubehub.home.dailyGoal";
export const DEFAULT_DAILY_GOAL = 25;
export const MAX_DAILY_GOAL = 500;

export function parseDailyGoal(raw: string | null | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 1 && n <= MAX_DAILY_GOAL ? n : DEFAULT_DAILY_GOAL;
}

export function loadDailyGoal(): number {
  try {
    return parseDailyGoal(localStorage.getItem(KEY));
  } catch {
    return DEFAULT_DAILY_GOAL;
  }
}

const listeners = new Set<() => void>();

/** For useSyncExternalStore: the goal changes only through saveDailyGoal. */
export function subscribeDailyGoal(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function saveDailyGoal(goal: number): number {
  const clean = parseDailyGoal(String(Math.round(goal)));
  try {
    localStorage.setItem(KEY, String(clean));
  } catch {
    // Blocked storage: the goal holds for this visit.
  }
  for (const l of listeners) l();
  return clean;
}
