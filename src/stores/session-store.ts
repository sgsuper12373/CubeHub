import { create } from "zustand";

import { localRepo } from "@/lib/timer/repo-local";
import type {
  Penalty,
  Session,
  Solve,
  TimerPuzzle,
} from "@/lib/timer/types";

/** In-memory cap; older solves stay in the repo and load with Phase 2 tooling. */
const SOLVE_LIMIT = 500;

interface SessionStore {
  backend: "local" | "cloud";
  hydrated: boolean;
  puzzle: TimerPuzzle;
  sessions: Session[];
  activeSessionId: string | null;
  /** Active session only, newest first. */
  solves: Solve[];
  syncing: boolean;

  hydrate(userId: string | null): Promise<void>;
  addSolve(s: Omit<Solve, "effectiveTimeMs" | "sessionId">): Promise<void>;
  setPenalty(solveId: string, p: Penalty): Promise<void>;
  deleteSolve(solveId: string): Promise<void>;
  createSession(name: string): Promise<void>;
  switchSession(id: string): Promise<void>;
  renameSession(id: string, name: string): Promise<void>;
  /** Clears the active session's solves; the returned undo restores them. */
  resetSession(): Promise<{ undo: () => void }>;
  setPuzzle(p: TimerPuzzle): Promise<void>;
}

// Cloud backend arrives with the sync step; until then every user works
// against localStorage and sign-in migrates it (docs/roadmap.md Phase 1).
const repo = localRepo;

let hydration: Promise<void> | null = null;

/** Load (or lazily create) the sessions for a puzzle and pick the active one. */
async function loadPuzzle(puzzle: TimerPuzzle) {
  let sessions = await repo.loadSessions(puzzle);
  if (sessions.length === 0) {
    const initial: Session = {
      id: crypto.randomUUID(),
      puzzle,
      name: "Session 1",
      isActive: true,
      orderIndex: 0,
    };
    await repo.upsertSession(initial);
    sessions = [initial];
  }
  const active = sessions.find((s) => s.isActive) ?? sessions[0];
  const solves = await repo.loadSolves(active.id, SOLVE_LIMIT);
  return { sessions, active, solves };
}

export const useSessionStore = create<SessionStore>()((set, get) => ({
  backend: "local",
  hydrated: false,
  puzzle: "333",
  sessions: [],
  activeSessionId: null,
  solves: [],
  syncing: false,

  hydrate: (userId) => {
    void userId; // selects the cloud backend once repo-supabase lands
    hydration ??= (async () => {
      const { sessions, active, solves } = await loadPuzzle(get().puzzle);
      set({ sessions, activeSessionId: active.id, solves, hydrated: true });
    })();
    return hydration;
  },

  addSolve: async (input) => {
    await get().hydrate(null);
    const sessionId = get().activeSessionId;
    if (!sessionId) return;
    const solve: Solve = { ...input, sessionId, effectiveTimeMs: null };
    set({ solves: [solve, ...get().solves].slice(0, SOLVE_LIMIT) });
    await repo.saveSolve(solve);
  },

  setPenalty: async (solveId, p) => {
    set({
      solves: get().solves.map((s) =>
        s.id === solveId ? { ...s, penalty: p, effectiveTimeMs: null } : s,
      ),
    });
    await repo.updatePenalty(solveId, p);
  },

  deleteSolve: async (solveId) => {
    set({ solves: get().solves.filter((s) => s.id !== solveId) });
    await repo.deleteSolve(solveId);
  },

  createSession: async (name) => {
    const s = get();
    const session: Session = {
      id: crypto.randomUUID(),
      puzzle: s.puzzle,
      name,
      isActive: true,
      orderIndex:
        s.sessions.reduce((max, x) => Math.max(max, x.orderIndex), -1) + 1,
    };
    const sessions = [
      ...s.sessions.map((x) =>
        x.isActive ? { ...x, isActive: false } : x,
      ),
      session,
    ];
    set({ sessions, activeSessionId: session.id, solves: [] });
    for (const x of sessions) await repo.upsertSession(x);
  },

  switchSession: async (id) => {
    const s = get();
    if (id === s.activeSessionId) return;
    const sessions = s.sessions.map((x) => ({ ...x, isActive: x.id === id }));
    const solves = await repo.loadSolves(id, SOLVE_LIMIT);
    set({ sessions, activeSessionId: id, solves });
    for (const x of sessions) await repo.upsertSession(x);
  },

  renameSession: async (id, name) => {
    const trimmed = name.trim().slice(0, 60); // DB check: name ≤ 60 chars
    if (!trimmed) return;
    const sessions = get().sessions.map((x) =>
      x.id === id ? { ...x, name: trimmed } : x,
    );
    set({ sessions });
    const changed = sessions.find((x) => x.id === id);
    if (changed) await repo.upsertSession(changed);
  },

  resetSession: async () => {
    const s = get();
    const sessionId = s.activeSessionId;
    const cleared = s.solves;
    if (!sessionId || cleared.length === 0) return { undo: () => {} };

    set({ solves: [] });
    await repo.deleteSolvesInSession(sessionId);

    return {
      undo: () => {
        void (async () => {
          for (const solve of cleared) await repo.saveSolve(solve);
          if (get().activeSessionId === sessionId) set({ solves: cleared });
        })();
      },
    };
  },

  setPuzzle: async (p) => {
    if (get().puzzle === p) return;
    set({ puzzle: p, hydrated: false });
    const { sessions, active, solves } = await loadPuzzle(p);
    if (get().puzzle !== p) return; // switched again mid-load
    set({ sessions, activeSessionId: active.id, solves, hydrated: true });
  },
}));
