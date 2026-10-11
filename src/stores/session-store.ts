import { create } from "zustand";

import { localRepo } from "@/lib/timer/repo-local";
import type { SolveRepository } from "@/lib/timer/repo";
import { createSupabaseRepo } from "@/lib/timer/repo-supabase";
import { hasLocalData, syncLocalToCloud } from "@/lib/timer/sync";
import { knownBestsFrom, type KnownBests } from "@/lib/timer/pb-detect";
import type {
  Penalty,
  Session,
  Solve,
  TimerPuzzle,
} from "@/lib/timer/types";
import { toast } from "@/stores/toast-store";

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
  /** All-time bests for the puzzle, for PB detection (see pb-detect.ts). */
  knownBests: KnownBests;
  syncing: boolean;

  hydrate(userId: string | null): Promise<void>;
  addSolve(s: Omit<Solve, "effectiveTimeMs" | "sessionId">): Promise<void>;
  setPenalty(solveId: string, p: Penalty): Promise<void>;
  setNotes(solveId: string, notes: string): Promise<void>;
  deleteSolve(solveId: string): Promise<void>;
  createSession(name: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  switchSession(id: string): Promise<void>;
  renameSession(id: string, name: string): Promise<void>;
  /** Clears the active session's solves; the returned undo restores them. */
  resetSession(): Promise<{ undo: () => void }>;
  /** Un-delete solves by id and refresh the active list. Safe to call from an undo toast. */
  restoreSolves(ids: string[]): Promise<void>;
  /** "Recently deleted" for the current puzzle, most recently deleted first. */
  loadDeletedSolves(): Promise<Solve[]>;
  /** Permanently delete solves that are already in "Recently deleted". */
  purgeSolves(ids: string[]): Promise<void>;
  setPuzzle(p: TimerPuzzle): Promise<void>;
  /** After a solve: the bests as `detectRecords` updated them. */
  setKnownBests(known: KnownBests): void;

  /** Trigger local → cloud sync. Called from AuthListener on SIGNED_IN. */
  syncToCloud(userId: string): Promise<void>;
}

/** The active repo — swapped between local and cloud at hydrate time. */
let repo: SolveRepository = localRepo;
let activeUserId: string | null = null;
let hydration: Promise<void> | null = null;

/**
 * All-time bests from the repo. A failure only costs the celebration, never
 * the timer, so it degrades to "no history".
 */
async function loadKnownBests(puzzle: TimerPuzzle): Promise<KnownBests> {
  try {
    return knownBestsFrom(await repo.loadPersonalBests(puzzle));
  } catch (err) {
    console.error("loading personal bests failed", err);
    return {};
  }
}

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
    await repo.upsertSession(initial, activeUserId ?? undefined);
    sessions = [initial];
  }
  const active = sessions.find((s) => s.isActive) ?? sessions[0];
  const [solves, knownBests] = await Promise.all([
    repo.loadSolves(active.id, SOLVE_LIMIT),
    loadKnownBests(puzzle),
  ]);
  return { sessions, active, solves, knownBests };
}

/**
 * Re-read the all-time bests after a change that can lower or raise them (the
 * database triggers have already recomputed by the time the write returns).
 */
async function refreshKnownBests() {
  const puzzle = useSessionStore.getState().puzzle;
  const knownBests = await loadKnownBests(puzzle);
  if (useSessionStore.getState().puzzle === puzzle) {
    useSessionStore.setState({ knownBests });
  }
}

