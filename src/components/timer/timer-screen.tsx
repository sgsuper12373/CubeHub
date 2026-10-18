"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { PenaltyBar } from "@/components/timer/penalty-bar";
import { ScrambleBar } from "@/components/timer/scramble-bar";
import { SessionSwitcher } from "@/components/timer/session-switcher";
import { TimeDisplay } from "@/components/timer/time-display";
import { TouchStage } from "@/components/timer/touch-stage";
import { TypingEntry } from "@/components/timer/typing-entry";
import { SignInNudge } from "@/components/timer/sign-in-nudge";
import { ShortcutHint } from "@/components/timer/shortcut-hint";
import { ShortcutsOverlay } from "@/components/timer/shortcuts-overlay";
import { PreviewPanel } from "@/components/timer/preview-panel";
import { PbCelebration } from "@/components/timer/pb-celebration";
import { CustomScrambleDialog } from "@/components/timer/custom-scramble-dialog";
import { RecentlyDeleted } from "@/components/timer/recently-deleted";
import { QuickSettings } from "@/components/timer/quick-settings";
import { BackgroundSettings } from "@/components/timer/background-settings";
import { TimerBackground, useTimerScrim } from "@/components/timer/timer-background";
import { useTimerBackgroundStore } from "@/stores/timer-background-store";
import { StatsPanel } from "@/components/stats/stats-panel";
import { SessionStats } from "@/components/stats/session-stats";
import { SolveList } from "@/components/stats/solve-list";
import { SessionTrend } from "@/components/stats/session-trend";
import { LayoutControls, LayoutShell } from "@/components/timer/layout-shell";
import type { PanelId } from "@/lib/timer/layout";
import { useLayoutStore } from "@/stores/layout-store";
import { generateScramble } from "@/lib/timer/scrambler";
import { loadLastEvent, saveLastEvent } from "@/lib/timer/events";
import { detectRecords, RECORD_LABEL, type RecordHit } from "@/lib/timer/pb-detect";
import { countedSessionSolves, isMisfire } from "@/lib/timer/misfire";
import { loadClientSettings, saveSettings } from "@/lib/timer/settings-persistence";
import type { ServerTimerSettings } from "@/lib/auth/dal";
import type { Penalty, TimerPuzzle, TimerSettings } from "@/lib/timer/types";
import { useSessionStore } from "@/stores/session-store";
import { useTimerStore } from "@/stores/timer-store";
import { toast } from "@/stores/toast-store";
import { confirm } from "@/stores/confirm-store";
import { formatMs } from "@/lib/timer/format";
import { cn } from "@/lib/utils";
import { FOCUS_ATTR, isFocusHidden } from "@/lib/timer/focus";
import { Expand } from "lucide-react";

/**
 * Frosted pill behind the top controls when a background image is set, so
 * they don't blend into it. The blur lives on a pseudo-element rather than
 * the wrapper: backdrop-filter on an ancestor would trap the controls'
 * fixed-position dialogs inside it.
 */
