"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { DemoTimer } from "@/components/marketing/demo-timer";
import { HeroCube } from "@/components/marketing/hero-cube";
import { Button } from "@/components/ui/button";

/**
 * The unified hero — a cinematic splash that plays on every desktop visit, then
 * hands off to the live landing hero ("Seamless Hand-off", design brief).
 *
 * Desktop → an auto-solving 3D cube plays centre-stage, then springs to its
 * right-hand slot while the UI fades in. Mobile and reduced-motion → the UI is
 * live immediately (Space times a solve) with the cube parked, idly turning.
 *
 * Hydration-safe: SSR and the first client render show the final, visible
 * layout (deterministic, good for no-JS + SEO). A `mounted` guard then, on a
 * desktop viewport, takes over with the cinematic. `useReducedMotion` and small
 * viewports force the instant path.
 *
 * Hand-off mechanics: the <twisty-player> mounts once and never moves in the
 * DOM (a move would rebuild its WebGL context). "Centre stage" is a transform
 * delta on an inner wrapper, measured from an *untransformed* outer cell so the
 * measurement stays honest. Framer animates only x/y/scale.
 */

/** Safety net: reveal even if the cube never signals a finished solve. */
const CINEMATIC_MAX_MS = 4000;

type Mode = "pending" | "cinematic" | "instant";
type Stage = "cover" | "handoff" | "done";

export function HeroSection() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>("pending");
  const [stage, setStage] = useState<Stage>("cover");
  const [delta, setDelta] = useState({ x: 0, y: 0 });

  const cellRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  // Decide the path after mount. The cinematic plays on every desktop visit;
  // mobile and reduced-motion get the instant hero. Deferred a frame so the
  // state updates land in a callback, not synchronously in the effect body
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      if (prefersReduced || !isDesktop) {
        setMode("instant");
        setStage("done");
      } else {
        setMode("cinematic");
        setStage("cover");
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [prefersReduced]);

  // Measure the cube's resting centre from the untransformed outer cell.
  useLayoutEffect(() => {
    if (mode !== "cinematic") return;
    const measure = () => {
      const el = cellRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setDelta({
        x: window.innerWidth / 2 - (r.left + r.width / 2),
        y: window.innerHeight / 2 - (r.top + r.height / 2),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [mode]);

  // Failsafe hand-off if the solve callback never lands.
  useEffect(() => {
    if (mode !== "cinematic" || stage !== "cover") return;
    const t = setTimeout(() => setStage("handoff"), CINEMATIC_MAX_MS);
    return () => clearTimeout(t);
  }, [mode, stage]);

  // Settle to the resting state once the hand-off begins.
  useEffect(() => {
    if (stage !== "handoff") return;
    const t = setTimeout(() => setStage("done"), 1000);
    return () => clearTimeout(t);
  }, [stage]);

  const onSolved = useCallback(() => {
    setStage((s) => (s === "cover" ? "handoff" : s));
  }, []);

  const coverActive = mounted && mode === "cinematic" && stage === "cover";
  const cubeMode: "solve" | "idle" = mode === "instant" ? "idle" : "solve";

  return (
    <section className="relative bg-background">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:min-h-[calc(100svh-3.5rem)]">
        {/* ── Left: the landing UI ── */}
        <motion.div
          initial={false}
          animate={{ opacity: coverActive ? 0 : 1, y: coverActive ? 14 : 0 }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
            delay: stage === "handoff" ? 0.12 : 0,
          }}
          className="relative z-10 flex flex-col items-center gap-6 text-center md:items-start md:text-left"
        >
          <div className="flex flex-col items-center gap-4 md:items-start">
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
              Your cubing timer, and everything after it.
            </h1>
            <p className="max-w-md text-pretty text-muted-foreground md:text-lg">
              Time a solve right here — no sign-up, no setup. Then keep the
              tutorials, stats, races and buying advice in the same place.
            </p>
          </div>

          <DemoTimer className="w-full max-w-md" />

          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <Button size="lg" nativeButton={false} render={<Link href="/timer" />}>
              Start timing free
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/signup" />}
            >
              Create account
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            WCA-compliant scrambles · Works offline · Free forever
          </p>
        </motion.div>

        {/* ── Right (desktop) / behind the card (mobile): the cube ──
            Outer cell is never transformed, so its rect gives the resting
            centre. On mobile it drops behind the timer card at low opacity and
            takes no pointer events, so it can't steal a solving tap. */}
        <div
          ref={cellRef}
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.12] md:pointer-events-auto md:relative md:inset-auto md:z-20 md:opacity-100"
        >
          <motion.div
            initial={false}
            animate={
              coverActive
                ? { x: delta.x, y: delta.y, scale: 1.5 }
                : { x: 0, y: 0, scale: 1 }
            }
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
            className="grid size-full place-items-center"
          >
            {mounted ? (
              <HeroCube mode={cubeMode} size={260} onSolved={onSolved} />
            ) : (
              <div className="size-[260px]" />
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
