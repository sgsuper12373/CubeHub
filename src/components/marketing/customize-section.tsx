"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  EyeOff,
  LayoutGrid,
  Maximize,
  Mic,
  SlidersHorizontal,
  Type,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { SectionHeading } from "@/components/marketing/section-heading";
import { formatMs } from "@/lib/timer/format";
import { loadClientSettings, saveClientSettings } from "@/lib/timer/settings-persistence";
import {
  getThemeServerSnapshot,
  getThemeSnapshot,
  setTheme,
  subscribeTheme,
  type ThemePreference,
} from "@/lib/theme";
import { cn } from "@/lib/utils";
import { THEMES } from "@/themes";

/**
 * "Make it yours": a few real settings, changed right on the landing page.
 *
 * Nothing here is a mock. Theme goes through `setTheme` (the cookie every page
 * renders from), and precision, hold time and preview style are the timer's
 * own client-only settings in localStorage — the same keys /timer reads on
 * mount — so a visitor who tunes them here finds the timer already set up.
 * DB-backed settings (inspection, hide time…) need an account, so they are
 * listed, not editable.
 */

type ClientSettings = ReturnType<typeof loadClientSettings>;

// localStorage as an external store, so the first render matches the server
// (defaults) and the saved values arrive without a setState-in-effect.
const settingsListeners = new Set<() => void>();
const subscribeSettings = (cb: () => void) => {
  settingsListeners.add(cb);
  return () => {
    settingsListeners.delete(cb);
  };
};
const settingsSnapshot = () => JSON.stringify(loadClientSettings());
const SERVER_SETTINGS = JSON.stringify({ holdMs: 300, precision: 2, voiceEnabled: true, previewDimension: "2D" });

function useClientSettings(): [ClientSettings, (patch: Partial<ClientSettings>) => void] {
  const raw = useSyncExternalStore(subscribeSettings, settingsSnapshot, () => SERVER_SETTINGS);
  const settings = useMemo(() => JSON.parse(raw) as ClientSettings, [raw]);
  const update = useCallback((patch: Partial<ClientSettings>) => {
    saveClientSettings(patch);
    for (const l of settingsListeners) l();
  }, []);
  return [settings, update];
}

const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  ...THEMES.map((t) => ({
    value: t.id as ThemePreference,
    label: t.name,
    hint: t.mode === "dark" ? "Deep slate, mint accent" : "Warm paper, terracotta",
  })),
  { value: "system", label: "System", hint: "Follows your device" },
];

const MORE = [
  { icon: Mic, label: "15s inspection with voice callouts" },
  { icon: EyeOff, label: "Hide time while solving" },
  { icon: Type, label: "Timer size" },
  { icon: LayoutGrid, label: "Drag-and-drop panel layout" },
  { icon: Maximize, label: "Zen, full-screen and blind modes" },
  { icon: Upload, label: "Import from csTimer" },
] as const;

