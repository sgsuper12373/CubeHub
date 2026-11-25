import { EMPTY_SESSION, parseSession, type SessionMemory, type SolvingStretch } from "@/lib/companion/director";

/**
 * Where the Director's memory lives. Session caps in sessionStorage (they
 * reset with the tab, as "per session" means); page visits and the solving
 * stretch in localStorage. Storage failures (private mode, quota) fall back
 * to silence-friendly defaults.
 */
const SESSION_KEY = "cubehub.companion.session.v1";
const VISITS_KEY = "cubehub.companion.visits.v1";
const STRETCH_KEY = "cubehub.companion.stretch.v1";

function read(storage: () => Storage, key: string): unknown {
  try {
    const raw = storage().getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(storage: () => Storage, key: string, value: unknown): void {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    // Full or blocked storage: the caps just don't persist.
  }
}

export function loadSessionMemory(): SessionMemory {
  return parseSession(read(() => sessionStorage, SESSION_KEY)) ?? EMPTY_SESSION;
}

export function saveSessionMemory(session: SessionMemory): void {
  write(() => sessionStorage, SESSION_KEY, session);
}

type Visits = Record<string, number>;

function loadVisits(): Visits {
  const v = read(() => localStorage, VISITS_KEY);
  const out: Visits = {};
  if (v && typeof v === "object") {
    for (const [k, n] of Object.entries(v as Record<string, unknown>)) if (typeof n === "number" && Number.isFinite(n)) out[k] = n;
  }
  return out;
}

/** Records a visit to `page` now; returns when it was previously opened (null on a first visit). */
export function noteVisit(page: string, now: number): number | null {
  const visits = loadVisits();
  const previous = visits[page] ?? null;
  visits[page] = now;
  write(() => localStorage, VISITS_KEY, visits);
  return previous;
}

export function loadStretch(): SolvingStretch | null {
  const v = read(() => localStorage, STRETCH_KEY) as Partial<SolvingStretch> | null;
  if (!v || typeof v.startedAt !== "number" || typeof v.lastSolveAt !== "number") return null;
  return { startedAt: v.startedAt, lastSolveAt: v.lastSolveAt, remindedOn: typeof v.remindedOn === "string" ? v.remindedOn : null };
}

export function saveStretch(stretch: SolvingStretch): void {
  write(() => localStorage, STRETCH_KEY, stretch);
}
