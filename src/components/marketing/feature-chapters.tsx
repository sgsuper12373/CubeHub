"use client";

import { ArrowRight, BarChart3, Box, GraduationCap, Target, Users, type LucideIcon } from "lucide-react";
import { motion, motionValue, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import Link from "next/link";
import { useRef } from "react";

import { PinnedChapter } from "@/components/marketing/motion/pinned-chapter";
import { Eyebrow } from "@/components/marketing/section-heading";
import { appHref } from "@/lib/marketing/links";
import { ScramblePreview } from "@/components/timer/scramble-preview";
import { formatMs } from "@/lib/timer/format";
import { cn } from "@/lib/utils";

/**
 * The five feature chapters (docs/landing-plan.md → Feature chapters). From lg
 * up each one pins its visual while the text scrolls, and the chapter's scroll
 * progress drives the visual; on phones (and for reduced motion) they're plain
 * stacked sections showing each visual's finished state.
 *
 * The visuals are animated SVG and HTML rather than recorded videos: they
 * follow the theme, weigh nothing, and need no re-recording when the UI
 * changes. Every chapter has a real h2 and body text for search engines and
 * screen readers; the visuals are aria-hidden.
 */

type Chapter = {
  id: string;
  eyebrow: string;
  icon: LucideIcon;
  title: string;
  body: string;
  points: string[];
  link: { href: string; label: string };
  Visual: (props: { progress: MotionValue<number> }) => React.ReactNode;
};

/** A motion value as text, written straight to the DOM so React never re-renders per frame. */
function LiveText({ value, format }: { value: MotionValue<number>; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useMotionValueEvent(value, "change", (v) => {
    if (ref.current) ref.current.textContent = format(v);
  });
  return <span ref={ref}>{format(value.get())}</span>;
}

const asTime = (v: number) => formatMs(Math.round(v));

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-xl shadow-primary/5",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── 1. Timer and stats ──────────────────────────────────────────────────────

const TREND = [15.8, 15.1, 15.6, 14.7, 14.9, 14.2, 14.5, 13.8, 13.9, 13.4];

function TimerVisual({ progress }: { progress: MotionValue<number> }) {
  const time = useTransform(progress, [0, 0.4], [0, 13420], { clamp: true });
  const ao5 = useTransform(progress, [0.4, 0.65], [0, 13870], { clamp: true });
  const ao12 = useTransform(progress, [0.45, 0.7], [0, 14310], { clamp: true });
  const draw = useTransform(progress, [0.55, 0.95], [0, 1], { clamp: true });
  const statsIn = useTransform(progress, [0.35, 0.5], [0, 1], { clamp: true });
  const max = Math.max(...TREND);
  const min = Math.min(...TREND);
  const d = TREND.map((t, i) => `${i === 0 ? "M" : "L"}${(i / (TREND.length - 1)) * 300},${10 + ((t - min) / (max - min)) * 70}`).join(" ");

  return (
    <Frame>
      <p className="text-center font-mono text-xs tracking-widest text-muted-foreground">R U R&apos; U&apos; F2 D L2 B&apos; U2</p>
      <p className="mt-4 text-center font-mono text-6xl font-bold tabular-nums text-foreground">
        <LiveText value={time} format={asTime} />
      </p>
      <motion.div style={{ opacity: statsIn }} className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">Ao5</p>
          <p className="font-mono text-xl font-semibold tabular-nums text-foreground">
            <LiveText value={ao5} format={asTime} />
          </p>
        </div>
        <div className="rounded-xl bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">Ao12</p>
          <p className="font-mono text-xl font-semibold tabular-nums text-foreground">
            <LiveText value={ao12} format={asTime} />
          </p>
        </div>
      </motion.div>
      <svg viewBox="0 0 300 90" className="mt-5 w-full">
        <motion.path d={d} fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="stroke-chart-1" style={{ pathLength: draw }} />
      </svg>
    </Frame>
  );
}

// ── 2. Learn ────────────────────────────────────────────────────────────────

/** A PLL's top face, as the case pages draw it: all yellow, with the T perm's swap arrows. */
const T_PERM_TOP = ["U", "U", "U", "U", "U", "U", "U", "U", "U"];

function LearnVisual({ progress }: { progress: MotionValue<number> }) {
  const name = "T Perm";
  const typed = useTransform(progress, [0.05, 0.4], [0, name.length], { clamp: true });
  const arrows = useTransform(progress, [0.35, 0.75], [0, 1], { clamp: true });
  const alg = useTransform(progress, [0.6, 0.85], [0, 1], { clamp: true });
  const cell = (i: number) => ({ x: 20 + (i % 3) * 60, y: 20 + Math.floor(i / 3) * 60 });

  return (
    <Frame>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">PLL · 3x3</p>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">21 cases</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-foreground">
        <LiveText value={typed} format={(v) => name.slice(0, Math.round(v)) || "\u00a0"} />
      </p>
      <svg viewBox="10 10 200 200" className="mx-auto mt-4 w-44">
        {T_PERM_TOP.map((_, i) => {
          const { x, y } = cell(i);
          return <rect key={i} x={x} y={y} width={56} height={56} rx={6} className="fill-sticker-u stroke-sticker-outline" strokeWidth={2} />;
        })}
        <motion.g style={{ opacity: arrows }} className="stroke-foreground" strokeWidth={5} strokeLinecap="round" fill="none">
          {/* T perm: the left and right edges swap, and the two right corners. */}
          <path d="M48 108 L172 108" />
          <path d="M60 98 L46 108 L60 118 M160 98 L174 108 L160 118" />
          <path d="M168 48 L168 172" />
          <path d="M158 160 L168 174 L178 160 M158 60 L168 46 L178 60" />
        </motion.g>
      </svg>
      <motion.p style={{ opacity: alg }} className="mt-4 rounded-xl bg-muted/50 px-3 py-2 text-center font-mono text-sm text-foreground">
        R U R&apos; U&apos; R&apos; F R2 U&apos; R&apos; U&apos; R U R&apos; F&apos;
      </motion.p>
    </Frame>
  );
}

// ── 3. Drill Lab ────────────────────────────────────────────────────────────

function DrillVisual({ progress }: { progress: MotionValue<number> }) {
  const slow = useTransform(progress, [0.1, 0.8], ["0%", "100%"], { clamp: true });
  const fast = useTransform(progress, [0.1, 0.65], ["0%", "100%"], { clamp: true });
  const badge = useTransform(progress, [0.75, 0.85], [0, 1], { clamp: true });
  const lanes = [
    { label: "Ua · R2 U R U R' U' R' U' R' U R'", time: "1.84", fill: slow, main: false },
    { label: "Ua · M2 U M U2 M' U M2", time: "1.42", fill: fast, main: true },
  ];
  return (
    <Frame>
      <p className="text-xs font-medium text-muted-foreground">Ua perm · 20 reps each</p>
      <div className="mt-4 flex flex-col gap-4">
        {lanes.map((l) => (
          <div key={l.label}>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-mono text-xs text-foreground">{l.label}</p>
              {l.main && (
                <motion.span style={{ opacity: badge }} className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  main
                </motion.span>
              )}
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-muted">
              <motion.div style={{ width: l.fill }} className={cn("h-full rounded-full", l.main ? "bg-primary" : "bg-muted-foreground/50")} />
            </div>
            <p className="mt-1 text-right font-mono text-sm font-semibold tabular-nums text-foreground">{l.time}s median</p>
          </div>
        ))}
      </div>
      <motion.p style={{ opacity: badge }} className="mt-4 rounded-xl bg-primary/10 px-3 py-2 text-sm text-foreground">
        Your M-slice Ua is <span className="font-semibold">0.42 s faster</span>. Switch your main algorithm?
      </motion.p>
    </Frame>
  );
}

// ── 4. Playground ───────────────────────────────────────────────────────────

/**
 * The one live cube on the landing page: cubing.js through
 * lib/cubing/runtime.ts (via ScramblePreview), loaded only once the chapter is
 * near the viewport, so the page never fetches it on load. Draggable on
 * desktop; display-only on touch, so a swipe over it scrolls the page.
 */
function PlaygroundVisual() {
  const moves = ["R", "U", "R'", "F2", "M", "U'"];
  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-xl shadow-primary/5">
      <div aria-hidden className="absolute top-1/2 left-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
      <ScramblePreview
        alg="R U R' U' F' U F R2 U' R' U R U' R' F R F'"
        puzzle="333"
        size={240}
        visualization="3D"
        deferUntilNear
        className="relative flex min-h-[240px] items-center justify-center max-md:pointer-events-none md:cursor-grab md:active:cursor-grabbing"
      />
      <div aria-hidden className="relative mt-4 flex flex-wrap justify-center gap-1.5">
        {moves.map((m) => (
          <span key={m} className="rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-sm text-foreground">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── 5. Profiles and clubs ───────────────────────────────────────────────────

function ProfileVisual({ progress }: { progress: MotionValue<number> }) {
  const flip = useTransform(progress, [0.25, 0.55], [0, 180], { clamp: true });
  const back = useTransform(flip, (v) => v - 180);
  const posts = useTransform(progress, [0.6, 0.95], [40, 0], { clamp: true });
  const postsIn = useTransform(progress, [0.6, 0.8], [0, 1], { clamp: true });
  return (
    <div aria-hidden className="mx-auto w-full max-w-md">
      <div className="relative h-56 [perspective:1000px]">
        <motion.div style={{ rotateY: flip }} className="absolute inset-0 rounded-3xl border border-border bg-card p-6 [backface-visibility:hidden]">
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-lg font-bold text-primary">AK</div>
            <div>
              <p className="font-semibold text-foreground">Aarav K.</p>
              <p className="text-xs text-muted-foreground">@aarav_cubes · IIT Palakkad Cubing Club</p>
            </div>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">CFOP · learning full OLL · 4,812 solves</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[62%] rounded-full bg-primary" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">OLL · 36 of 57 learned</p>
        </motion.div>
        <motion.div style={{ rotateY: back }} className="absolute inset-0 rounded-3xl border border-border bg-card p-6 [backface-visibility:hidden]">
          <p className="text-xs font-medium text-muted-foreground">Personal bests · 3x3</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["Single", "8.94"],
              ["Ao5", "11.62"],
              ["Ao12", "12.08"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-muted/50 px-2 py-2 text-center">
                <p className="text-[10px] text-muted-foreground">{k}</p>
                <p className="font-mono text-lg font-semibold tabular-nums text-foreground">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            {["Sub-15", "1,000 solves", "PLL done"].map((b) => (
              <span key={b} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {b}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
      <motion.div style={{ y: posts, opacity: postsIn }} className="mt-4 flex flex-col gap-2">
        {["Meetup in the CS lab, Sunday 5 pm. Bring your cubes.", "New Ao12 PB: 12.08! The M-slice Ua finally clicked."].map((t) => (
          <div key={t} className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground">
            {t}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

const CHAPTERS: Chapter[] = [
  {
    id: "features",
    eyebrow: "Timer and stats",
    icon: BarChart3,
    title: "A timer that disappears when you solve.",
    body: "WCA random-state scrambles, inspection, sessions and every average from Mo3 to Ao100, with the rest of the screen out of the way while the clock runs.",
    points: ["Works the moment the page loads, signed in or not", "Trend, distribution and practice days on the Stats page", "Import from csTimer"],
    link: { href: appHref("/timer"), label: "Open the timer" },
    Visual: TimerVisual,
  },
  {
    id: "learn",
    eyebrow: "Learn",
    icon: GraduationCap,
    title: "Every OLL and PLL, in 3D.",
    body: "Beginner to CFOP for 3x3, Ortega and CLL for 2x2. Each case shows on a cube you can play, with several algorithms to choose from.",
    points: ["Mark cases learned and track each set", "Recognition diagrams for every case", "Free, no account needed"],
    link: { href: appHref("/learn"), label: "Explore Learn" },
    Visual: LearnVisual,
  },
  {
    id: "drill-lab",
    eyebrow: "Drill Lab",
    icon: Target,
    title: "Find out which alg is actually faster for your hands.",
    body: "Drill your cases with spaced repetition, time recognition and execution apart, and race algorithm variants against each other. The Drill Lab tells you when an alternative beats your main one.",
    points: ["Weakest cases first", "Recognition and execution timed separately", "Switch suggestions from your own times"],
    link: { href: appHref("/learn/333/drill"), label: "Open the Drill Lab" },
    Visual: DrillVisual,
  },
  {
    id: "playground",
    eyebrow: "Playground",
    icon: Box,
    title: "A cube you can turn right here.",
    body: "Drag to turn, or type moves in notation. Try an algorithm before you learn it, or show a friend what a sexy move does.",
    points: ["Swipe to turn on phones", "Notation input with undo", "No cube to hand needed"],
    link: { href: appHref("/playground"), label: "Open the Playground" },
    Visual: PlaygroundVisual,
  },
  {
    id: "profiles",
    eyebrow: "Profiles and clubs",
    icon: Users,
    title: "Your PBs, your progress, your college club.",
    body: "A public profile with your bests, badges and what you're learning. Follow friends, compare head to head, and start or join your college's cubing club.",
    points: ["PB timeline and achievements", "Clubs with posts, algorithms and videos", "Private profiles when you want them"],
    link: { href: appHref("/clubs"), label: "Find your club" },
    Visual: ProfileVisual,
  },
];

export function FeatureChapters() {
  return (
    <div className="flex flex-col">
      {CHAPTERS.map((c, i) => (
        <PinnedChapter key={c.id} id={c.id} reverse={i % 2 === 1} visual={(progress) => <c.Visual progress={progress} />}>
          <div className="flex flex-col items-start gap-4">
            <Eyebrow icon={c.icon}>{c.eyebrow}</Eyebrow>
            <h2 className="max-w-xl text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl">
              {c.title}
            </h2>
            <p className="max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">{c.body}</p>
            <ul className="flex flex-col gap-2 text-sm text-foreground">
              {c.points.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
            <Link href={c.link.href} className="mt-2 inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
              {c.link.label}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </PinnedChapter>
      ))}
    </div>
  );
}

const FINISHED = motionValue(1);

export type ChapterId = "timer" | "learn" | "drill-lab" | "playground" | "profiles";

const VISUALS: Record<ChapterId, Chapter["Visual"]> = {
  timer: TimerVisual,
  learn: LearnVisual,
  "drill-lab": DrillVisual,
  playground: PlaygroundVisual,
  profiles: ProfileVisual,
};

/** A chapter's visual in its finished state, for the feature pages. */
export function ChapterVisual({ id }: { id: ChapterId }) {
  const Visual = VISUALS[id];
  return <Visual progress={FINISHED} />;
}
