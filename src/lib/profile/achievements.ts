import { createClient } from "@/lib/supabase/client";
import { toast } from "@/stores/toast-store";

/**
 * Client side of achievements: ask the database to award anything newly
 * earned (award_achievements, see supabase/migrations/20261015000000) and
 * announce it. Signed-in only; the RPC is not callable signed out.
 */

export type Unlock = { slug: string; title: string; description: string };

let inFlight: Promise<Unlock[]> | null = null;

function toUnlocks(raw: unknown): Unlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((u) => {
    if (typeof u !== "object" || u === null) return [];
    const r = u as Record<string, unknown>;
    return typeof r.slug === "string" && typeof r.title === "string"
      ? [{ slug: r.slug, title: r.title, description: typeof r.description === "string" ? r.description : "" }]
      : [];
  });
}

/**
 * Award and return anything newly earned. One check at a time: a burst of
 * quick solves shares the check already running instead of stacking calls.
 * Failures count as "nothing new"; achievements must never get in the way of
 * timing.
 */
export function checkAchievements(): Promise<Unlock[]> {
  inFlight ??= (async () => {
    try {
      const { data, error } = await createClient().rpc("award_achievements");
      if (error) return [];
      return toUnlocks(data);
    } catch {
      return [];
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** The toast text for a batch of unlocks, or null for none. */
export function unlockMessage(unlocks: Unlock[]): string | null {
  if (unlocks.length === 0) return null;
  if (unlocks.length === 1) return `Achievement unlocked: ${unlocks[0].title}`;
  return `${unlocks.length} achievements unlocked`;
}

export function announceUnlocks(unlocks: Unlock[]): void {
  const message = unlockMessage(unlocks);
  if (!message) return;
  // No "View" button: the timer's store has no router to navigate with, and
  // the badges are one tap away under Profile.
  toast({ kind: "pb", message, durationMs: 5000 });
}

/** Parse what the server action passes back (same shape as the RPC). */
export { toUnlocks };
