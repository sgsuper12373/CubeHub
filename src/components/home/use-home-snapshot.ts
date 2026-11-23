"use client";

import { useEffect, useState } from "react";

import { homeSnapshot, type HomeSnapshot } from "@/lib/home/snapshot";
import { loadLastEvent } from "@/lib/timer/events";
import { localRepo } from "@/lib/timer/repo-local";
import { createSupabaseRepo } from "@/lib/timer/repo-supabase";
import type { TimerPuzzle } from "@/lib/timer/types";

/** How far back Home looks: enough for the trend, this week and a long streak, without loading years. */
const SINCE_DAYS = 90;

const inflight = new Map<string, Promise<HomeSnapshot>>();

function load(userId: string | null, puzzle: TimerPuzzle): Promise<HomeSnapshot> {
  const key = `${userId ?? "guest"}:${puzzle}`;
  let p = inflight.get(key);
  if (!p) {
    // The same repository the timer and /stats use: Supabase signed in, local storage for guests.
    const repo = userId ? createSupabaseRepo(userId) : localRepo;
    const since = new Date(Date.now() - SINCE_DAYS * 86_400_000).toISOString();
    p = Promise.all([repo.loadSolveMetrics(puzzle, { since }), repo.loadPersonalBests(puzzle)])
      .then(([metrics, pbs]) => homeSnapshot(metrics, pbs))
      .finally(() => setTimeout(() => inflight.delete(key), 0));
    inflight.set(key, p);
  }
  return p;
}

/**
 * The main puzzle's snapshot for the stats and streak cards. Both cards ask;
 * one load serves them. `null` while loading; an empty snapshot on failure.
 */
export function useHomeSnapshot(userId: string | null): { puzzle: TimerPuzzle; snapshot: HomeSnapshot | null } {
  const [state, setState] = useState<{ puzzle: TimerPuzzle; snapshot: HomeSnapshot | null }>({
    puzzle: "333",
    snapshot: null,
  });

  useEffect(() => {
    let live = true;
    const puzzle: TimerPuzzle = loadLastEvent();
    load(userId, puzzle)
      .catch(() => homeSnapshot([], []))
      .then((snapshot) => {
        if (live) setState({ puzzle, snapshot });
      });
    return () => {
      live = false;
    };
  }, [userId]);

  return state;
}
