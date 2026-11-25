/**
 * Cubby's settings (docs/cubby-cubing-companion.md → Settings). Parsing is
 * field by field: a bad or missing field falls back to its default, so a
 * stored record from an older version never resets everything.
 */
export const COMPANION_MODES = ["on", "quiet", "off"] as const;
export const REACTION_LEVELS = ["all", "pb", "off"] as const;
export const MOTION_LEVELS = ["system", "full", "reduced"] as const;

export type CompanionMode = (typeof COMPANION_MODES)[number];
export type ReactionLevel = (typeof REACTION_LEVELS)[number];
export type MotionLevel = (typeof MOTION_LEVELS)[number];

export interface CompanionSettings {
  /** On; Quiet: tours and lines only on request; Off: hidden. */
  mode: CompanionMode;
  /** What the player calls their companion; used as {name} in every line. */
  name: string;
  autoTours: boolean;
  reactions: ReactionLevel;
  /** Stored now; the coach itself is v1.5. */
  inspectionCoach: boolean;
  bldAnimation: boolean;
  motion: MotionLevel;
}

export const DEFAULT_NAME = "Cubby";
export const NAME_MAX = 20;

export const DEFAULT_SETTINGS: CompanionSettings = {
  mode: "on",
  name: DEFAULT_NAME,
  autoTours: true,
  reactions: "all",
  inspectionCoach: false,
  bldAnimation: true,
  motion: "system",
};

/** A usable name: trimmed, single-spaced, no control characters, at most 20 characters; empty → Cubby. */
export function normalizeName(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_NAME;
  const cleaned = Array.from(raw.replace(/\s+/g, " ").trim())
    .filter((ch) => {
      const c = ch.codePointAt(0)!;
      return c >= 0x20 && c !== 0x7f && !(c >= 0x80 && c <= 0x9f);
    })
    .join("")
    .slice(0, NAME_MAX)
    .trim();
  return cleaned || DEFAULT_NAME;
}

function oneOf<T extends string>(values: readonly T[], v: unknown, fallback: T): T {
  return (values as readonly unknown[]).includes(v) ? (v as T) : fallback;
}

export function parseCompanionSettings(raw: unknown): CompanionSettings {
  const v = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_SETTINGS;
  return {
    mode: oneOf(COMPANION_MODES, v.mode, d.mode),
    name: v.name === undefined ? d.name : normalizeName(v.name),
    autoTours: typeof v.autoTours === "boolean" ? v.autoTours : d.autoTours,
    reactions: oneOf(REACTION_LEVELS, v.reactions, d.reactions),
    inspectionCoach: typeof v.inspectionCoach === "boolean" ? v.inspectionCoach : d.inspectionCoach,
    bldAnimation: typeof v.bldAnimation === "boolean" ? v.bldAnimation : d.bldAnimation,
    motion: oneOf(MOTION_LEVELS, v.motion, d.motion),
  };
}

/** Whether Cubby moves: the setting, else the system preference. */
export function prefersReducedMotion(settings: CompanionSettings, systemReduced: boolean): boolean {
  if (settings.motion === "reduced") return true;
  if (settings.motion === "full") return false;
  return systemReduced;
}
