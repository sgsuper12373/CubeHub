/**
 * The events the timer offers, in dropdown order. The single place that knows
 * how an event is named, scrambled and drawn: everything else imports from here
 * rather than switching on puzzle ids.
 *
 * `id` is the DB `puzzle_type` enum value. cubing.js names most events the
 * same way, except Megaminx (`minx`) and Pyraminx (`pyram`).
 */
export const TIMER_EVENTS = [
  { id: "333", label: "3x3", cubingEvent: "333", twisty: "3x3x3" },
  { id: "222", label: "2x2", cubingEvent: "222", twisty: "2x2x2" },
  { id: "444", label: "4x4", cubingEvent: "444", twisty: "4x4x4" },
  { id: "555", label: "5x5", cubingEvent: "555", twisty: "5x5x5" },
  { id: "333oh", label: "3x3 OH", cubingEvent: "333oh", twisty: "3x3x3" },
  { id: "pyra", label: "Pyraminx", cubingEvent: "pyram", twisty: "pyraminx" },
  { id: "skewb", label: "Skewb", cubingEvent: "skewb", twisty: "skewb" },
  { id: "mega", label: "Megaminx", cubingEvent: "minx", twisty: "megaminx" },
] as const;

export type TimerEvent = (typeof TIMER_EVENTS)[number];
export type TimerEventId = TimerEvent["id"];

export const DEFAULT_EVENT: TimerEventId = "333";

const BY_ID = new Map<string, TimerEvent>(TIMER_EVENTS.map((e) => [e.id, e]));

export function isTimerEvent(value: unknown): value is TimerEventId {
  return typeof value === "string" && BY_ID.has(value);
}

/** The event's registry entry. Unknown ids fall back to 3x3. */
export function timerEvent(id: string): TimerEvent {
  return BY_ID.get(id) ?? BY_ID.get(DEFAULT_EVENT)!;
}

/** Display name, e.g. "Pyraminx". Unknown ids are shown as-is. */
export function eventLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

/** True for events whose scrambles are face-turn algs on an NxN cube. */
export function isCubeEvent(id: string): boolean {
  return /^\dx\dx\d$/.test(timerEvent(id).twisty);
}

// ── Last-used event (per device) ──────────────────────────────────────────

const EVENT_KEY = "cubehub.timer.event";

export function loadLastEvent(): TimerEventId {
  try {
    const raw = localStorage.getItem(EVENT_KEY);
    return isTimerEvent(raw) ? raw : DEFAULT_EVENT;
  } catch {
    return DEFAULT_EVENT;
  }
}

export function saveLastEvent(id: TimerEventId): void {
  try {
    localStorage.setItem(EVENT_KEY, id);
  } catch {
    // Private mode or quota: the event just isn't remembered.
  }
}
