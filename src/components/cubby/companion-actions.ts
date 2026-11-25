import { getCubbyRenderer } from "@/components/cubby/renderer-instance";
import { fillLine, pickLine } from "@/lib/companion/content";
import { decide, isQuietPhase, recordShown, type Candidate, type Decision, type TimerPhaseLike } from "@/lib/companion/director";
import { loadSessionMemory, saveSessionMemory } from "@/lib/companion/memory";
import { stepsFor, tourKindFor, type TourKind } from "@/lib/companion/tours";
import { useCompanionStore } from "@/stores/companion-store";
import { useDrillStore, type DrillPhase } from "@/stores/drill-store";
import { useTimerStore } from "@/stores/timer-store";

/**
 * The things Cubby does, each through the Director. Components call these;
 * nothing here renders.
 */

/** A drill rep counts as a running solve: recognising or executing. */
function drillBusy(phase: DrillPhase): boolean {
  return phase === "running" || phase === "recognising";
}

/** The timer's state for the Director, folding in the Drill Lab's timer. */
export function timerState(): { phase: TimerPhaseLike; inInspection: boolean } {
  const t = useTimerStore.getState();
  const phase: TimerPhaseLike = drillBusy(useDrillStore.getState().phase) ? "running" : t.phase;
  return { phase, inInspection: t.inspectionStartedAt !== null };
}

/** Whether a solve (timer or drill) owns the screen right now, as a hook. */
export function useSolveBusy(): boolean {
  const phase = useTimerStore((s) => s.phase);
  const inInspection = useTimerStore((s) => s.inspectionStartedAt !== null);
  const drilling = useDrillStore((s) => drillBusy(s.phase));
  return drilling || isQuietPhase(phase, inInspection);
}

/** Ask the Director; if it says yes, remember it for the session caps. */
export function ask(candidate: Candidate, lastOpenedAt: number | null = null): Decision {
  const { record } = useCompanionStore.getState();
  const session = loadSessionMemory();
  const decision = decide(candidate, { ...timerState(), settings: record.settings, session, lastOpenedAt, now: Date.now() });
  if (decision.show) saveSessionMemory(recordShown(session, candidate, decision));
  return decision;
}

export function companionName(): string {
  return useCompanionStore.getState().record.settings.name;
}

/** Start this page's tour (or its What's new). Returns false when there's nothing to show or the Director says no. */
export function startPageTour(prompted: boolean, kind?: TourKind): boolean {
  const { page, content, record, startTour } = useCompanionStore.getState();
  if (!page || !content) return false;
  const progress = record.tours[page];
  const chosen = kind ?? (prompted ? (tourKindFor(content, progress) ?? "full") : tourKindFor(content, progress));
  if (!chosen) return false;
  const steps = stepsFor(content, chosen, progress);
  if (steps.length === 0) return false;
  if (!ask({ kind: "tour", page, prompted }).show) return false;
  startTour({ page, kind: chosen, steps, prompted });
  getCubbyRenderer().fire("wave");
  return true;
}

/** A tip for this page, on request. */
export function sayTip(): void {
  const { content, page, say } = useCompanionStore.getState();
  const line = pickLine(content?.tips);
  if (!line || !ask({ kind: "requested", page }).show) return;
  say({ text: fillLine(line, { name: companionName() }), actions: [], ttlMs: 9000 });
}
