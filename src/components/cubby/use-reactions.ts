"use client";

import { useEffect } from "react";

import { ask } from "@/components/cubby/companion-actions";
import { getCubbyRenderer } from "@/components/cubby/renderer-instance";
import { onCompanion } from "@/lib/companion/bus";
import { pickFilledLine } from "@/lib/companion/content";
import { trackSolving, type ReactionKind } from "@/lib/companion/director";
import { loadStretch, saveStretch } from "@/lib/companion/memory";
import type { CubbyTrigger } from "@/lib/companion/renderer";
import { useCompanionStore } from "@/stores/companion-store";

/** Seconds Cubby looks concerned after an error, beside the toast. */
const CONCERNED_MS = 3000;

function localDay(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * One reaction: ask the Director, play the animation, and say a line from
 * the page's content when the page's bubble is still unused.
 */
function react(reaction: ReactionKind, trigger: CubbyTrigger | null, values: Record<string, string | null> = {}): void {
  const { page, content, record, say } = useCompanionStore.getState();
  const line = pickFilledLine(content?.reactions[reaction], { ...values, name: record.settings.name });
  const decision = ask({ kind: "reaction", page, reaction, hasLine: line !== null });
  if (!decision.show) return;
  if (trigger) getCubbyRenderer().fire(trigger);
  if (decision.bubble && line) say({ text: line, actions: [], ttlMs: 4500 });
}

/**
 * Cubby's reactions to app events (docs/cubby-cubing-companion.md →
 * Reactions), all after the timer stops: PB → celebrate and a line; +2 or
 * DNF → a wince, no line; a case learned → thumbs up; an error → a
 * concerned look beside the toast; a mis-stop → how to mark it real; an
 * hour of solving → one stretch reminder a day; Playground solved → a cheer.
 */
export function useCompanionReactions(): void {
  useEffect(() => {
    let concernedTimer: number | null = null;
    const offs = [
      onCompanion("pb", ({ time, delta, label }) => react("pb", "celebrate", { time, delta, label })),
      // A BLD DNF gets Cubby's shrug instead (bld-stage.tsx).
      onCompanion("penalty", () => {
        if (useCompanionStore.getState().bldPhase === "finish") return;
        react("penalty", "wince");
      }),
      onCompanion("drill:mastered", ({ name }) => react("mastered", "thumbsUp", { case: name })),
      onCompanion("misstop", () => react("misstop", null)),
      onCompanion("playground:solved", () => react("solved", "celebrate")),
      onCompanion("error", () => {
        const { page, record } = useCompanionStore.getState();
        if (!ask({ kind: "reaction", page, reaction: "error", hasLine: false }).show || record.settings.mode !== "on") return;
        const r = getCubbyRenderer();
        r.setInput("mood", "concerned");
        if (concernedTimer) window.clearTimeout(concernedTimer);
        concernedTimer = window.setTimeout(() => r.setInput("mood", "idle"), CONCERNED_MS);
      }),
      onCompanion("solve", ({ at }) => {
        const { stretch, remind } = trackSolving(loadStretch(), at, localDay(at));
        saveStretch(stretch);
        if (remind) react("stretch", "wave");
      }),
    ];
    return () => {
      for (const off of offs) off();
      if (concernedTimer) window.clearTimeout(concernedTimer);
    };
  }, []);
}
