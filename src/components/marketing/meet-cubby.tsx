"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CubbyArt } from "@/components/cubby/art/cubby-art";
import { SectionHeading } from "@/components/marketing/section-heading";
import type { CubbyDirection } from "@/lib/companion/renderer";
import type { Pose } from "@/lib/companion/svg-state";

/**
 * Landing step 10 (docs/landing-plan.md → Meet Cubby), behind
 * NEXT_PUBLIC_SHOW_CUBBY with the v0 art. Three of Cubby's moments, with
 * eyes that follow the pointer while the section is on screen (not with
 * reduced motion). Draws the art directly: no timer or companion state.
 */
const MOMENTS: { caption: string; pose: Pose }[] = [
  {
    caption: "Shows you around every page",
    // Open eyes, so they can follow the pointer.
    pose: { expression: "idle", arms: "wave", body: "breathe", look: null, blindfold: false, holdingCube: false, memo: false },
  },
  {
    caption: "Cheers every PB",
    pose: { expression: "grin", arms: "up", body: "breathe", look: null, blindfold: false, holdingCube: false, memo: false },
  },
  {
    caption: "Later: coaches you with AI",
    pose: { expression: "focused", arms: "hold", body: "breathe", look: null, blindfold: true, holdingCube: true, memo: false },
  },
];

/** Which way a point lies from a centre, or null when it's close enough to look straight on. */
function directionTo(cx: number, cy: number, x: number, y: number): CubbyDirection | null {
  const dx = x - cx;
  const dy = y - cy;
  if (Math.hypot(dx, dy) < 60) return null;
  return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
}

export function MeetCubby() {
  const sectionRef = useRef<HTMLElement>(null);
  const figureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [looks, setLooks] = useState<(CubbyDirection | null)[]>([null, null, null]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let visible = false;
    let frame = 0;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) setLooks([null, null, null]);
    });
    io.observe(section);
    const onMove = (e: PointerEvent) => {
      if (!visible || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setLooks(
          figureRefs.current.map((el) => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return directionTo(r.left + r.width / 2, r.top + r.height * 0.45, e.clientX, e.clientY);
          }),
        );
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="cubby"
      aria-labelledby="cubby-heading"
      className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-20"
    >
      <SectionHeading
        id="cubby-heading"
        eyebrow="Coming with the beta"
        icon={Sparkles}
        title="Meet Cubby, your practice buddy."
        lead="A small cube with a big personality. Cubby shows you around, keeps quiet while you solve, and celebrates when you improve."
      />
      <ul className="grid gap-4 sm:grid-cols-3">
        {MOMENTS.map((m, i) => (
          <li key={m.caption} className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-6 text-center">
            <div
              ref={(el) => {
                figureRefs.current[i] = el;
              }}
              className="flex h-40 items-end justify-center"
            >
              <CubbyArt pose={m.pose.blindfold ? m.pose : { ...m.pose, look: looks[i] }} size={150} />
            </div>
            <p className="text-sm font-medium text-foreground">{m.caption}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
