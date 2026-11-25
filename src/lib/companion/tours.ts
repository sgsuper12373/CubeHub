import type { PageContent, TourStep } from "@/lib/companion/content";

/**
 * Tour progress and selection (docs/cubby-cubing-companion.md → Page tours).
 * Progress is `{ page: { seen, skipped, offered } }`: `seen` is the tour
 * version last finished or skipped. When a page's tour gets new steps
 * (a higher version), returning cubers get a What's new tour of only the
 * steps added since.
 */
export interface TourProgress {
  /** The tour version last finished or skipped; 0 = never. */
  seen: number;
  /** The last tour was skipped or closed early. */
  skipped: boolean;
  /** After a skip, the dock offered it once more (the dot was seen). */
  offered: boolean;
}

export type ToursRecord = Record<string, TourProgress>;

export const NO_PROGRESS: TourProgress = { seen: 0, skipped: false, offered: false };

export function parseTours(raw: unknown): ToursRecord {
  const out: ToursRecord = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [page, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[a-z0-9-]{1,40}$/.test(page) || !v || typeof v !== "object") continue;
    const p = v as Record<string, unknown>;
    const seen = Number.isInteger(p.seen) && (p.seen as number) >= 0 ? (p.seen as number) : 0;
    out[page] = { seen, skipped: p.skipped === true, offered: p.offered === true };
  }
  return out;
}

export type TourKind = "full" | "whatsNew";

/** What the page's tour would show now: the full tour, a What's new, or nothing new. */
export function tourKindFor(content: PageContent, progress: TourProgress | undefined): TourKind | null {
  const p = progress ?? NO_PROGRESS;
  if (content.tour.length === 0) return null;
  if (p.seen === 0) return "full";
  if (p.seen < content.tourVersion && content.tour.some((s) => s.since > p.seen)) return "whatsNew";
  return null;
}

/** The steps for a tour: all of them, or only those added since the version seen. */
export function stepsFor(content: PageContent, kind: TourKind, progress: TourProgress | undefined): TourStep[] {
  if (kind === "full") return content.tour;
  const seen = progress?.seen ?? 0;
  return content.tour.filter((s) => s.since > seen);
}

/** Whether a tour starts by itself on this visit (the Director still has the last word). */
export function shouldAutoStart(content: PageContent, progress: TourProgress | undefined): TourKind | null {
  return tourKindFor(content, progress);
}

/**
 * Progress after a tour ends. Finishing or skipping both mark the version
 * seen. Skipping a tour that started by itself earns one more offer (the
 * dock's dot); skipping one the cuber asked for doesn't: Cubby stays quiet.
 */
export function finishTour(content: PageContent, progress: TourProgress | undefined, how: "done" | "skipped", prompted = false): TourProgress {
  if (how === "done") return { seen: content.tourVersion, skipped: false, offered: progress?.offered ?? false };
  return { seen: content.tourVersion, skipped: true, offered: prompted };
}

/**
 * The dock's dot (never a count): something unseen on this page — a tour or a
 * What's new the cuber hasn't had, or a skipped tour not yet offered again.
 */
export function hasUnseen(content: PageContent | null, progress: TourProgress | undefined): boolean {
  if (!content || content.tour.length === 0) return false;
  if (tourKindFor(content, progress) !== null) return true;
  return progress?.skipped === true && progress.offered === false;
}

/** Progress once the dock has offered a skipped tour again (the menu was opened). */
export function markOffered(progress: TourProgress | undefined): TourProgress {
  const p = progress ?? NO_PROGRESS;
  return p.skipped ? { ...p, offered: true } : p;
}

/** Index of the next step at or after `from` whose target is on the page (or that needs none); -1 if none. */
export function nextAvailableStep(steps: TourStep[], from: number, hasTarget: (target: string) => boolean, direction: 1 | -1 = 1): number {
  for (let i = from; i >= 0 && i < steps.length; i += direction) {
    const t = steps[i].target;
    if (t === null || hasTarget(t)) return i;
  }
  return -1;
}