export function CustomizeSection() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  const [settings, update] = useClientSettings();
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  const flashSaved = () => {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1800);
  };

  const change = (patch: Partial<ClientSettings>) => {
    update(patch);
    flashSaved();
  };

  return (
    <section
      id="customize"
      className="relative scroll-mt-20 overflow-hidden border-y border-border/60 bg-card/40"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-10 size-[30rem] rounded-full bg-accent-2/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
        <SectionHeading
          eyebrow="Make it yours"
          icon={SlidersHorizontal}
          title="A timer that fits your hands, not ours"
          lead="Change these now — they're the real settings, saved on this device, and the timer opens already set up the way you like it."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Controls */}
          <div className="reveal flex flex-col divide-y divide-border/70 rounded-3xl border border-border bg-card">
            <Row label="Theme" description="Applies to every page, instantly.">
              <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={theme === opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      "flex flex-col gap-2 rounded-xl border p-2 text-left transition-colors",
                      theme === opt.value
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-foreground-subtle",
                    )}
                  >
                    <ThemeSwatch value={opt.value} />
                    <span className="flex items-center justify-between px-0.5 text-xs font-semibold text-foreground">
                      {opt.label}
                      {theme === opt.value && <Check className="size-3.5 text-primary" aria-hidden />}
                    </span>
                  </button>
                ))}
              </div>
            </Row>

            <Row label="Time precision" description="Hundredths, or thousandths for the stats nerds.">
              <Segmented
                label="Time precision"
                value={String(settings.precision)}
                options={[
                  { value: "2", label: ".XX" },
                  { value: "3", label: ".XXX" },
                ]}
                onChange={(v) => change({ precision: v === "3" ? 3 : 2 })}
              />
            </Row>

            <Row
              label="Hold to start"
              description="How long you hold before the timer arms. Shorter feels snappier; longer prevents false starts."
            >
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={150}
                  max={550}
                  step={50}
                  value={settings.holdMs}
                  aria-label="Hold duration"
                  onChange={(e) => change({ holdMs: Number(e.target.value) })}
                  className="h-1.5 w-full cursor-pointer accent-primary"
                />
                <span className="w-14 shrink-0 text-right font-mono text-sm text-foreground tabular-nums">
                  {settings.holdMs}ms
                </span>
              </div>
            </Row>

            <Row label="Scramble preview" description="A flat net, or a 3D cube you can spin.">
              <Segmented
                label="Scramble preview"
                value={settings.previewDimension}
                options={[
                  { value: "2D", label: "2D net" },
                  { value: "3D", label: "3D cube" },
                ]}
                onChange={(v) => change({ previewDimension: v === "3D" ? "3D" : "2D" })}
              />
            </Row>
          </div>

          {/* Live preview */}
          <div className="reveal flex flex-col gap-4">
            <div className="relative flex flex-col overflow-hidden rounded-3xl border border-border bg-background p-5 shadow-xl shadow-primary/5">
              <div className="flex items-center justify-between font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
                <span>Preview</span>
                <span
                  aria-live="polite"
                  className={cn(
                    "flex items-center gap-1 text-success transition-opacity duration-200",
                    saved ? "opacity-100" : "opacity-0",
                  )}
                >
                  <Check className="size-3.5" aria-hidden />
                  Saved on this device
                </span>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <CubeGlyph dimension={settings.previewDimension} className="size-20 shrink-0" />
                <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                  R2 D&apos; B2 U F2 D2 R2 U&apos; L2 F2 U&apos; B&apos; L&apos; D2 F&apos; R U&apos; F2 L&apos; B&apos;
                </p>
              </div>

              <p className="mt-4 text-center font-timer text-6xl font-bold text-timer-digits sm:text-7xl">
                {formatMs(9_423, settings.precision)}
              </p>

              <HoldTester holdMs={settings.holdMs} />
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-foreground">And in the timer&apos;s quick settings</p>
              <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                {MORE.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2">
                    <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
              <Link
                href="/timer"
                className="group mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                Open the timer
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 p-5 sm:p-6">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

/** Same selected style as the timer's quick settings: primary fill. */
function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex w-fit rounded-lg border border-border bg-secondary p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors",
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A miniature of a theme, painted with that theme's own tokens: the theme
 * selectors are plain `[data-theme="…"]`, so setting the attribute on this
 * element scopes the whole palette to it.
 */
function ThemeSwatch({ value }: { value: ThemePreference }) {
  if (value === "system") {
    const [dark, light] = [THEMES.find((t) => t.mode === "dark"), THEMES.find((t) => t.mode === "light")];
    return (
      <span aria-hidden className="grid h-12 grid-cols-2 overflow-hidden rounded-lg border border-border">
        <SwatchBody themeId={dark?.id} />
        <SwatchBody themeId={light?.id} />
      </span>
    );
  }
  return (
    <span aria-hidden className="block h-12 overflow-hidden rounded-lg border border-border">
      <SwatchBody themeId={value} />
    </span>
  );
}

function SwatchBody({ themeId }: { themeId?: string }) {
  return (
    <span data-theme={themeId} className="flex size-full flex-col justify-between bg-background p-1.5">
      <span className="h-1.5 w-2/3 rounded-full bg-foreground/70" />
      <span className="flex items-end gap-1">
        <span className="h-3 flex-1 rounded bg-card ring-1 ring-border" />
        <span className="size-3 rounded-full bg-primary" />
      </span>
    </span>
  );
}

/** The cube preview style, drawn with the sticker tokens. */
function CubeGlyph({ dimension, className }: { dimension: "2D" | "3D"; className?: string }) {
  if (dimension === "3D") {
    // Isometric cube from its front-top-right corner: U on top, F on the
    // left, R on the right.
    return (
      <svg viewBox="0 0 100 100" className={className} aria-label="3D cube preview" role="img">
        <IsoFace origin={[50, 50]} u={[-13, -7.5]} v={[13, -7.5]} fill="var(--sticker-u)" />
        <IsoFace origin={[50, 50]} u={[-13, -7.5]} v={[0, 15]} fill="var(--sticker-f)" />
        <IsoFace origin={[50, 50]} u={[13, -7.5]} v={[0, 15]} fill="var(--sticker-r)" />
      </svg>
    );
  }
  // Unfolded net: U above F, with L, F, R, B in a row.
  const faces: [number, number, string][] = [
    [1, 0, "var(--sticker-u)"],
    [0, 1, "var(--sticker-l)"],
    [1, 1, "var(--sticker-f)"],
    [2, 1, "var(--sticker-r)"],
    [3, 1, "var(--sticker-b)"],
    [1, 2, "var(--sticker-d)"],
  ];
  const s = 7.5;
  return (
    <svg viewBox="0 0 92 70" className={className} aria-label="2D net preview" role="img">
      {faces.map(([fx, fy, fill]) =>
        Array.from({ length: 9 }, (_, i) => (
          <rect
            key={`${fx}${fy}${i}`}
            x={1 + fx * 23 + (i % 3) * s}
            y={1 + fy * 23 + Math.floor(i / 3) * s}
            width={s - 1}
            height={s - 1}
            rx={1}
            fill={fill}
            stroke="var(--sticker-outline)"
            strokeWidth={0.6}
          />
        )),
      )}
    </svg>
  );
}

/** One face of the isometric cube: a 3×3 grid spanned by vectors u and v. */
function IsoFace({
  origin: [ox, oy],
  u: [ux, uy],
  v: [vx, vy],
  fill,
}: {
  origin: [number, number];
  u: [number, number];
  v: [number, number];
  fill: string;
}) {
  const cells = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const p = (a: number, b: number) => `${ox + ux * a + vx * b},${oy + uy * a + vy * b}`;
      const g = 0.06; // gap between stickers
      cells.push(
        <polygon
          key={`${i}${j}`}
          points={[p(i + g, j + g), p(i + 1 - g, j + g), p(i + 1 - g, j + 1 - g), p(i + g, j + 1 - g)].join(" ")}
          fill={fill}
          stroke="var(--sticker-outline)"
          strokeWidth={0.8}
          strokeLinejoin="round"
        />,
      );
    }
  }
  return <g>{cells}</g>;
}