const frostedChrome =
  "relative before:pointer-events-none before:absolute before:-inset-1 before:-z-10 before:rounded-xl before:bg-background/40 before:backdrop-blur-md";

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
  const typing = settings.inputMode === "typing";
  const applySettings = useTimerStore((s) => s.applySettings);
  const resultPenalty = useTimerStore((s) => s.inspectionPenalty);

  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const solves = useSessionStore((s) => s.solves);
  // Session stats leave out misfires and excluded solves, as records do; the
  // solve list still shows every solve.
  const counted = countedSessionSolves(solves);
  const backend = useSessionStore((s) => s.backend);

  const lastRecordedStopRef = useRef<number | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [deletedOpen, setDeletedOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  /** The all-time PB card, tied to the solve that earned it. */
  const [celebration, setCelebration] = useState<{
    hits: RecordHit[];
    puzzle: TimerPuzzle;
    solveId: string;
  } | null>(null);
  const scrim = useTimerScrim();
  const hasBackground = useTimerBackgroundStore((s) => s.url !== null);
  const editingLayout = useLayoutStore((s) => s.editing);
  const isZenMode = useLayoutStore((s) => s.isZenMode);
  const isFocusMode = useLayoutStore((s) => s.isFocusMode);
  const inInspection = useTimerStore((s) => s.inspectionStartedAt !== null);
  const setZenMode = useLayoutStore((s) => s.setZenMode);
  const celebrateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setZenMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setZenMode]);

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
    // A stopped timer's scramble is spent; typing starts on a fresh one.
    if (partial.inputMode === "typing") useTimerStore.getState().advanceScramble();
    applySettings(partial);
    saveSettings(partial, props.isAuthed);
  };

  useEffect(() => {
    // First visit this page load: open on the event used last on this device.
    // Coming back to the page keeps whatever the stores already hold.
    const sessionState = useSessionStore.getState();
    const event = sessionState.hydrated ? sessionState.puzzle : loadLastEvent();
    if (!sessionState.hydrated) useSessionStore.setState({ puzzle: event });
    useTimerStore.getState().setPuzzle(event);
    void useSessionStore.getState().hydrate(props.userId);
  }, [props.userId]);

  // Keep both scramble slots (current + prefetched next) filled.
  useEffect(() => {
    if (scramble.alg !== null && scramble.next !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const store = useTimerStore.getState();
        const alg = await generateScramble(puzzle);

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

  /**
   * Session bests get a toast. All-time bests get the celebration card and the
   * glow on the digits; categories celebrated there aren't toasted twice.
   */
  const announceRecords = (hits: RecordHit[], solveId: string) => {
    const allTime = hits.filter((h) => h.scope === "allTime");
    const session = hits.filter((h) => h.scope === "session");

    if (session.length > 0) {
      toast({
        kind: "pb",
        message: `Session best: ${session
          .map((h) => `${RECORD_LABEL[h.category]} ${formatMs(h.timeMs)}`)
          .join(" · ")}`,
        durationMs: 4000,
      });
    }
    if (allTime.length > 0) {
      setCelebration({ hits: allTime, puzzle: useTimerStore.getState().puzzle, solveId });
    }
    if (hits.length > 0) {
      setCelebrating(true);
      if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current);
      celebrateTimerRef.current = setTimeout(() => setCelebrating(false), 1200);
    }
  };

  /** Delete a solve with an undo toast; the latest one also clears the result. */
  const removeSolve = async (id: string) => {
    const wasLatest = useSessionStore.getState().solves[0]?.id === id;
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
    if (wasLatest) {
      const timer = useTimerStore.getState();
      timer.advanceScramble(); // a deleted scramble is spent — fresh one next (no-op unless stopped)
      timer.clearResult();
    }
  };

  /**
   * Save a solve on the current scramble and announce any records. Shared by
   * the timer (on stop) and typing mode (on Enter).
   */
  const recordSolve = (timeMs: number, penalty: Penalty, source: "web" | "manual") => {
    const t = useTimerStore.getState();
    const sessionState = useSessionStore.getState();
    const solve = {
      id: crypto.randomUUID(),
      sessionId: sessionState.activeSessionId ?? "",
      puzzle: t.puzzle,
      timeMs,
      penalty,
      effectiveTimeMs: null,
      scramble: t.scramble.alg ?? "",
      notes: null,
      ...(source === "manual" && { source }),
      ...(t.scramble.custom && { scrambleType: "custom" as const }),
      createdAt: new Date().toISOString(),
    };

    // Records are judged against the solves *before* this one, so read them
    // before the store adds it.
    const { hits, known } = detectRecords(sessionState.solves, solve, sessionState.knownBests);
    sessionState.setKnownBests(known);
    const saved = sessionState.addSolve(solve);
    announceRecords(hits, solve.id);

    // Too fast to be real: it already doesn't count for records, and most
    // cubers want it gone, so offer that on the spot.
    if (isMisfire(solve.puzzle, solve.timeMs)) {
      toast({
        kind: "info",
        message: `${formatMs(timeMs)} looks like a misfire, so it won't count for records. Delete it?`,
        durationMs: 8000,
        action: {
          label: "Delete",
          onAction: () =>
            void (async () => {
              await saved;
              await removeSolve(solve.id);
            })(),
        },
      });
    }
  };

  // Record the solve exactly once per stop. `stoppedAt` is unique per solve,
  // which makes this idempotent across re-renders and dev double-effects.
  // An effect event, so the effect re-runs on `phase` alone while still
  // calling the latest recordSolve.
  const onStopped = useEffectEvent(() => {
    const t = useTimerStore.getState();
    if (
      t.stoppedAt === null ||
      t.finalElapsedMs === null ||
      lastRecordedStopRef.current === t.stoppedAt
    )
      return;
    lastRecordedStopRef.current = t.stoppedAt;

    recordSolve(
      Math.max(1, Math.round(t.finalElapsedMs)), // DB check: time_ms > 0
      t.inspectionPenalty,
      "web",
    );
  });
  useEffect(() => {
    if (phase === "stopped") onStopped();
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
      await removeSolve(last.id);
    })();
  };

  const changePuzzle = (p: typeof puzzle) => {
    saveLastEvent(p);
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

  // Focus Mode: while a solve is under way, only the digits stay. The hiding
  // is CSS keyed on an <html> attribute (globals.css) so it also reaches the
  // navbar and bottom nav, which live outside this screen.
  const focusHidden = isFocusMode && isFocusHidden(phase, inInspection);
  useEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute(FOCUS_ATTR, focusHidden);
    return () => root.removeAttribute(FOCUS_ATTR);
  }, [focusHidden]);

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
          <div className={cn("flex min-h-0 flex-1 flex-col items-center", fadeWhileSolving)}>
            <ScrambleBar
              alg={scramble.alg}
              generating={scramble.generating}
              puzzle={puzzle}
              custom={scramble.custom}
              canPrevious={
                scramble.prev !== null ||
                (phase === "stopped" && scramble.alg !== null)
              }
              onPrevious={() => useTimerStore.getState().previousScramble()}
              onCustom={() => setCustomOpen(true)}
              onNext={() => {
                const t = useTimerStore.getState();
                // After a solve, the scramble on show is spent.
                if (t.phase === "stopped") t.advanceScramble();
                else t.skipScramble();
              }}
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
        if (typing) {
          return (
            <TypingEntry
              timerFontSize={settings.timerFontSize}
              onSubmit={(timeMs, penalty) => {
                recordSolve(timeMs, penalty, "manual");
                useTimerStore.getState().skipScramble();
              }}
            />
          );
        }
        return (
          <>
            <TouchStage
              disabled={shortcutsOpen || customOpen || deletedOpen || editingLayout}
              onShowShortcuts={() => setShortcutsOpen(true)}
            >
              <TimeDisplay
                hideWhileSolving={settings.hideTimeWhileSolving}
                celebrate={celebrating}
                scrim={scrim}
              />
              <p
                className={cn(
                  "absolute bottom-[15%] w-full text-center h-5 text-sm transition-opacity duration-150",
                  // Over a busy background the hint needs the scrim too.
                  scrim && "mx-auto w-fit rounded-full bg-timer-scrim px-3 inset-x-0",
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
                hideDelete={settings.inspectionMode === "15s"}
              />
            )}
          </>
        );

      case "stats":
        return <SessionStats solves={counted} />;

      case "trend":
        return (
          <div className="min-h-0 overflow-auto py-2">
            <SessionTrend solves={counted} />
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
    // `isolate` gives the background image (-z-10) a stacking context of its
    // own: above the page canvas, below every control.
    <div className="relative isolate flex min-h-0 flex-1 flex-col">
      <TimerBackground />
      {/* Session controls stay outside the grid — they're chrome, and letting
          the user bury their own settings button would be a trap. */}
      <div className={fadeWhileSolving} data-focus-hide>
        <div className="flex items-center justify-between px-4 py-2 relative z-20">
          <div className={cn(hasBackground && frostedChrome)}>
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
              onOpenDeleted={() => setDeletedOpen(true)}
              isAuthed={props.isAuthed}
            />
          </div>
            {phase === "idle" || phase === "stopped" ? (
              <div className={cn("flex items-center gap-1", hasBackground && frostedChrome)}>
                <LayoutControls />
                <BackgroundSettings />
                <QuickSettings
                  settings={settings}
                  onChange={handleSettingsChange}
                  isAuthed={props.isAuthed}
                />
              </div>
            ) : null}
        </div>
      </div>

      <LayoutShell renderPanel={renderPanel} />

      {/* Sign-in nudge for logged-out users */}
      {!props.isAuthed && backend === "local" && !nudgeDismissed && !solving && (
        <div className="px-4 py-2" data-focus-hide>
          <SignInNudge
            solveCount={solves.length}
            onDismiss={() => setNudgeDismissed(true)}
          />
        </div>
      )}

      {phase === "stopped" && solves.length > 0 && <ShortcutHint />}

      {/* Shown until closed or until the next solve begins (a newer solve, or
          the timer leaving idle, means the moment has passed). */}
      {celebration &&
        solves[0]?.id === celebration.solveId &&
        (typing || phase === "stopped" || phase === "idle") && (
        <PbCelebration
          hits={celebration.hits}
          puzzle={celebration.puzzle}
          onClose={() => setCelebration(null)}
        />
      )}

      {deletedOpen && (
        <RecentlyDeleted
          puzzle={puzzle}
          sessions={sessions}
          onClose={() => setDeletedOpen(false)}
        />
      )}

      {customOpen && (
        <CustomScrambleDialog
          puzzle={puzzle}
          onClose={() => setCustomOpen(false)}
          onUse={(alg) => {
            useTimerStore.getState().setCustomScramble(alg);
            setCustomOpen(false);
          }}
        />
      )}

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

      {/* Zen Mode Exit Button */}
      {isZenMode && !solving && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50">
          <button
            type="button"
            onClick={() => setZenMode(false)}
            className="flex items-center gap-2 rounded-full bg-background/50 border border-border/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md transition-all duration-300 opacity-0 hover:opacity-100 hover:text-foreground hover:bg-background/80"
          >
            <Expand className="size-3" />
            Exit Zen Mode
          </button>
        </div>
      )}
    </div>
  );
}
