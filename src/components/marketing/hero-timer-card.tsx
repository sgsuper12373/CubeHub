"use client";

import Link from "next/link";
import { ArrowRight, Hand, Play, X } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatMs } from "@/lib/timer/format";
import { generateScramble } from "@/lib/timer/scrambler";
import { cn } from "@/lib/utils";

/**
 * The hero's timer card. It has two modes:
 *
 * - **Replay** (default): a muted, looping replay of a solve — scramble, hold,
 *   go, stop — so a visitor sees what the timer does without it reacting to
 *   anything they do. It claims no keys and no touches, so Space scrolls the
 *   page and a thumb scrolling past on a phone can never start a solve. (The
 *   old demo grabbed Space whenever it was half on screen and started on any
 *   touch, which is what made the landing page so hard to browse on a phone.)
 *
 * - **Try it**: an explicit opt-in. Only then does the card become a timer,
 *   and even then input is scoped to the pad itself: keys only while the pad
 *   has focus, touches only when they start on the pad, and a finger that
 *   drifts (a scroll) cancels the hold. Esc, the close button, or scrolling
 *   the card off screen hands the page back.
 *
 * Like the old demo it shares no state with the real timer — no store, no
 * localStorage — only the pure pieces (`formatMs`, the WCA scrambler, the
 * `--timer-*` tokens), so a visitor's later solves can't go unrecorded.
 */

const HOLD_MS = 300;
const STOP_DEBOUNCE_MS = 200;
const MAX_TIMES = 5;
/** A finger that moves this far is scrolling, not holding. */
const DRIFT_PX = 12;

type Phase = "idle" | "holding" | "ready" | "running" | "stopped";
type Mode = "replay" | "live";

/** Real WCA-style scrambles, so the replay costs no worker start-up. */
const REPLAY_SCRAMBLES = [
  "R2 D' B2 U F2 D2 R2 U' L2 F2 U' B' L' D2 F' R U' F2 L' B'",
  "F' U2 L2 B2 R2 U' B2 D' R2 U' F2 R' D F' L B' U2 R' F D'",
  "U' L2 D2 F2 U R2 D' B2 U2 R' F U' L B' R2 U F' D2 L'",
  "B2 U' R2 D L2 U2 F2 L2 D' F' L' U B L2 D' R F' U2 B",
];
const REPLAY_TIMES = [9_423, 11_087, 8_736, 10_214, 9_961];

/** Replay beats, ms. `running` is time-lapsed: digits run ~4× real time. */
const BEAT = { idle: 1600, holding: 650, ready: 450, running: 2400, stopped: 2200 };

function ao5(times: number[]): number | null {
  if (times.length < 5) return null;
  const sorted = [...times].slice(0, 5).sort((a, b) => a - b);
  return (sorted[1] + sorted[2] + sorted[3]) / 3;
}

