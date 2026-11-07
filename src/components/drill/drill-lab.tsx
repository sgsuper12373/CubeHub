"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LogIn, Trash2 } from "lucide-react";

import { CaseTable } from "@/components/drill/case-table";
import { DrillCaseView } from "@/components/drill/drill-case-view";
import { SessionList, VariantPicker } from "@/components/drill/drill-report";
import { DrillToolbar, type DrillOptionKey } from "@/components/drill/drill-toolbar";
import { StartPad } from "@/components/drill/start-pad";
import { Button } from "@/components/ui/button";
import { deleteDrillAttempt, recordDrillAttempt, setDrillAttemptPenalty } from "@/lib/drill/actions";
import { randomAuf, type Auf } from "@/lib/drill/case-state";
import type { DrillCase, DrillSubset } from "@/lib/drill/dal";
import { currentVariantId, nextCase, statsFromAttempts } from "@/lib/drill/order";
import type { DrillAttempt, DrillOrder, VariantStats } from "@/lib/drill/types";
import { formatMs, formatResult } from "@/lib/timer/format";
import { drillMisfireLimitMs } from "@/lib/timer/misfire";
import type { Penalty } from "@/lib/timer/types";
import { cn } from "@/lib/utils";
import { useDrillStore, type PressOutcome } from "@/stores/drill-store";
import { isOverlayOpen } from "@/stores/overlay-store";
import { toast } from "@/stores/toast-store";

interface SessionAttempt extends DrillAttempt {
  /** The database id once saved; null for guests and while saving. */
  serverId: string | null;
  saving: boolean;
}

/** The panel beside the stage at lg (xl shows them all). */
type PanelTab = "cases" | "variants" | "session";

/** Input types where Space is a control action, not typing. */
const NON_TEXT_INPUTS: ReadonlySet<string> = new Set(["checkbox", "radio", "button", "range"]);

/**
 * True where keys are text entry. A focused checkbox (right after toggling a
 * drill option) is deliberately NOT editable: Space must drive the drill, not
 * silently untick the option the user just set.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(target.type);
  return target.isContentEditable || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

const HIDE_ALG_KEY = "cubehub.drill.hideAlg";

/** The "hide algorithm" option, remembered per browser. On unless turned off. */
function loadHideAlg(): boolean {
  try {
    return window.localStorage.getItem(HIDE_ALG_KEY) !== "0";
  } catch {
    return true;
  }
}

function saveHideAlg(hide: boolean) {
  try {
    window.localStorage.setItem(HIDE_ALG_KEY, hide ? "1" : "0");
  } catch {
    // Private mode or blocked storage: the choice lasts for this visit only.
  }
}

/** Replace one case's rows with the server's fresh ones. */
function mergeCaseStats(
  prev: ReadonlyMap<string, VariantStats>,
  caseId: string,
  rows: VariantStats[],
): Map<string, VariantStats> {
  const next = new Map([...prev].filter(([, s]) => s.caseId !== caseId));
  for (const r of rows) next.set(r.algorithmId, r);
  return next;
}

