"use client";

import { useEffect, useRef, useState } from "react";

import { PenaltyBar } from "@/components/timer/penalty-bar";
import { ScrambleBar } from "@/components/timer/scramble-bar";
import { SessionSwitcher } from "@/components/timer/session-switcher";
import { TimeDisplay } from "@/components/timer/time-display";
import { TouchStage } from "@/components/timer/touch-stage";
import { SignInNudge } from "@/components/timer/sign-in-nudge";
import { ShortcutHint } from "@/components/timer/shortcut-hint";
import { ShortcutsOverlay } from "@/components/timer/shortcuts-overlay";
import { PreviewPanel } from "@/components/timer/preview-panel";
import { QuickSettings } from "@/components/timer/quick-settings";
import { StatsPanel } from "@/components/stats/stats-panel";
import { StatTiles } from "@/components/stats/stat-tiles";
import { SolveList } from "@/components/stats/solve-list";
import { SessionTrend } from "@/components/stats/session-trend";
import { LayoutShell } from "@/components/timer/layout-shell";
import type { PanelId } from "@/lib/timer/layout";
import { useLayoutStore } from "@/stores/layout-store";
import { generateScramble } from "@/lib/timer/scrambler";
import { bestSingle, sessionMean, wcaAverage } from "@/lib/timer/stats";
import { loadClientSettings, saveSettings } from "@/lib/timer/settings-persistence";
import type { ServerTimerSettings } from "@/lib/auth/dal";
import type { Penalty, TimerSettings } from "@/lib/timer/types";
import { useSessionStore } from "@/stores/session-store";
import { useTimerStore } from "@/stores/timer-store";
import { toast } from "@/stores/toast-store";
import { confirm } from "@/stores/confirm-store";
import { formatMs } from "@/lib/timer/format";
import { cn } from "@/lib/utils";

/**
 * Client container for /timer: wires the stores to the presentational
 * components. The only stateful component in the tree.
 */