export const useSessionStore = create<SessionStore>()((set, get) => ({
  backend: "local",
  hydrated: false,
  puzzle: "333",
  sessions: [],
  activeSessionId: null,
  solves: [],
  knownBests: {},
  syncing: false,

  hydrate: (userId) => {
    // Re-hydrate if the user changed (sign-in / sign-out)
    if (userId !== activeUserId) {
      hydration = null;
      activeUserId = userId;

      // Select the correct repo
      if (userId) {
        repo = createSupabaseRepo(userId);
        set({ backend: "cloud" });
      } else {
        repo = localRepo;
        set({ backend: "local" });
      }
    }

    hydration ??= (async () => {
      // If authed and there's leftover local data, sync it first
      if (userId && hasLocalData()) {
        try {
          set({ syncing: true });
          const count = await syncLocalToCloud(userId);
          if (count > 0) {
            toast({
              kind: "info",
              message: `${count} solve${count === 1 ? "" : "s"} synced to your account`,
              durationMs: 4000,
            });
          }
        } catch (err) {
          console.error("sync failed, continuing with cloud data", err);
        } finally {
          set({ syncing: false });
        }
      }

      const { sessions, active, solves, knownBests } = await loadPuzzle(get().puzzle);
      set({ sessions, activeSessionId: active.id, solves, knownBests, hydrated: true });
    })();
    return hydration;
  },

  addSolve: async (input) => {
    await get().hydrate(activeUserId);
    const sessionId = get().activeSessionId;
    if (!sessionId) return;
    const solve: Solve = { ...input, sessionId, effectiveTimeMs: null };
    // Optimistic update
    set({ solves: [solve, ...get().solves].slice(0, SOLVE_LIMIT) });
    // Fire-and-forget repo write
    await repo.saveSolve(solve, activeUserId ?? undefined);
  },

  setPenalty: async (solveId, p) => {
    set({
      solves: get().solves.map((s) =>
        s.id === solveId ? { ...s, penalty: p, effectiveTimeMs: null } : s,
      ),
    });
    await repo.updatePenalty(solveId, p);
    await refreshKnownBests();
  },

  deleteSolve: async (solveId) => {
    set({ solves: get().solves.filter((s) => s.id !== solveId) });
    await repo.deleteSolve(solveId);
    await refreshKnownBests();
  },

  setNotes: async (solveId, notes) => {
    set({
      solves: get().solves.map((s) =>
        s.id === solveId ? { ...s, notes } : s,
      ),
    });
    await repo.updateNotes(solveId, notes);
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
    for (const x of sessions)
      await repo.upsertSession(x, activeUserId ?? undefined);
  },

  deleteSession: async (sessionId) => {
    const s = get();
    if (s.sessions.length <= 1) {
      toast({
        kind: "error",
        message: "Can't delete the only session",
        durationMs: 3000,
      });
      return;
    }
    
    // Find the session to switch to (next one, or previous if deleting the last)
    const i = s.sessions.findIndex((x) => x.id === sessionId);
    if (i === -1) return;
    
    const nextSession = s.sessions[i + 1] || s.sessions[i - 1];
    
    // Delete from repo first
    await repo.deleteSession(sessionId);
    await refreshKnownBests();
    
    // Switch to next session in UI and mark active
    const newSessions = s.sessions.filter((x) => x.id !== sessionId);
    const updatedNext = { ...nextSession, isActive: true };
    await repo.upsertSession(updatedNext, activeUserId ?? undefined);
    
    const solves = await repo.loadSolves(updatedNext.id, SOLVE_LIMIT);
    
    set({ 
      sessions: newSessions.map(x => x.id === updatedNext.id ? updatedNext : x), 
      activeSessionId: updatedNext.id, 
      solves 
    });
  },

  switchSession: async (id) => {
    const s = get();
    if (id === s.activeSessionId) return;
    const sessions = s.sessions.map((x) => ({ ...x, isActive: x.id === id }));
    const solves = await repo.loadSolves(id, SOLVE_LIMIT);
    set({ sessions, activeSessionId: id, solves });
    for (const x of sessions)
      await repo.upsertSession(x, activeUserId ?? undefined);
  },

  renameSession: async (id, name) => {
    const trimmed = name.trim().slice(0, 60); // DB check: name ≤ 60 chars
    if (!trimmed) return;
    const sessions = get().sessions.map((x) =>
      x.id === id ? { ...x, name: trimmed } : x,
    );
    set({ sessions });
    const changed = sessions.find((x) => x.id === id);
    if (changed) await repo.upsertSession(changed, activeUserId ?? undefined);
  },

  resetSession: async () => {
    const s = get();
    const sessionId = s.activeSessionId;
    const clearedIds = s.solves.map((x) => x.id);
    if (!sessionId || clearedIds.length === 0) return { undo: () => {} };

    // Soft delete: the rows survive with deleted_at set, so undo is a single
    // atomic restore (no re-insert loop) and the data is recoverable even if
    // the toast is missed. The DB trigger recomputes the PB off the survivors.
    set({ solves: [] });
    await repo.deleteSolvesInSession(sessionId);
    await refreshKnownBests();

    return { undo: () => void get().restoreSolves(clearedIds) };
  },

  restoreSolves: async (ids) => {
    if (ids.length === 0) return;
    try {
      await repo.restoreSolves(ids);
    } catch (err) {
      console.error("restore failed", err);
      toast({
        kind: "error",
        message: "Couldn't undo — please try again",
        durationMs: 4000,
      });
      return;
    }
    // Reload the active session so restored solves reappear in order.
    const sessionId = get().activeSessionId;
    if (!sessionId) return;
    const solves = await repo.loadSolves(sessionId, SOLVE_LIMIT);
    if (get().activeSessionId === sessionId) set({ solves });
    await refreshKnownBests();
  },

  loadDeletedSolves: () => repo.loadDeletedSolves(get().puzzle),

  purgeSolves: (ids) => repo.purgeSolves(ids),

  setPuzzle: async (p) => {
    if (get().puzzle === p) return;
    set({ puzzle: p, hydrated: false });
    const { sessions, active, solves, knownBests } = await loadPuzzle(p);
    if (get().puzzle !== p) return; // switched again mid-load
    set({ sessions, activeSessionId: active.id, solves, knownBests, hydrated: true });
  },

  setKnownBests: (known) => {
    set({ knownBests: known });
  },

  syncToCloud: async (userId) => {
    if (!userId || !hasLocalData()) return;
    const s = get();
    if (s.syncing) return;

    set({ syncing: true });
    try {
      const count = await syncLocalToCloud(userId);

      // Switch to cloud repo
      activeUserId = userId;
      repo = createSupabaseRepo(userId);
      set({ backend: "cloud" });

      // Re-hydrate from cloud
      hydration = null;
      await get().hydrate(userId);

      if (count > 0) {
        toast({
          kind: "info",
          message: `${count} solve${count === 1 ? "" : "s"} synced to your account`,
          durationMs: 4000,
        });
      }
    } catch (err) {
      console.error("syncToCloud failed", err);
    } finally {
      set({ syncing: false });
    }
  },
}));
