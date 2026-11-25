import type { ComponentType } from "react";

/**
 * Cubby's renderer contract (docs/cubby-cubing-companion.md → Animation
 * system). Pages and the Director never touch the drawing code: they set
 * named inputs and fire triggers, and the renderer decides how to blend
 * between poses. v1 ships an SVG renderer; a Rive renderer can implement the
 * same interface with a .riv file that uses these exact input names.
 */

export const MOODS = ["idle", "happy", "concerned", "sleepy"] as const;
export type CubbyMood = (typeof MOODS)[number];

export const DIRECTIONS = ["left", "right", "up", "down"] as const;
export type CubbyDirection = (typeof DIRECTIONS)[number];

export const BLD_PHASES = ["off", "memo", "execute", "finish"] as const;
export type BldPhase = (typeof BLD_PHASES)[number];

/**
 * One-shot reactions: they play once and fall back to Idle. `shrug` is the
 * BLD DNF ending ("BLD is brutal. Next one."); the spec's four are first.
 */
export const TRIGGERS = ["wave", "celebrate", "wince", "thumbsUp", "shrug"] as const;
export type CubbyTrigger = (typeof TRIGGERS)[number];

/** Held inputs: they last as long as they're set. */
export interface CubbyInputs {
  mood: CubbyMood;
  isTalking: boolean;
  /** Where a tour step is, relative to Cubby; null when not pointing. */
  pointAt: CubbyDirection | null;
  isThinking: boolean;
  bldPhase: BldPhase;
  /** The site theme's name. The SVG reads colours from CSS tokens itself; a Rive file would map it. */
  theme: string;
}

export type CubbyInputName = keyof CubbyInputs;

export const DEFAULT_INPUTS: CubbyInputs = {
  mood: "idle",
  isTalking: false,
  pointAt: null,
  isThinking: false,
  bldPhase: "off",
  theme: "slate",
};

export type CubbyEvent =
  | { type: "triggerStart"; trigger: CubbyTrigger }
  | { type: "triggerEnd"; trigger: CubbyTrigger };

export interface CubbyViewProps {
  /** Rendered height in px: 56 docked, 120–160 on stage. */
  size: number;
  /** Static poses only: no loops, no tweening (reduced motion). */
  reduced?: boolean;
  className?: string;
}

export interface CubbyRenderer {
  /** Which renderer this is ("svg", later "rive"); for debugging only. */
  readonly kind: string;
  setInput<K extends CubbyInputName>(name: K, value: CubbyInputs[K]): void;
  fire(trigger: CubbyTrigger): void;
  /** Subscribe to renderer events; returns the unsubscribe. */
  onEvent(cb: (event: CubbyEvent) => void): () => void;
  /** Stop timers and listeners. The renderer can't be used afterwards. */
  destroy(): void;
  /** The component that draws this renderer. Callers render it and never know which renderer it is. */
  readonly View: ComponentType<CubbyViewProps>;
}

/** True when `value` is valid for the named input (renderers ignore anything else). */
export function isValidInput(name: string, value: unknown): boolean {
  switch (name) {
    case "mood":
      return (MOODS as readonly unknown[]).includes(value);
    case "isTalking":
    case "isThinking":
      return typeof value === "boolean";
    case "pointAt":
      return value === null || (DIRECTIONS as readonly unknown[]).includes(value);
    case "bldPhase":
      return (BLD_PHASES as readonly unknown[]).includes(value);
    case "theme":
      return typeof value === "string" && value.length > 0;
    default:
      return false;
  }
}
