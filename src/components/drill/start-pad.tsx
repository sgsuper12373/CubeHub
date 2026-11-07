"use client";

import { cn } from "@/lib/utils";
import type { DrillPhase } from "@/stores/drill-store";

const LABEL: Record<DrillPhase, { title: string; detail: string }> = {
  idle: { title: "Start", detail: "tap here or press Space" },
  running: { title: "Stop", detail: "tap anywhere or press any key" },
  stopped: { title: "Next case", detail: "tap here or press Space · 1 = +2 · 2 = DNF · D = delete" },
};

/** The pad's accessible hint, also used where the phase needs a sentence. */
export const START_PAD_HINT: Record<DrillPhase, string> = {
  idle: "tap or press space to start",
  running: "tap or any key to stop",
  stopped: "tap for the next case",
};

const PHASE_STYLE: Record<DrillPhase, string> = {
  idle: "border-border bg-surface-raised text-foreground hover:bg-muted",
  running: "border-timer-running/50 bg-timer-running/10 text-timer-running",
  stopped: "border-border bg-surface-raised text-foreground hover:bg-muted",
};

/**
 * The drill's start / stop / next-case button. The only pointer target that
 * starts a rep, so the cube above it can be dragged freely.
 *
 * It fires on pointer down, not click, for the same timing as the main timer:
 * the rep starts the instant the finger lands. A pointer's click afterwards is
 * ignored, so one tap is one press. Space is handled by DrillLab's window key
 * listener (which also stops the focused pad activating on keyup); Enter on a
 * focused pad arrives as a keyboard click (`detail === 0`) and presses once.
 */
export function StartPad({
  phase,
  onPress,
  className,
}: {
  phase: DrillPhase;
  onPress: () => void;
  className?: string;
}) {
  const label = LABEL[phase];
  return (
    <button
      type="button"
      aria-label={`Drill timer: ${START_PAD_HINT[phase]}`}
      data-phase={phase}
      className={cn(
        "flex min-h-24 w-full touch-none flex-col items-center justify-center gap-0.5 rounded-xl border px-4 py-3 select-none",
        // Pressed feedback; instant while a rep runs, and for reduced motion.
        "transition-transform duration-(--duration-fast) ease-standard active:scale-[0.98] motion-reduce:transition-none",
        phase === "running" && "transition-none",
        PHASE_STYLE[phase],
        className,
      )}
      onPointerDown={(e) => {
        if (!e.isPrimary || e.button > 0) return;
        e.preventDefault();
        onPress();
      }}
      onClick={(e) => {
        if (e.detail === 0) onPress();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="text-base font-semibold">{label.title}</span>
      <span className="text-xs text-muted-foreground">{label.detail}</span>
    </button>
  );
}
