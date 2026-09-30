"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, Trash2 } from "lucide-react";

import { DrillCaseView } from "@/components/drill/drill-case-view";
import { SessionList, SetRanking, VariantPicker } from "@/components/drill/drill-report";
import { Button } from "@/components/ui/button";
import { deleteDrillAttempt, recordDrillAttempt, setDrillAttemptPenalty } from "@/lib/drill/actions";
import { randomAuf, type Auf } from "@/lib/drill/case-state";
import type { DrillCase, DrillSubset } from "@/lib/drill/dal";
import { currentVariantId, nextCase, statsFromAttempts } from "@/lib/drill/order";
import type { DrillAttempt, DrillOrder, VariantStats } from "@/lib/drill/types";
import { formatMs, formatResult } from "@/lib/timer/format";
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
}) {
  const router = useRouter();
  const phase = useDrillStore((s) => s.phase);
  const recognitionMode = useDrillStore((s) => s.recognitionMode);
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
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
    (timeMs: number, recognitionMs: number | null) => {
      const { drillCase: c, algorithm: a } = latest.current;
      const attempt: SessionAttempt = {
        id: crypto.randomUUID(),
        algorithmId: a.id,
        caseId: c.id,
        timeMs,
        penalty: "none",
        recognitionMs,
        createdAt: new Date().toISOString(),
        serverId: null,
        saving: isAuthed,
      };
      setAttempts((prev) => [attempt, ...prev]);
      if (!isAuthed) return;

      recordDrillAttempt({ algorithmId: a.id, caseId: c.id, timeMs, penalty: "none", recognitionMs })
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
      if (outcome.type === "stopped") recordStop(outcome.timeMs, outcome.recognitionMs);
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
      if (store.phase === "stopped" || store.phase === "idle" || store.phase === "hidden") {
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
  const live = phase === "running" || phase === "recognising";
  useEffect(() => {
    if (!live) return;
    if (digitsRef.current) digitsRef.current.textContent = "0.00";
    let frame = 0;
    const tick = () => {
      const s = useDrillStore.getState();
      const from = s.phase === "running" ? s.startedAt : s.revealedAt;
      if (digitsRef.current && from !== null) {
        digitsRef.current.textContent = formatMs(performance.now() - from);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [live]);

  const last = attempts[0];
  const shownTime =
    phase === "stopped" && last ? formatResult(last.timeMs, last.penalty) : lastTimeMs !== null && phase === "idle" ? formatMs(lastTimeMs) : "0.00";

  const hint = {
    idle: "tap or press space to start",
    hidden: "tap to reveal the case",
    recognising: "tap when you recognise it — execution starts",
    running: "tap or any key to stop",
    stopped: "tap for the next case · 1 = +2 · 2 = DNF · d = delete",
  }[phase];

  const setHref = (slug: string) => `/learn/${puzzle}/drill?set=${encodeURIComponent(slug)}`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6">
      {/* Set picker */}
      <nav className="flex flex-wrap items-center gap-1.5" aria-label="Drill set">
        {subsets.map((s) => (
          <Button
            key={s.slug}
            size="sm"
            variant={activeSet === s.slug ? "default" : "outline"}
            render={<Link href={setHref(s.slug)} />}
            nativeButton={false}
          >
            {s.name}
          </Button>
        ))}
        <Button
          size="sm"
          variant={activeSet === "all" ? "default" : "outline"}
          render={<Link href={`${setHref("all")}&order=weakest`} />}
          nativeButton={false}
        >
          All cases
        </Button>
        {activeSet === "custom" && (
          <Button size="sm" variant="default" disabled>
            Custom · {cases.length}
          </Button>
        )}

        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />

        <div className="flex items-center rounded-md border border-border p-0.5" role="group" aria-label="Case order">
          <span className="px-1.5 text-xs text-muted-foreground">Order</span>
          {(["weakest", "random"] as const).map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={order === o}
              onClick={() => setOrder(o)}
              className={cn(
                "rounded px-2 py-0.5 text-xs",
                order === o ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o === "weakest" ? "Weakest first" : "Random"}
            </button>
          ))}
        </div>
      </nav>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:items-start">
        {/* Stage: the whole panel is the tap target */}
        <section
          role="button"
          aria-label={`Drill timer: ${hint}`}
          tabIndex={-1}
          className="flex min-h-[420px] cursor-pointer touch-none select-none flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-4"
          onPointerDown={(e) => {
            if (!e.isPrimary || e.button > 0) return;
            e.preventDefault();
            handle(useDrillStore.getState().press(performance.now()));
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground" data-testid="drill-case-name">
              {phase === "hidden" ? "Next case" : drillCase.name}
            </p>
            {phase !== "hidden" && phase !== "recognising" && (
              <p className="font-mono text-xs text-muted-foreground">
                {current.auf && <span className="text-primary">{current.auf} </span>}
                {phase === "stopped" || phase === "idle" ? algorithm.moves : "…"}
              </p>
            )}
          </div>

          <DrillCaseView
            moves={algorithm.moves}
            auf={current.auf}
            puzzle={puzzle}
            visualization={visualization}
            hidden={phase === "hidden"}
            showSetup={showSetup}
          />

          <p
            className={cn(
              "font-mono text-6xl tabular-nums",
              phase === "running" ? "text-foreground" : phase === "recognising" ? "text-amber-400" : "text-foreground/90",
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
          <p className="text-xs text-muted-foreground">{hint}</p>

          {phase === "stopped" && last && (
            <div className="flex gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
              <Button size="xs" variant={last.penalty === "plus2" ? "default" : "outline"} disabled={last.saving} onClick={() => setLastPenalty("plus2")}>
                +2
              </Button>
              <Button size="xs" variant={last.penalty === "dnf" ? "default" : "outline"} disabled={last.saving} onClick={() => setLastPenalty("dnf")}>
                DNF
              </Button>
              <Button size="xs" variant="outline" disabled={last.saving} onClick={deleteLast} aria-label="Delete attempt">
                <Trash2 className="size-3" />
              </Button>
            </div>
          )}
        </section>

        {/* Side panel */}
        <div className="space-y-4">
          <section className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-border bg-card p-4 text-sm" aria-label="Drill options">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={recognitionMode}
                onChange={(e) => useDrillStore.getState().setRecognitionMode(e.target.checked)}
              />
              Recognition split
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={randomizeAuf}
                onChange={(e) => setRandomizeAuf(e.target.checked)}
              />
              Random AUF
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={showSetup}
                onChange={(e) => setShowSetup(e.target.checked)}
              />
              Show setup
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={visualization === "2D"}
                onChange={(e) => setVisualization(e.target.checked ? "2D" : "3D")}
              />
              2D view
            </label>
          </section>

          <VariantPicker
            drillCase={drillCase}
            stats={stats}
            selectedId={algorithm.id}
            onSelect={(id) => setVariantChoice((prev) => ({ ...prev, [drillCase.id]: id }))}
          />

          {!isAuthed && attempts.length >= 3 && (
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

          <SessionList attempts={attempts} caseNames={caseNames} />

          <section className="rounded-lg border border-border bg-card p-4" aria-label="Cases in this set">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Cases, weakest first</h2>
              {selecting ? (
                <div className="flex gap-1.5">
                  <Button size="xs" variant="ghost" onClick={() => setSelecting(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    disabled={selected.size === 0}
                    onClick={() =>
                      router.push(`/learn/${puzzle}/drill?cases=${[...selected].join(",")}`)
                    }
                  >
                    Drill {selected.size} selected
                  </Button>
                </div>
              ) : (
                <Button size="xs" variant="outline" onClick={() => setSelecting(true)}>
                  Custom set
                </Button>
              )}
            </div>
            <SetRanking
              cases={cases}
              stats={stats}
              now={now}
              selecting={selecting}
              selected={selected}
              onToggle={(id) =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
            />
          </section>
        </div>
      </div>
    </div>
  );
}
