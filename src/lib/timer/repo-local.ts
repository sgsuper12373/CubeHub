import type { SolveRepository } from "./repo";
import type { Session, Solve } from "./types";

/**
 * localStorage-backed repository for logged-out users.
 *
 * One versioned key holds everything; reads hit an in-memory cache and
 * writes flush in a microtask, so a burst of updates (e.g. undoing a session
 * reset) serializes once. Losing a microtask on tab kill costs at most one
 * action — acceptable for local-only data.
 *
 * The cache is only populated in the browser; on the server every call sees
 * an empty snapshot (the store hydrates client-side anyway).
 */
const STORAGE_KEY = "cubehub.timer.v1";

interface LocalData {
  sessions: Session[];
  solves: Solve[];
}

let cache: LocalData | null = null;
let flushScheduled = false;

function read(): LocalData {
  if (cache) return cache;
  if (typeof window === "undefined") return { sessions: [], solves: [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "");
    cache = {
      sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
      solves: Array.isArray(parsed?.solves) ? parsed.solves : [],
    };
  } catch {
    cache = { sessions: [], solves: [] };
  }
  return cache;
}

function scheduleFlush(): void {
  if (flushScheduled || typeof window === "undefined") return;
  flushScheduled = true;
  queueMicrotask(() => {
    flushScheduled = false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(read()));
    } catch {
      // Quota/private-mode failures: keep working from memory.
    }
  });
}

export const localRepo: SolveRepository = {
  async loadSessions(puzzle) {
    return read()
      .sessions.filter((s) => s.puzzle === puzzle)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  },

  async loadSolves(sessionId, limit = 500) {
    return read()
      .solves.filter((s) => s.sessionId === sessionId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit);
  },

  async saveSolve(solve) {
    const data = read();
    if (!data.solves.some((s) => s.id === solve.id)) data.solves.push(solve);
    scheduleFlush();
  },

  async updatePenalty(id, penalty) {
    const solve = read().solves.find((s) => s.id === id);
    if (solve) {
      solve.penalty = penalty;
      solve.effectiveTimeMs = null; // local rows derive it; never stale-cache
      scheduleFlush();
    }
  },

  async updateNotes(id, notes) {
    const solve = read().solves.find((s) => s.id === id);
    if (solve) {
      solve.notes = notes;
      scheduleFlush();
    }
  },

  async deleteSolve(id) {
    const data = read();
    data.solves = data.solves.filter((s) => s.id !== id);
    scheduleFlush();
  },

  async upsertSession(session) {
    const data = read();
    const i = data.sessions.findIndex((s) => s.id === session.id);
    if (i === -1) data.sessions.push(session);
    else data.sessions[i] = session;
    scheduleFlush();
  },

  async deleteSession(id) {
    const data = read();
    data.sessions = data.sessions.filter((s) => s.id !== id);
    data.solves = data.solves.filter((s) => s.sessionId !== id);
    scheduleFlush();
  },

  async deleteSolvesInSession(sessionId) {
    const data = read();
    data.solves = data.solves.filter((s) => s.sessionId !== sessionId);
    scheduleFlush();
  },
};