/**
 * Press and hold to feel the chosen hold time: the bar fills over `holdMs`
 * and turns the ready colour when the timer would arm. A small, explicit
 * button — the only thing in this section that reacts to a hold.
 */
function HoldTester({ holdMs }: { holdMs: number }) {
  const [state, setStateRaw] = useState<"rest" | "holding" | "ready" | "go">("rest");
  const stateRef = useRef(state);
  const setState = (next: typeof state) => {
    stateRef.current = next;
    setStateRaw(next);
  };
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (armTimer.current) clearTimeout(armTimer.current);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    armTimer.current = resetTimer.current = null;
  };
  useEffect(() => clear, []);

  const down = () => {
    clear();
    setState("holding");
    armTimer.current = setTimeout(() => setState("ready"), holdMs);
  };
  const up = () => {
    if (armTimer.current) clearTimeout(armTimer.current);
    armTimer.current = null;
    if (stateRef.current !== "ready") {
      setState("rest");
      return;
    }
    setState("go");
    resetTimer.current = setTimeout(() => setState("rest"), 900);
  };

  const label = {
    rest: "Press and hold to feel it",
    holding: "Keep holding…",
    ready: "Ready — let go",
    go: "Go!",
  }[state];

  return (
    <button
      type="button"
      className={cn(
        "relative mt-5 h-11 touch-none overflow-hidden rounded-full border text-sm font-semibold select-none transition-colors",
        state === "ready" || state === "go"
          ? "border-timer-ready text-timer-ready"
          : state === "holding"
            ? "border-timer-holding text-timer-holding"
            : "border-border text-muted-foreground hover:text-foreground",
      )}
      onPointerDown={(e) => {
        if (!e.isPrimary || e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        down();
      }}
      onPointerUp={up}
      onPointerCancel={() => {
        clear();
        setState("rest");
      }}
      onKeyDown={(e) => {
        if (e.repeat || (e.key !== " " && e.key !== "Enter")) return;
        e.preventDefault();
        down();
      }}
      onKeyUp={(e) => {
        if (e.key !== " " && e.key !== "Enter") return;
        e.preventDefault();
        up();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 bg-current opacity-15",
          state === "rest" ? "w-0 transition-none" : "w-full",
        )}
        style={state === "holding" ? { transition: `width ${holdMs}ms linear` } : undefined}
      />
      <span className="relative" aria-live="polite">
        {label}
      </span>
    </button>
  );
}