export function DrillLab({
  puzzle,
  subsets,
  activeSet,
  cases,
  initialStats,
  initialCaseId,
  initialAuf,
  initialOrder,
  isAuthed,
  scopeInfo,
}: {
  puzzle: string;
  subsets: DrillSubset[];
  /** Subset slug, "all", or "custom". */
  activeSet: string;
  cases: DrillCase[];
  initialStats: VariantStats[];
  initialCaseId: string;
  initialAuf: Auf;
  initialOrder: DrillOrder;
  isAuthed: boolean;
  /** For one set: whether only learned cases are queued, and the counts. */
  scopeInfo: { scope: "learned" | "all"; learned: number; total: number } | null;
}) {
  const phase = useDrillStore((s) => s.phase);
  const lastTimeMs = useDrillStore((s) => s.lastTimeMs);

  const [serverStats, setServerStats] = useState(
    () => new Map(initialStats.map((s) => [s.algorithmId, s])),
  );
  const [attempts, setAttempts] = useState<SessionAttempt[]>([]);
  const [current, setCurrent] = useState<{ caseId: string; auf: Auf }>({
    caseId: initialCaseId,
    auf: initialAuf,
  });
  const [variantChoice, setVariantChoice] = useState<Record<string, string>>({});
  const [order, setOrder] = useState<DrillOrder>(initialOrder);
  const [randomizeAuf, setRandomizeAuf] = useState(true);
  const [visualization, setVisualization] = useState<"2D" | "3D">("3D");
  const [showSetup, setShowSetup] = useState(false);
  // Recall, not reading: the moves stay hidden until the rep is done. Starts on
  // for the server render, then follows the saved choice.
  const [hideAlg, setHideAlg] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after hydration
    setHideAlg(loadHideAlg());
  }, []);
  const [optionsOpen, setOptionsOpen] = useState(false);
  /** Which panel shows beside the stage at lg, where there is room for one. */
  const [panelTab, setPanelTab] = useState<PanelTab>("variants");
  // "Now" for due-date display, refreshed per case rather than per render.
  const [now, setNow] = useState(() => Date.now());

  // Guests have no stored stats: everything comes from this sitting.
  const stats = useMemo(
    () => (isAuthed ? serverStats : statsFromAttempts(attempts)),
    [isAuthed, serverStats, attempts],
  );

  const caseById = useMemo(() => new Map(cases.map((c) => [c.id, c])), [cases]);
  const caseNames = useMemo(() => new Map(cases.map((c) => [c.id, c.name])), [cases]);
  const drillCase = caseById.get(current.caseId) ?? cases[0];
  const algorithmId =
    variantChoice[drillCase.id] ?? currentVariantId(drillCase, stats) ?? drillCase.algorithms[0].id;
  const algorithm = drillCase.algorithms.find((a) => a.id === algorithmId) ?? drillCase.algorithms[0];

  // Latest values for the window-level key listener, which mounts once.
  const latest = useRef({ drillCase, algorithm, attempts, stats, order, randomizeAuf, current });
  useEffect(() => {
    latest.current = { drillCase, algorithm, attempts, stats, order, randomizeAuf, current };
  });

  // A fresh page (new set) always starts at the beginning of a rep.
  useEffect(() => {
    useDrillStore.getState().reset();
  }, [cases]);

  // ── Side effects of a tap ────────────────────────────────────────────────
  const recordStop = useCallback(
    (timeMs: number) => {
      // Captured now: by the time "Save anyway" is tapped the drill has moved on.
      const { drillCase: c, algorithm: a } = latest.current;

      const save = () => {
        const attempt: SessionAttempt = {
          id: crypto.randomUUID(),
          algorithmId: a.id,
          caseId: c.id,
          timeMs,
          penalty: "none",
          recognitionMs: null,
          createdAt: new Date().toISOString(),
          serverId: null,
          saving: isAuthed,
        };
        setAttempts((prev) => [attempt, ...prev]);
        if (!isAuthed) return;

        recordDrillAttempt({ algorithmId: a.id, caseId: c.id, timeMs, penalty: "none", recognitionMs: null })
          .then((res) => {
            setAttempts((prev) =>
              prev.map((x) => (x.id === attempt.id ? { ...x, serverId: res.id, saving: false } : x)),
            );
            setServerStats((prev) => mergeCaseStats(prev, c.id, res.stats));
          })
          .catch((err: unknown) => {
            console.error(err);
            setAttempts((prev) => prev.map((x) => (x.id === attempt.id ? { ...x, saving: false } : x)));
            toast({ kind: "error", message: "Couldn't save that attempt", durationMs: 4000 });
          });
      };

      // Faster than anyone turns: a slip of the finger, not a rep. Not saved
      // unless the cuber says it was real.
      if (timeMs < drillMisfireLimitMs(a.move_count)) {
        toast({
          kind: "info",
          message: `${formatMs(timeMs)} is too quick for ${a.move_count} moves, so it wasn't saved.`,
          durationMs: 6000,
          action: { label: "Save anyway", onAction: save },
        });
        return;
      }
      save();
    },
    [isAuthed],
  );

  const advance = useCallback(() => {
    const { stats: s, order: o, randomizeAuf: r, current: cur } = latest.current;
    const t = Date.now();
    setNow(t);
    const next = nextCase(cases, s, o, cur.caseId, Math.random, t);
    if (next) setCurrent({ caseId: next.id, auf: r ? randomAuf() : "" });
  }, [cases]);

  const handle = useCallback(
    (outcome: PressOutcome) => {
      if (outcome.type === "stopped") recordStop(outcome.timeMs);
      else if (outcome.type === "advance") advance();
    },
    [recordStop, advance],
  );

  const setLastPenalty = useCallback(
    (penalty: Exclude<Penalty, "none">) => {
      const last = latest.current.attempts[0];
      if (!last || last.saving) return;
      const next: Penalty = last.penalty === penalty ? "none" : penalty;
      setAttempts((prev) => prev.map((x) => (x.id === last.id ? { ...x, penalty: next } : x)));
      if (last.serverId) {
        setDrillAttemptPenalty(last.serverId, last.caseId, next)
          .then((rows) => setServerStats((prev) => mergeCaseStats(prev, last.caseId, rows)))
          .catch(() => toast({ kind: "error", message: "Couldn't update that attempt", durationMs: 4000 }));
      }
    },
    [],
  );

  const setOption = useCallback((key: DrillOptionKey, on: boolean) => {
    switch (key) {
      case "hideAlg":
        setHideAlg(on);
        saveHideAlg(on);
        break;
      case "randomizeAuf":
        setRandomizeAuf(on);
        break;
      case "showSetup":
        setShowSetup(on);
        break;
      case "twoD":
        setVisualization(on ? "2D" : "3D");
        break;
    }
  }, []);

  const deleteLast = useCallback(() => {
    const last = latest.current.attempts[0];
    if (!last || last.saving) return;
    setAttempts((prev) => prev.filter((x) => x.id !== last.id));
    if (last.serverId) {
      deleteDrillAttempt(last.serverId, last.caseId)
        .then((rows) => setServerStats((prev) => mergeCaseStats(prev, last.caseId, rows)))
        .catch(() => toast({ kind: "error", message: "Couldn't delete that attempt", durationMs: 4000 }));
    }
  }, []);

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isOverlayOpen() || isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const store = useDrillStore.getState();

      if (e.key === "Escape") {
        store.cancel();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        handle(store.press(performance.now()));
        return;
      }
      // Panic stop: any key ends a running rep.
      if (store.phase === "running") {
        handle(store.press(performance.now()));
        return;
      }
      if (store.phase === "stopped" || store.phase === "idle") {
        if (e.key === "1") setLastPenalty("plus2");
        else if (e.key === "2") setLastPenalty("dnf");
        else if (e.key.toLowerCase() === "d") deleteLast();
      }
    };
    // Space already drove the timer on keydown; stop it also activating
    // whichever button last had focus (e.g. "Watch") on keyup.
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isOverlayOpen() && !isEditableTarget(e.target)) e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [handle, setLastPenalty, deleteLast]);

  // ── Live digits (imperative, like the main timer: no React commits per frame) ─
  const digitsRef = useRef<HTMLSpanElement>(null);
  const live = phase === "running";
  useEffect(() => {
    if (!live) return;
    if (digitsRef.current) digitsRef.current.textContent = "0.00";
    let frame = 0;
    const tick = () => {
      const s = useDrillStore.getState();
      if (digitsRef.current && s.startedAt !== null) {
        digitsRef.current.textContent = formatMs(performance.now() - s.startedAt);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [live]);

  const last = attempts[0];
  const shownTime =
    phase === "stopped" && last ? formatResult(last.timeMs, last.penalty) : lastTimeMs !== null && phase === "idle" ? formatMs(lastTimeMs) : "0.00";

  const press = () => handle(useDrillStore.getState().press(performance.now()));

  const panes: { id: PanelTab; label: string }[] = [
    { id: "cases", label: "Cases" },
    { id: "variants", label: "Variants" },
    { id: "session", label: "Session" },
  ];

  return (
    // lg and up: exactly the viewport under the navbar (h-14 plus its 1px
    // bottom border); panes scroll inside themselves, never the page. Below lg
    // the panes stack and the page scrolls.
    <div className="flex w-full flex-col gap-3 p-4 lg:h-[calc(100dvh-3.5rem-1px)] lg:overflow-hidden">
      <DrillToolbar
        puzzle={puzzle}
        subsets={subsets}
        activeSet={activeSet}
        caseCount={cases.length}
        scopeInfo={scopeInfo}
        order={order}
        onOrderChange={setOrder}
        options={{ hideAlg, randomizeAuf, showSetup, visualization }}
        onOptionChange={setOption}
        optionsOpen={optionsOpen}
        onOptionsOpenChange={setOptionsOpen}
      />

      {/*
        xl: cases | stage | variants + session.
        lg: stage | one panel, picked with the tabs above it.
        Below lg: stage, variants, session, cases, stacked.
      */}
      <div className="flex flex-col gap-4 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_340px] xl:grid-rows-[minmax(0,1fr)]">
        <div
          role="tablist"
          aria-label="Drill panels"
          className="hidden rounded-lg border border-border p-0.5 lg:col-start-2 lg:row-start-1 lg:flex xl:hidden"
        >
          {panes.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`drill-tab-${t.id}`}
              aria-selected={panelTab === t.id}
              aria-controls={`drill-pane-${t.id}`}
              onClick={() => setPanelTab(t.id)}
              className={cn(
                "flex-1 rounded-md px-2.5 py-1 text-sm",
                panelTab === t.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          id="drill-pane-cases"
          className={cn(
            "flex min-h-0 flex-col max-lg:order-last lg:col-start-2 lg:row-start-2 xl:col-start-1 xl:row-start-1",
            panelTab !== "cases" && "lg:hidden xl:flex",
          )}
        >
          <CaseTable puzzle={puzzle} cases={cases} stats={stats} now={now} className="flex-1" />
        </div>

        {/*
          Stage. Only the start pad starts a rep, so the cube can be dragged to
          look at it. While a rep runs, a transparent layer over the whole stage
          makes any tap stop it.
        */}
        <section
          aria-label="Drill stage"
          className="relative flex min-h-[420px] flex-col rounded-2xl border border-border bg-card max-lg:order-first lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:min-h-0 xl:col-start-2 xl:row-span-1"
        >
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 lg:min-h-0 lg:overflow-y-auto">
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground" data-testid="drill-case-name">
                {drillCase.name}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {current.auf && <span className="text-primary">{current.auf} </span>}
                {phase === "stopped" || (phase === "idle" && !hideAlg)
                  ? algorithm.moves
                  : phase === "idle"
                    ? "algorithm hidden until you've done it"
                    : "…"}
              </p>
            </div>

            <DrillCaseView
              moves={algorithm.moves}
              auf={current.auf}
              puzzle={puzzle}
              visualization={visualization}
              showSetup={showSetup}
            />

            <p
              className={cn(
                "font-mono text-6xl tabular-nums",
                phase === "running" ? "text-foreground" : "text-foreground/90",
              )}
              aria-live="off"
            >
              {/* The live span is written by the rAF loop only, never by React. */}
              {live ? (
                <span ref={digitsRef} data-testid="drill-time" />
              ) : (
                <span data-testid="drill-time">{shownTime}</span>
              )}
            </p>

            {/* Always takes its height, so the pad below never moves on a stop. */}
            <div className="flex h-6 gap-1.5">
              {phase === "stopped" && last && (
                <>
                  <Button size="xs" variant={last.penalty === "plus2" ? "default" : "outline"} disabled={last.saving} onClick={() => setLastPenalty("plus2")}>
                    +2
                  </Button>
                  <Button size="xs" variant={last.penalty === "dnf" ? "default" : "outline"} disabled={last.saving} onClick={() => setLastPenalty("dnf")}>
                    DNF
                  </Button>
                  <Button size="xs" variant="outline" disabled={last.saving} onClick={deleteLast} aria-label="Delete attempt">
                    <Trash2 className="size-3" />
                  </Button>
                </>
              )}
            </div>

            <StartPad phase={phase} onPress={press} className="max-w-xl" />
          </div>

          {phase === "running" && (
            <div
              aria-hidden="true"
              data-testid="drill-stop-layer"
              className="absolute inset-0 z-10 cursor-pointer touch-none rounded-2xl select-none"
              onPointerDown={(e) => {
                if (!e.isPrimary || e.button > 0) return;
                e.preventDefault();
                press();
              }}
              onContextMenu={(e) => e.preventDefault()}
            />
          )}
        </section>

        {/* Variants and this session: one scrolling column at xl, two tabs at lg. */}
        <div
          className={cn(
            "flex min-h-0 flex-col gap-4 lg:col-start-2 lg:row-start-2 lg:overflow-y-auto xl:col-start-3 xl:row-start-1",
            panelTab === "cases" && "lg:hidden xl:flex",
          )}
        >
          <div id="drill-pane-variants" className={cn(panelTab !== "variants" && "lg:hidden xl:block")}>
            <VariantPicker
              drillCase={drillCase}
              stats={stats}
              selectedId={algorithm.id}
              onSelect={(id) => setVariantChoice((prev) => ({ ...prev, [drillCase.id]: id }))}
              hideMoves={hideAlg && phase !== "stopped"}
            />
          </div>

          <div id="drill-pane-session" className={cn("space-y-4", panelTab !== "session" && "lg:hidden xl:block")}>
            {!isAuthed && attempts.length >= 1 && (
              <p className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
                <LogIn className="size-4 shrink-0 text-primary" />
                <span>
                  <Link href="/login" className="font-medium text-primary hover:underline">
                    Sign in
                  </Link>{" "}
                  to keep your drill history, spaced-repetition schedule and variant stats across sessions.
                </span>
              </p>
            )}

            {attempts.length > 0 ? (
              <SessionList attempts={attempts} caseNames={caseNames} saved={isAuthed} />
            ) : (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Your reps this session show up here.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
