"use client";

import { Clapperboard } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { INSPECTION_MS, type PracticePhase } from "@/lib/playground/practice";
import { formatMs } from "@/lib/timer/format";

/**
 * The practice clock under the cube. It only displays the phase; transitions
 * happen in the screen's turn handler (lib/playground/practice.ts).
 */
export function PracticeTimer({ phase, onReplay }: { phase: PracticePhase; onReplay: () => void }) {
  const ticking = phase.kind === "inspecting" || phase.kind === "running";
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(performance.now()), 50);
    return () => clearInterval(id);
  }, [ticking]);

  if (phase.kind === "idle") return null;

  let main: string;
  let sub: string;
  if (phase.kind === "inspecting") {
    const left = Math.ceil((INSPECTION_MS - (now - phase.since)) / 1000);
    if (left > 0) {
      main = String(Math.min(15, left));
      sub = "Inspection. The clock starts on your first turn.";
    } else {
      // Past 15s the clock is already running from the 15s mark.
      main = formatMs(now - phase.since - INSPECTION_MS);
      sub = "Inspection over: the clock is running.";
    }
  } else if (phase.kind === "ready") {
    main = "0.00";
    sub = "The clock starts on your first turn.";
  } else if (phase.kind === "running") {
    main = formatMs(Math.max(0, now - phase.start));
    sub = "Solving…";
  } else {
    const { ms, moves, tps } = phase.result;
    main = formatMs(ms);
    sub = `${moves} ${moves === 1 ? "move" : "moves"} · ${tps.toFixed(2)} TPS`;
  }

  return (
    <div className="flex flex-col items-center gap-1" data-testid="practice-timer">
      <p className="font-mono text-4xl font-semibold tabular-nums" aria-live={phase.kind === "done" ? "polite" : "off"}>
        {main}
      </p>
      <p className="text-xs text-muted-foreground">{sub}</p>
      {phase.kind === "done" && (
        <Button type="button" size="sm" variant="ghost" onClick={onReplay}>
          <Clapperboard /> Replay solve
        </Button>
      )}
    </div>
  );
}
