import type { CompanionSettings } from "@/lib/companion/settings";

/**
 * The Director: the one gatekeeper between "something could be said" and
 * the screen (docs/cubby-cubing-companion.md → Technical architecture and
 * Anti-annoyance rules). Pure: the provider passes the context in and
 * records what was shown. A companion that interrupts a speedcuber gets
 * muted forever, so every rule here errs towards silence.
 */

export type TimerPhaseLike = "idle" | "holding" | "ready" | "running" | "stopped" | "inspecting";

export type ReactionKind = "pb" | "penalty" | "mastered" | "error" | "stretch" | "misstop" | "solved" | "bldDnf";

export type Candidate =
  | { kind: "greeting"; page: string }
  | { kind: "tour"; page: string; prompted: boolean }
  | { kind: "reaction"; page: string | null; reaction: ReactionKind; hasLine: boolean }
  /** Something the player asked for from the dock (a tip, What's new). */
  | { kind: "requested"; page: string | null }
  /** The BLD solve animation: the one thing allowed while the timer runs. */
  | { kind: "bld" };

export interface SessionMemory {
  /** Unprompted bubbles shown this session, per page. */
  bubbles: Record<string, number>;
  /** Pages greeted this session. */
  greeted: string[];
}

export const EMPTY_SESSION: SessionMemory = { bubbles: {}, greeted: [] };

export interface DirectorContext {
  phase: TimerPhaseLike;
  inInspection: boolean;
  settings: CompanionSettings;
  session: SessionMemory;
  /** When this page was last opened before now (ms), or null on a first visit. */
  lastOpenedAt: number | null;
  now: number;
}

/** What may be shown: the animation, and whether a speech bubble may go with it. */
export type Decision = { show: false; reason: string } | { show: true; bubble: boolean };

export const GREETING_COOLDOWN_MS = 10 * 60_000;
export const BUBBLES_PER_PAGE = 1;

/** The timer owns the screen from the first hold until the solve stops, and through inspection. */
export function isQuietPhase(phase: TimerPhaseLike, inInspection: boolean): boolean {
  return inInspection || phase === "holding" || phase === "ready" || phase === "running" || phase === "inspecting";
}

const no = (reason: string): Decision => ({ show: false, reason });

export function decide(c: Candidate, ctx: DirectorContext): Decision {
  const { settings } = ctx;
  if (settings.mode === "off") return no("off");

  if (c.kind === "bld") {
    return settings.bldAnimation ? { show: true, bubble: false } : no("bld-animation-off");
  }

  if (isQuietPhase(ctx.phase, ctx.inInspection)) return no("timer-busy");

  if (c.kind === "requested") return { show: true, bubble: true };

  if (c.kind === "tour") {
    if (c.prompted) return { show: true, bubble: true };
    if (settings.mode === "quiet") return no("quiet");
    if (!settings.autoTours) return no("auto-tours-off");
    return { show: true, bubble: true };
  }

  // Everything below is unprompted.
  if (settings.mode === "quiet") return no("quiet");
  const page = c.kind === "greeting" ? c.page : (c.page ?? "_");
  const bubbleLeft = (ctx.session.bubbles[page] ?? 0) < BUBBLES_PER_PAGE;

  if (c.kind === "greeting") {
    if (ctx.session.greeted.includes(c.page)) return no("greeted");
    if (ctx.lastOpenedAt !== null && ctx.now - ctx.lastOpenedAt < GREETING_COOLDOWN_MS) return no("recent-visit");
    if (!bubbleLeft) return no("bubble-cap");
    return { show: true, bubble: true };
  }

  // Reactions.
  if (settings.reactions === "off") return no("reactions-off");
  if (settings.reactions === "pb" && c.reaction !== "pb") return no("pb-only");
  // The animation always plays; a line only while the page's bubble is unused.
  return { show: true, bubble: c.hasLine && bubbleLeft };
}

/** The session memory after showing something. */
export function recordShown(session: SessionMemory, c: Candidate, decision: Decision): SessionMemory {
  if (!decision.show) return session;
  let next = session;
  const unprompted = c.kind === "greeting" || c.kind === "reaction";
  if (decision.bubble && unprompted) {
    const page = c.kind === "greeting" ? c.page : (c.page ?? "_");
    next = { ...next, bubbles: { ...next.bubbles, [page]: (next.bubbles[page] ?? 0) + 1 } };
  }
  if (c.kind === "greeting" && !next.greeted.includes(c.page)) next = { ...next, greeted: [...next.greeted, c.page] };
  return next;
}

export function parseSession(raw: unknown): SessionMemory {
  if (!raw || typeof raw !== "object") return EMPTY_SESSION;
  const v = raw as Record<string, unknown>;
  const bubbles: Record<string, number> = {};
  if (v.bubbles && typeof v.bubbles === "object") {
    for (const [k, n] of Object.entries(v.bubbles as Record<string, unknown>)) {
      if (typeof n === "number" && Number.isFinite(n) && n >= 0) bubbles[k] = n;
    }
  }
  const greeted = Array.isArray(v.greeted) ? v.greeted.filter((x): x is string => typeof x === "string") : [];
  return { bubbles, greeted };
}

// ── The 60-minute stretch reminder ──────────────────────────────────────────

/** A gap longer than this ends a stretch of continuous solving. */
export const SOLVING_GAP_MS = 10 * 60_000;
export const STRETCH_AFTER_MS = 60 * 60_000;

export interface SolvingStretch {
  startedAt: number;
  lastSolveAt: number;
  /** The local day ("YYYY-MM-DD") the reminder was last given. */
  remindedOn: string | null;
}

/**
 * Records a solve; returns the new stretch and whether to suggest a break:
 * at most once per day, after 60+ minutes without a 10-minute gap.
 */
export function trackSolving(prev: SolvingStretch | null, at: number, day: string): { stretch: SolvingStretch; remind: boolean } {
  const continuing = prev !== null && at - prev.lastSolveAt <= SOLVING_GAP_MS && at >= prev.lastSolveAt;
  const stretch: SolvingStretch = {
    startedAt: continuing ? prev.startedAt : at,
    lastSolveAt: at,
    remindedOn: prev?.remindedOn ?? null,
  };
  const remind = at - stretch.startedAt >= STRETCH_AFTER_MS && stretch.remindedOn !== day;
  if (remind) stretch.remindedOn = day;
  return { stretch, remind };
}