export function HeroTimerCard({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("replay");
  const [phase, setPhase] = useState<Phase>("idle");
  const [times, setTimes] = useState<number[]>([]);
  const [scramble, setScramble] = useState<string>(REPLAY_SCRAMBLES[0]);
  const reduced = useReducedMotion();
  // Reduced motion: the replay doesn't play; the card shows a finished solve.
  const still = mode === "replay" && !!reduced;
  const view: Phase = still ? "stopped" : phase;
  const shown = still ? REPLAY_TIMES : times;

  const rootRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const digitsRef = useRef<HTMLSpanElement>(null);

  const phaseRef = useRef<Phase>("idle");
  const holdStartedAt = useRef<number | null>(null);
  const solveStartedAt = useRef<number | null>(null);
  const stoppedAt = useRef<number | null>(null);
  const finalMs = useRef<number | null>(null);
  const pointerOrigin = useRef<{ id: number; x: number; y: number } | null>(null);
  /** Replay only: the time the current replay solve lands on. */
  const replayTarget = useRef(REPLAY_TIMES[0]);

  const go = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  // ── Replay loop ──────────────────────────────────────────────────────────
  // A chain of timeouts walking the phases; paused while the card is off
  // screen or the tab is hidden, and never started for reduced motion, which
  // gets one finished, static solve to look at instead (`still` below).
  useEffect(() => {
    if (mode !== "replay" || reduced) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let visible = true;
    let round = 0;
    let step: Phase = "idle";

    const schedule = () => {
      if (timer || !visible || document.hidden) return;
      timer = setTimeout(advance, BEAT[step]);
    };
    const advance = () => {
      timer = null;
      switch (step) {
        case "idle":
          step = "holding";
          break;
        case "holding":
          step = "ready";
          break;
        case "ready":
          step = "running";
          finalMs.current = null;
          solveStartedAt.current = performance.now();
          break;
        case "running":
          step = "stopped";
          finalMs.current = replayTarget.current;
          setTimes((t) => [replayTarget.current, ...t].slice(0, MAX_TIMES));
          break;
        case "stopped":
          step = "idle";
          round += 1;
          replayTarget.current = REPLAY_TIMES[round % REPLAY_TIMES.length];
          setScramble(REPLAY_SCRAMBLES[round % REPLAY_SCRAMBLES.length]);
          break;
      }
      go(step);
      schedule();
    };
    const pause = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
      else pause();
    });
    if (rootRef.current) io.observe(rootRef.current);
    const onVisibility = () => (document.hidden ? pause() : schedule());
    document.addEventListener("visibilitychange", onVisibility);

    schedule();

    return () => {
      pause();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mode, reduced, go]);

  // ── Live mode ────────────────────────────────────────────────────────────
  const nextScramble = useCallback(() => {
    void generateScramble("333")
      .then(setScramble)
      .catch(() => {
        // Keep the current scramble; the card is still a usable timer.
      });
  }, []);

  const enterLive = () => {
    finalMs.current = null;
    holdStartedAt.current = null;
    solveStartedAt.current = null;
    setTimes([]);
    go("idle");
    setMode("live");
    nextScramble();
  };

  const exitLive = useCallback(() => {
    holdStartedAt.current = null;
    solveStartedAt.current = null;
    pointerOrigin.current = null;
    setTimes([]);
    setScramble(REPLAY_SCRAMBLES[0]);
    replayTarget.current = REPLAY_TIMES[0];
    finalMs.current = null;
    go("idle");
    setMode("replay");
  }, [go]);

  // Focus the pad on entry so Space works straight away, without ever
  // listening on window.
  useEffect(() => {
    if (mode === "live") padRef.current?.focus({ preventScroll: true });
  }, [mode]);

  // Scrolled away mid-idle? Give the page back. A running solve is left alone.
  useEffect(() => {
    if (mode !== "live" || !rootRef.current) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && phaseRef.current !== "running") exitLive();
      },
      { threshold: 0.15 },
    );
    io.observe(rootRef.current);
    return () => io.disconnect();
  }, [mode, exitLive]);

  const press = useCallback(() => {
    const now = performance.now();
    const p = phaseRef.current;
    if (p === "running") {
      const elapsed = now - (solveStartedAt.current ?? now);
      finalMs.current = elapsed;
      solveStartedAt.current = null;
      stoppedAt.current = now;
      setTimes((t) => [elapsed, ...t].slice(0, MAX_TIMES));
      go("stopped");
      return;
    }
    if (p === "stopped") {
      // Ignore the tail of the press that just stopped the timer.
      if (now - (stoppedAt.current ?? 0) < STOP_DEBOUNCE_MS) return;
      nextScramble();
    }
    if (p === "idle" || p === "stopped") {
      holdStartedAt.current = now;
      go("holding");
    }
  }, [go, nextScramble]);

  const release = useCallback(() => {
    const p = phaseRef.current;
    if (p === "holding") {
      holdStartedAt.current = null;
      go(finalMs.current !== null ? "stopped" : "idle");
    } else if (p === "ready") {
      holdStartedAt.current = null;
      finalMs.current = null;
      solveStartedAt.current = performance.now();
      go("running");
    }
  }, [go]);

  /** Abandon a hold without starting — a scroll, a cancelled touch. */
  const cancelHold = useCallback(() => {
    const p = phaseRef.current;
    if (p === "holding" || p === "ready") {
      holdStartedAt.current = null;
      go(finalMs.current !== null ? "stopped" : "idle");
    }
  }, [go]);

  // ── Digits ───────────────────────────────────────────────────────────────
  // One rAF loop writing textContent, like <TimeDisplay/>, so a ticking value
  // never costs a React commit.
  useEffect(() => {
    const el = digitsRef.current;
    if (!el) return;

    const paint = (now: number) => {
      if (view === "running") {
        const elapsed = now - (solveStartedAt.current ?? now);
        el.textContent =
          mode === "replay"
            ? formatMs(Math.min(replayTarget.current, (elapsed / BEAT.running) * replayTarget.current))
            : formatMs(elapsed);
      } else if (view === "stopped" || (view === "idle" && finalMs.current !== null)) {
        el.textContent = formatMs(finalMs.current ?? REPLAY_TIMES[0]);
      } else {
        el.textContent = "0.00";
      }
    };

    paint(performance.now());
    const ticking = view === "running" || (mode === "live" && view === "holding");
    if (!ticking) return;

    let frame = 0;
    const loop = () => {
      const now = performance.now();
      if (
        mode === "live" &&
        phaseRef.current === "holding" &&
        holdStartedAt.current !== null &&
        now - holdStartedAt.current >= HOLD_MS
      ) {
        go("ready"); // the phase change re-runs this effect
        return;
      }
      paint(now);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [view, mode, go]);

  const live = mode === "live";
  const average = ao5(shown);

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      {/* Soft halo that takes on the timer's state colour. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -inset-6 rounded-[2rem] opacity-60 blur-3xl transition-colors duration-300",
          view === "holding" && "bg-timer-holding/25",
          view === "ready" && "bg-timer-ready/30",
          view === "running" && "bg-timer-running/20",
          (view === "idle" || view === "stopped") && "bg-primary/15",
        )}
      />

      <div className="relative overflow-hidden rounded-3xl border border-border bg-card/90 shadow-2xl shadow-primary/10 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-full transition-colors duration-150",
                view === "idle" && "bg-foreground-subtle",
                view === "holding" && "bg-timer-holding",
                view === "ready" && "bg-timer-ready",
                view === "running" && "bg-timer-running",
                view === "stopped" && "bg-primary",
              )}
            />
            {view}
          </span>
          <span className="flex items-center gap-2">
            3×3 · WCA
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                live ? "bg-primary text-primary-foreground" : "bg-surface-raised text-muted-foreground",
              )}
            >
              {live ? "Live" : "Replay"}
            </span>
          </span>
        </div>

        {/* Scramble */}
        <p
          aria-label={`Scramble: ${scramble}`}
          className="mx-5 mt-4 min-h-[3.25rem] rounded-xl border border-border/70 bg-surface-raised/60 px-3 py-2 text-center font-mono text-xs leading-relaxed text-foreground/90 sm:text-sm"
        >
          {scramble}
        </p>

        {/* Pad: the only element that ever reacts to input, and only live. */}
        <div
          ref={padRef}
          role={live ? "button" : undefined}
          tabIndex={live ? 0 : -1}
          aria-label={
            live
              ? "Practice timer. Hold Space or press and hold here, release to start, press again to stop. Escape to exit."
              : undefined
          }
          aria-hidden={live ? undefined : true}
          className={cn(
            "mx-5 my-3 flex select-none flex-col items-center justify-center rounded-2xl py-6 outline-none transition-colors sm:py-8",
            live &&
              "cursor-pointer touch-none bg-surface-raised/40 ring-1 ring-border focus-visible:ring-2 focus-visible:ring-ring",
          )}
          onKeyDown={
            live
              ? (e) => {
                  if (e.key === "Escape" && phaseRef.current !== "running") {
                    exitLive();
                    return;
                  }
                  if (e.repeat) return;
                  // Any key stops a running solve; only Space arms one.
                  if (phaseRef.current === "running" || e.code === "Space") {
                    e.preventDefault();
                    press();
                  }
                }
              : undefined
          }
          onKeyUp={
            live
              ? (e) => {
                  if (e.code !== "Space") return;
                  e.preventDefault();
                  release();
                }
              : undefined
          }
          onBlur={live ? cancelHold : undefined}
          onPointerDown={
            live
              ? (e) => {
                  if (!e.isPrimary || e.button !== 0) return;
                  pointerOrigin.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
                  e.currentTarget.focus({ preventScroll: true });
                  press();
                }
              : undefined
          }
          onPointerMove={
            live
              ? (e) => {
                  const o = pointerOrigin.current;
                  if (!o || o.id !== e.pointerId) return;
                  if (Math.hypot(e.clientX - o.x, e.clientY - o.y) > DRIFT_PX) {
                    pointerOrigin.current = null;
                    cancelHold();
                  }
                }
              : undefined
          }
          onPointerUp={
            live
              ? (e) => {
                  if (pointerOrigin.current?.id !== e.pointerId) return;
                  pointerOrigin.current = null;
                  release();
                }
              : undefined
          }
          onPointerCancel={
            live
              ? () => {
                  pointerOrigin.current = null;
                  cancelHold();
                }
              : undefined
          }
          onContextMenu={live ? (e) => e.preventDefault() : undefined}
        >
          <span
            ref={digitsRef}
            className={cn(
              "font-timer text-6xl leading-none font-bold tracking-tight transition-[color,transform] duration-150 sm:text-7xl",
              (view === "idle" || view === "stopped") && "text-timer-digits",
              view === "holding" && "scale-95 text-timer-holding",
              view === "ready" && "timer-ready-pulse text-timer-ready",
              view === "running" && "text-timer-running",
              view === "stopped" && live && "timer-stop-flash",
            )}
          >
            0.00
          </span>
          <span className="mt-3 h-4 text-xs text-muted-foreground">
            {live ? (
              <>
                <span className="hidden sm:inline">
                  Hold <Kbd>Space</Kbd> or press here · release to start
                </span>
                <span className="sm:hidden">Press and hold here · release to start</span>
              </>
            ) : (
              <span className="text-foreground-subtle">Time-lapsed replay · it won&apos;t react to taps</span>
            )}
          </span>
        </div>

        {/* Recent */}
        <div className="flex min-h-11 items-center gap-2 overflow-x-auto border-t border-border/70 px-5 py-2.5 font-mono text-xs tabular-nums hide-scrollbar">
          {shown.length === 0 ? (
            <span className="text-foreground-subtle">Your last five solves appear here</span>
          ) : (
            <>
              {shown.map((t, i) => (
                <span
                  key={`${shown.length}-${i}`}
                  className={cn(
                    "shrink-0 rounded-md border px-1.5 py-0.5",
                    i === 0
                      ? "border-primary/40 bg-primary/10 font-semibold text-primary"
                      : "border-border/70 text-muted-foreground",
                  )}
                >
                  {formatMs(t)}
                </span>
              ))}
              {average !== null && (
                <span className="ml-auto shrink-0 text-muted-foreground">
                  ao5 <span className="font-semibold text-foreground">{formatMs(average)}</span>
                </span>
              )}
            </>
          )}
        </div>

        {/* Mode switch */}
        <div className="flex items-center justify-between gap-2 border-t border-border/70 bg-surface-raised/40 px-3 py-2.5">
          {live ? (
            <button
              type="button"
              onClick={exitLive}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={enterLive}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary/10 px-4 text-sm font-semibold text-primary ring-1 ring-primary/25 transition-colors hover:bg-primary/15"
            >
              {reduced ? <Hand className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              Try a solve here
            </button>
          )}
          <Link
            href="/timer"
            className="group inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold text-foreground transition-colors hover:text-primary"
          >
            Full timer
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-flex h-5 items-center rounded border border-border bg-surface-raised px-1.5 font-mono text-[11px] font-semibold text-foreground">
      {children}
    </kbd>
  );
}
