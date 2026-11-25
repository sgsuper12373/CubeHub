import {
  DEFAULT_INPUTS,
  isValidInput,
  type CubbyDirection,
  type CubbyInputName,
  type CubbyInputs,
  type CubbyTrigger,
} from "@/lib/companion/renderer";

/**
 * The SVG renderer's state machine, as a pure reducer: held inputs plus at
 * most one one-shot reaction. `poseOf()` turns that into what the art draws.
 * Idle is the centre; a one-shot wins over held inputs while it plays, then
 * the held inputs show again.
 */

export const EXPRESSIONS = ["idle", "happy", "grin", "surprised", "concerned", "focused", "sleepy", "talking"] as const;
export type Expression = (typeof EXPRESSIONS)[number];

export type ArmPose = "rest" | "wave" | "up" | "thumbsUp" | "shrug" | "point" | "hold";
export type BodyMotion = "breathe" | "bounce" | "spin" | "flinch" | "still";

export interface Pose {
  expression: Expression;
  arms: ArmPose;
  body: BodyMotion;
  /** Where the eyes (and a pointing arm) look; null = straight ahead. */
  look: CubbyDirection | null;
  /** BLD execution: a blindfold over the eyes. */
  blindfold: boolean;
  /** BLD: holding a tiny cube. */
  holdingCube: boolean;
  /** BLD memo: letter pairs drift by. */
  memo: boolean;
}

/** How long each one-shot plays before falling back (ms). Within the spec's 150–400 ms per beat. */
export const TRIGGER_MS: Record<CubbyTrigger, number> = {
  wave: 900,
  celebrate: 1200,
  wince: 400,
  thumbsUp: 900,
  shrug: 900,
};

export interface SvgState {
  inputs: CubbyInputs;
  oneShot: { trigger: CubbyTrigger; id: number } | null;
}

export const INITIAL_STATE: SvgState = { inputs: DEFAULT_INPUTS, oneShot: null };

export type SvgAction =
  | { type: "setInput"; name: CubbyInputName; value: unknown }
  | { type: "fire"; trigger: CubbyTrigger; id: number }
  | { type: "end"; id: number };

export function reduce(state: SvgState, action: SvgAction): SvgState {
  switch (action.type) {
    case "setInput":
      if (!isValidInput(action.name, action.value)) return state;
      if (state.inputs[action.name] === action.value) return state;
      return { ...state, inputs: { ...state.inputs, [action.name]: action.value } };
    case "fire":
      // A new one-shot replaces the playing one: the latest event is the one that matters.
      return { ...state, oneShot: { trigger: action.trigger, id: action.id } };
    case "end":
      // Only the one-shot that started the timer may end it.
      return state.oneShot?.id === action.id ? { ...state, oneShot: null } : state;
  }
}

const MOOD_EXPRESSION: Record<CubbyInputs["mood"], Expression> = {
  idle: "idle",
  happy: "happy",
  concerned: "concerned",
  sleepy: "sleepy",
};

export function poseOf(state: SvgState): Pose {
  const { inputs, oneShot } = state;
  const base: Pose = {
    expression: MOOD_EXPRESSION[inputs.mood],
    arms: "rest",
    body: "breathe",
    look: inputs.pointAt,
    blindfold: false,
    holdingCube: false,
    memo: false,
  };

  // BLD phases hold the cube; memo scans, execution is blindfolded.
  if (inputs.bldPhase === "memo") {
    Object.assign(base, { expression: "focused", arms: "hold", holdingCube: true, memo: true, look: null });
  } else if (inputs.bldPhase === "execute") {
    Object.assign(base, { expression: "focused", arms: "hold", holdingCube: true, blindfold: true, look: null });
  } else if (inputs.bldPhase === "finish") {
    Object.assign(base, { arms: "hold", holdingCube: true });
  }

  if (inputs.isThinking) Object.assign(base, { expression: "focused", look: "up" });
  if (inputs.pointAt && inputs.bldPhase === "off") base.arms = "point";
  if (inputs.isTalking) base.expression = "talking";

  if (oneShot) {
    switch (oneShot.trigger) {
      case "celebrate":
        return { ...base, expression: "grin", arms: "up", body: "spin", blindfold: false };
      case "wave":
        return { ...base, expression: base.expression === "talking" ? "talking" : "happy", arms: "wave", body: "bounce" };
      case "wince":
        return { ...base, expression: "concerned", body: "flinch" };
      case "thumbsUp":
        return { ...base, expression: "happy", arms: "thumbsUp", body: "bounce" };
      case "shrug":
        return { ...base, expression: "concerned", arms: "shrug", blindfold: false, holdingCube: false };
    }
  }
  return base;
}
