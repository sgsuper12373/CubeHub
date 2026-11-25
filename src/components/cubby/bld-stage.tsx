"use client";

import { useEffect } from "react";

import { ask } from "@/components/cubby/companion-actions";
import { getCubbyRenderer } from "@/components/cubby/renderer-instance";
import { useCubbyReducedMotion } from "@/components/cubby/use-cubby-motion";
import { onCompanion } from "@/lib/companion/bus";
import { fillLine, pickLine } from "@/lib/companion/content";
import type { BldPhase } from "@/lib/companion/renderer";
import { useCompanionStore } from "@/stores/companion-store";
import { useTimerStore } from "@/stores/timer-store";

/** Without the memo split, Cubby holds the memo pose this long, then puts the blindfold on. */
export const MEMO_POSE_MS = 2500;
/** After the stop: blindfold off, then a cheer unless the solve is marked DNF in time. */
export const FINISH_CHEER_MS = 1800;
/** How long Cubby stays on stage after the finish. */
export const FINISH_STAGE_MS = 4000;

function show(phase: BldPhase): void {
  useCompanionStore.getState().setBldPhase(phase);
  getCubbyRenderer().setInput("bldPhase", phase);
}

/**
 * Cubby's blindfold solve (docs/cubby-cubing-companion.md → Blind-mode
 * solving): while a 3x3 BLD solve runs, Cubby moves to stage size in a
 * corner. Memo: holding a tiny cube, eyes scanning, letter pairs drifting
 * by. Execution (at the memo split, or after a short memo pose without it):
 * a blindfold slides on and Cubby turns the cube. Finish: blindfold off; a
 * cheer, or a shrug and a line if the solve is marked DNF. The one thing
 * allowed while the timer runs; off with the "BLD solving animation" setting.
 */
export function useBldStage(): void {
  useEffect(() => {
    let memoTimer: number | null = null;
    let cheerTimer: number | null = null;
    let offTimer: number | null = null;
    const clear = () => {
      for (const t of [memoTimer, cheerTimer, offTimer]) if (t) window.clearTimeout(t);
      memoTimer = cheerTimer = offTimer = null;
    };

    const offPhase = onCompanion("bld:phase", ({ phase }) => {
      if (phase === "off") {
        clear();
        show("off");
        return;
      }
      if (!ask({ kind: "bld" }).show) return;
      clear();
      show(phase);
      if (phase === "memo" && !useTimerStore.getState().settings.memoSplit) {
        memoTimer = window.setTimeout(() => {
          if (useCompanionStore.getState().bldPhase === "memo") show("execute");
        }, MEMO_POSE_MS);
      }
      if (phase === "finish") {
        cheerTimer = window.setTimeout(() => {
          if (useCompanionStore.getState().bldPhase === "finish") getCubbyRenderer().fire("celebrate");
        }, FINISH_CHEER_MS);
        offTimer = window.setTimeout(() => show("off"), FINISH_STAGE_MS);
      }
    });

    // Marked DNF while Cubby is still on stage: a shrug and one line, no guilt.
    const offPenalty = onCompanion("penalty", ({ penalty }) => {
      const { bldPhase, content, page, record, say } = useCompanionStore.getState();
      if (penalty !== "dnf" || bldPhase !== "finish") return;
      if (cheerTimer) window.clearTimeout(cheerTimer);
      cheerTimer = null;
      const line = pickLine(content?.reactions.bldDnf);
      const decision = ask({ kind: "reaction", page, reaction: "bldDnf", hasLine: line !== null });
      if (!decision.show) return;
      getCubbyRenderer().fire("shrug");
      if (decision.bubble && line) say({ text: fillLine(line, { name: record.settings.name }), actions: [], ttlMs: 4000 });
    });

    return () => {
      clear();
      offPhase();
      offPenalty();
    };
  }, []);
}

/** The stage itself: decorative, in the corner, clear of the time and the scramble. */
export function BldStage() {
  const phase = useCompanionStore((s) => s.bldPhase);
  const reduced = useCubbyReducedMotion();
  if (phase === "off") return null;
  const View = getCubbyRenderer().View;
  return (
    <div data-cubby-bld={phase} aria-hidden className="pointer-events-none fixed right-4 bottom-4 z-40 md:right-6 md:bottom-6">
      <View size={140} reduced={reduced} />
    </div>
  );
}