export function TimerScreen(props: {
  isAuthed: boolean;
  userId: string | null;
  initialSettings: ServerTimerSettings | null;
}) {
  const phase = useTimerStore((s) => s.phase);
  const scramble = useTimerStore((s) => s.scramble);
  const puzzle = useTimerStore((s) => s.puzzle);
  const settings = useTimerStore((s) => s.settings);
  const applySettings = useTimerStore((s) => s.applySettings);
  const resultPenalty = useTimerStore((s) => s.inspectionPenalty);

  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const solves = useSessionStore((s) => s.solves);
  const backend = useSessionStore((s) => s.backend);

  const lastRecordedStopRef = useRef<number | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  // While the layout editor is open, dragging a panel must not also start a
  // solve — so the stage's key and pointer engines both go quiet.
  const editingLayout = useLayoutStore((s) => s.editing);
  const celebrateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const clientSettings = loadClientSettings();
    if (props.initialSettings) {
      applySettings({ ...props.initialSettings, ...clientSettings });
    } else {
      applySettings(clientSettings);
    }
  }, [props.initialSettings, applySettings]);

  const handleSettingsChange = (partial: Partial<TimerSettings>) => {
    applySettings(partial);
    saveSettings(partial, props.isAuthed);
  };

  useEffect(() => {
    void useSessionStore.getState().hydrate(props.userId);
  }, [props.userId]);

  // Keep both scramble slots (current + prefetched next) filled. Runs after
  // paint, so cubing.js — a separate lazy chunk — never blocks first render.
  // Re-runs whenever a slot empties (solve advanced, skip, puzzle switch);
  // the cancellation flag plus the puzzle guard drop stale results.
  useEffect(() => {
    if (scramble.alg !== null && scramble.next !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const alg = await generateScramble(puzzle);
        const store = useTimerStore.getState();
        if (!cancelled && store.puzzle === puzzle) store.receiveScramble(alg);
      } catch (err) {
        console.error("scramble generation failed", err);
        if (!cancelled) useTimerStore.getState().setScrambleGenerating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scramble.alg, scramble.next, puzzle]);

  // Record the solve exactly once per stop. `stoppedAt` is unique per solve,
  // which makes this idempotent across re-renders and dev double-effects.
  // Also handles PB detection.
  useEffect(() => {
    if (phase !== "stopped") return;
    const t = useTimerStore.getState();
    if (
      t.stoppedAt === null ||
      t.finalElapsedMs === null ||
      lastRecordedStopRef.current === t.stoppedAt
    )
      return;
    lastRecordedStopRef.current = t.stoppedAt;

    // Snapshot the current best BEFORE adding the new solve
    const currentSolves = useSessionStore.getState().solves;
    const previousBest = bestSingle(currentSolves);

    void useSessionStore.getState().addSolve({
      id: crypto.randomUUID(),
      puzzle: t.puzzle,
      timeMs: Math.max(1, Math.round(t.finalElapsedMs)), // DB check: time_ms > 0
      penalty: t.inspectionPenalty,
      scramble: t.scramble.alg ?? "",
      notes: null,
      createdAt: new Date().toISOString(),
    });

    // PB detection — compare after the store updates (next microtask)
    queueMicrotask(() => {
      const newSolves = useSessionStore.getState().solves;
      const newBest = bestSingle(newSolves);
      // Fire PB toast only if we have at least 2 solves and the best improved
      if (
        newBest !== null &&
        newSolves.length >= 2 &&
        (previousBest === null || newBest < previousBest)
      ) {
        toast({
          kind: "pb",
          message: `New PB! ${formatMs(newBest)}`,
          durationMs: 4000,
        });
        setCelebrating(true);
        if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current);
        celebrateTimerRef.current = setTimeout(
          () => setCelebrating(false),
          1200,
        );
      }
    });
  }, [phase]);

  const togglePenalty = (p: Exclude<Penalty, "none">) => {
    const last = useSessionStore.getState().solves[0];
    if (!last) return;
    const next: Penalty = last.penalty === p ? "none" : p;
    void useSessionStore.getState().setPenalty(last.id, next);
    useTimerStore.getState().setResultPenalty(next);
  };

  const deleteLast = () => {
    const last = useSessionStore.getState().solves[0];
    if (!last) return;
    void (async () => {
      const ok = await confirm({
        title: "Delete this solve?",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!ok) return;
      const timer = useTimerStore.getState();
      await useSessionStore.getState().deleteSolve(last.id);
      toast({
        kind: "undo",
        message: "Solve deleted",
        durationMs: 5000,
        action: {
          label: "Undo",
          onAction: () =>
            void useSessionStore.getState().restoreSolves([last.id]),
        },
      });
      timer.advanceScramble(); // a deleted scramble is spent — fresh one next
      timer.clearResult();
    })();
  };

  const changePuzzle = (p: typeof puzzle) => {
    useTimerStore.getState().setPuzzle(p);
    void useSessionStore.getState().setPuzzle(p);
  };

  const handlePenalty = (id: string, p: Penalty) => {
    void useSessionStore.getState().setPenalty(id, p);
    // If this is the most recent solve and we're still stopped, sync the display
    const latest = useSessionStore.getState().solves[0];
    if (latest && latest.id === id && phase === "stopped") {
      useTimerStore.getState().setResultPenalty(p);
    }
  };

  const handleNotes = (id: string, notes: string) => {
    void useSessionStore.getState().setNotes(id, notes);
  };

  const handleDelete = (id: string) => {
    void (async () => {
      const ok = await confirm({
        title: "Delete this solve?",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!ok) return;
      await useSessionStore.getState().deleteSolve(id);
      toast({
        kind: "undo",
        message: "Solve deleted",
        durationMs: 5000,
        action: {
          label: "Undo",
          onAction: () => void useSessionStore.getState().restoreSolves([id]),
        },
      });
      // If the deleted solve was the one on display, clear the result
      const timer = useTimerStore.getState();
      if (phase === "stopped") {
        const remaining = useSessionStore.getState().solves;
        if (remaining.length === 0 || remaining[0].id !== id) {
          timer.clearResult();
        }
      }
    })();
  };

  const solving =
    phase === "holding" || phase === "ready" || phase === "running";

  // Zen mode (design brief §4): everything except the digits dims to ~10% once
  // an attempt is under way — dimmed, not gone. It leaves fast (150ms) and
  // returns gracefully (300ms ease-out) when the solve lands.
  const fadeWhileSolving = cn(
    "transition-opacity",
    solving
      ? "pointer-events-none opacity-[0.1] duration-150"
      : "opacity-100 duration-300 ease-out",
  );

  /**
   * Panel bodies for <LayoutShell/>. Each case is self-contained so it can be
   * placed anywhere in the grid; nothing here assumes a sibling.
   */
  const renderPanel = (id: PanelId): React.ReactNode => {
    switch (id) {
      case "scramble":
        return (
          <div className={fadeWhileSolving}>
            <ScrambleBar
              alg={scramble.alg}
              generating={scramble.generating}
              puzzle={puzzle}
              onNext={() => useTimerStore.getState().skipScramble()}
              onCopy={() => {
                const { alg } = useTimerStore.getState().scramble;
                if (alg) void navigator.clipboard.writeText(alg);
              }}
            />
          </div>
        );

      case "preview":
        if (!settings.showScramblePreview || !scramble.alg) return null;
        return (
          <div className={cn("flex min-h-0 flex-1 flex-col", fadeWhileSolving)}>
            <PreviewPanel
              alg={scramble.alg}
              puzzle={puzzle}
              dimension={settings.previewDimension}
            />
          </div>
        );

      case "timer":
        return (
          <>
            <TouchStage
              disabled={shortcutsOpen || editingLayout}
              onShowShortcuts={() => setShortcutsOpen(true)}
            >
              <TimeDisplay
                hideWhileSolving={settings.hideTimeWhileSolving}
                celebrate={celebrating}
              />
              <p
                className={cn(
                  "h-5 text-sm transition-opacity duration-150",
                  phase === "holding"
                    ? "text-timer-holding opacity-100"
                    : phase === "ready"
                      ? "text-timer-running opacity-100"
                      : phase === "idle" || phase === "stopped"
                        ? "text-muted-foreground opacity-100"
                        : "opacity-0",
                )}
              >
                {phase === "holding"
                  ? "keep holding…"
                  : phase === "ready"
                    ? "release to start"
                    : phase === "stopped"
                      ? "tap or press space for the next scramble"
                      : "hold, then release to start"}
              </p>
            </TouchStage>

            {/* Mobile touch-safety (design brief §5): a mandatory ~60px dead
                band between the bottom of the tap/hold surface and the bottom
                nav, so a rapid solving tap near the edge can't switch tabs.
                TouchStage is flex-1, so this spacer simply shrinks it. The
                fixed penalty bar reclaims the band only while stopped. */}
            <div className="h-[3.75rem] shrink-0 md:hidden" aria-hidden />

            {/* Sibling of <TouchStage/>, never a child — taps here must not
                reach the timer surface. */}
            {phase === "stopped" && (
              <PenaltyBar
                penalty={resultPenalty}
                onPlus2={() => togglePenalty("plus2")}
                onDnf={() => togglePenalty("dnf")}
                onDelete={deleteLast}
              />
            )}
          </>
        );

      case "stats":
        return (
          <div className="min-h-0 overflow-auto">
            <StatTiles
              best={bestSingle(solves)}
              ao5={wcaAverage(solves, 5)}
              ao12={wcaAverage(solves, 12)}
              ao50={wcaAverage(solves, 50)}
              ao100={wcaAverage(solves, 100)}
              mean={sessionMean(solves)}
              count={solves.length}
            />
          </div>
        );

      case "trend":
        return (
          <div className="min-h-0 overflow-auto py-2">
            <SessionTrend solves={solves} />
          </div>
        );

      case "solves":
        return (
          <div className="flex min-h-0 flex-1 flex-col">
            <SolveList
              solves={solves}
              onPenalty={handlePenalty}
              onDelete={handleDelete}
              onNotes={handleNotes}
            />
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Session controls stay outside the grid — they're chrome, and letting
          the user bury their own settings button would be a trap. */}
      <div className={fadeWhileSolving}>
        <div className="flex items-center justify-between px-4 py-2 relative z-20">
          <SessionSwitcher
              sessions={sessions}
              activeId={activeSessionId}
              puzzle={puzzle}
              onSelect={(id) => void useSessionStore.getState().switchSession(id)}
              onCreate={(name) => void useSessionStore.getState().createSession(name)}
              onRename={(id, name) =>
                void useSessionStore.getState().renameSession(id, name)
              }
              onReset={() => {
                void (async () => {
                  const count = useSessionStore.getState().solves.length;
                  if (count === 0) return;
                  const name =
                    sessions.find((x) => x.id === activeSessionId)?.name ??
                    "this session";
                  const ok = await confirm({
                    title: "Clear this session?",
                    body: `Removes all ${count} solve${count === 1 ? "" : "s"} from "${name}". You can undo right after.`,
                    confirmLabel: "Clear session",
                    destructive: true,
                  });
                  if (!ok) return;
                  const { undo } = await useSessionStore.getState().resetSession();
                  toast({
                    kind: "undo",
                    message: "Session cleared",
                    durationMs: 5000,
                    action: { label: "Undo", onAction: undo },
                  });
                })();
              }}
              onDelete={(id) => {
                void (async () => {
                  const target = sessions.find((x) => x.id === id);
                  const count = useSessionStore.getState().solves.length;
                  const ok = await confirm({
                    title: `Delete "${target?.name ?? "session"}"?`,
                    body:
                      count > 0
                        ? `Permanently deletes the session and its ${count} solve${count === 1 ? "" : "s"}. This can't be undone.`
                        : "Permanently deletes the session. This can't be undone.",
                    confirmLabel: "Delete session",
                    destructive: true,
                  });
                  if (!ok) return;
                  await useSessionStore.getState().deleteSession(id);
                })();
              }}
              onPuzzleChange={changePuzzle}
            />
            {phase === "idle" || phase === "stopped" ? (
              <QuickSettings
                settings={settings}
                onChange={handleSettingsChange}
                isAuthed={props.isAuthed}
              />
            ) : null}
        </div>
      </div>

      <LayoutShell renderPanel={renderPanel} />

      {/* Sign-in nudge for logged-out users */}
      {!props.isAuthed && backend === "local" && !nudgeDismissed && !solving && (
        <div className="px-4 py-2">
          <SignInNudge
            solveCount={solves.length}
            onDismiss={() => setNudgeDismissed(true)}
          />
        </div>
      )}

      {phase === "stopped" && solves.length > 0 && <ShortcutHint />}

      <ShortcutsOverlay
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* Mobile stats drawer. Desktop gets stats/trend/solves as grid panels
          instead, so this renders nothing at md+. */}
      <StatsPanel
        solves={solves}
        onPenalty={handlePenalty}
        onDelete={handleDelete}
        onNotes={handleNotes}
      />
    </div>
  );
}
