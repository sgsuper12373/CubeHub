import type { SolveRepository } from "./repo";
import { bestAverageOfN, effectiveMs } from "./stats";
import type { PersonalBest, Session, Solve, SolveMetric } from "./types";

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
      .solves.filter((s) => s.sessionId === sessionId && !s.deletedAt)
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
    // Soft delete, mirroring the cloud repo — keeps undo durable across reloads.
    const solve = read().solves.find((s) => s.id === id);
    if (solve) {
      solve.deletedAt = new Date().toISOString();
      scheduleFlush();
    }
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
    const now = new Date().toISOString();
    for (const s of read().solves)
      if (s.sessionId === sessionId && !s.deletedAt) s.deletedAt = now;
    scheduleFlush();
  },

  async restoreSolves(ids) {
    if (ids.length === 0) return;
    const set = new Set(ids);
    for (const s of read().solves) if (set.has(s.id)) s.deletedAt = null;
    scheduleFlush();
  },

  async loadSolveMetrics(puzzle, { since, limit = 5000 } = {}) {
    return read()
      .solves.filter(
        (s) =>
          s.puzzle === puzzle &&
          !s.deletedAt &&
          (since === undefined || s.createdAt >= since),
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit)
      .map(toMetric);
  },

  async loadPersonalBests(puzzle) {
    const metrics = await localRepo.loadSolveMetrics(puzzle);
    return computePersonalBests(metrics);
  },
};

function toMetric(s: Solve): SolveMetric {
  return {
    id: s.id,
    sessionId: s.sessionId,
    timeMs: s.timeMs,
    penalty: s.penalty,
    effectiveTimeMs: s.effectiveTimeMs,
    createdAt: s.createdAt,
  };
}

/**
 * The local stand-in for the database's PB triggers.
 *
 * Cloud users get `personal_bests` rows maintained by `recompute_all_pbs`;
 * logged-out users have no triggers, so the same values are derived here from
 * whatever localStorage holds. Both sides use the identical window rules —
 * per-session, WCA trim, ties to the earliest — so a cuber's numbers do not
 * change under them when they sign in and their solves sync.
 *
 * `metrics` arrives newest-first, which is the ordering the helpers expect.
 */
function computePersonalBests(metrics: SolveMetric[]): PersonalBest[] {
  const bests: PersonalBest[] = [];

  let bestSingle: SolveMetric | null = null;
  let bestSingleMs: number | null = null;
  for (const s of metrics) {
    const t = effectiveMs(s);
    if (t === null) continue;
    // Strictly less, then earlier on a tie — matching recompute_single_pb's
    // `order by effective_time_ms asc, created_at asc`.
    if (
      bestSingleMs === null ||
      t < bestSingleMs ||
      (t === bestSingleMs && bestSingle !== null && s.createdAt < bestSingle.createdAt)
    ) {
      bestSingleMs = t;
      bestSingle = s;
    }
  }
  if (bestSingle !== null && bestSingleMs !== null) {
    bests.push({
      category: "single",
      timeMs: bestSingleMs,
      solveId: bestSingle.id,
      achievedAt: bestSingle.createdAt,
    });
  }

  for (const [category, n] of [
    ["ao5", 5],
    ["ao12", 12],
    ["ao50", 50],
    ["ao100", 100],
  ] as const) {
    const best = bestAverageOfN(metrics, n);
    if (best) {
      bests.push({
        category,
        timeMs: best.timeMs,
        solveId: best.solveId,
        achievedAt: best.achievedAt,
      });
    }
  }

  return bests;
}
