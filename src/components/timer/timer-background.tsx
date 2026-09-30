"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

import { imageStyle } from "@/lib/timer-background/options";
import { timerNeedsScrim } from "@/lib/timer-background/scrim";
import { observeTheme, readTokenRgb } from "@/lib/token-color";
import { useTimerBackgroundStore } from "@/stores/timer-background-store";
import type { Rgba } from "@/themes/color";

/**
 * The user's background image behind the /timer page. A fixed layer at
 * -z-10: the timer screen root is `isolate`, so it stays above the page
 * canvas but below every control. Renders nothing until an image is set.
 */
export function TimerBackground() {
  const url = useTimerBackgroundStore((s) => s.url);
  const options = useTimerBackgroundStore((s) => s.options);

  useEffect(() => {
    void useTimerBackgroundStore.getState().init();
  }, []);

  if (!url) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* A local blob: URL, which next/image can't optimise. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="size-full" style={imageStyle(options)} />
    </div>
  );
}

const TIMER_INKS = ["timer-digits", "timer-holding", "timer-running", "timer-ready", "timer-hold"];

const toRgba = ([r, g, b]: readonly number[]): Rgba => ({ r: r / 255, g: g / 255, b: b / 255, a: 1 });

function themeSnapshot(): string {
  const root = document.documentElement;
  return `${root.dataset.theme ?? ""}|${root.classList.contains("dark")}`;
}

/**
 * True when the background image leaves any timer colour below 3:1, so the
 * digits should sit on `--timer-scrim`. Re-evaluated when the image, its
 * options or the theme change.
 */
export function useTimerScrim(): boolean {
  const url = useTimerBackgroundStore((s) => s.url);
  const range = useTimerBackgroundStore((s) => s.range);
  const opacity = useTimerBackgroundStore((s) => s.options.opacity);
  const brightness = useTimerBackgroundStore((s) => s.options.brightness);
  const theme = useSyncExternalStore(observeTheme, themeSnapshot, () => "");

  return useMemo(() => {
    if (!url || !range || !theme) return false;
    return timerNeedsScrim({
      inks: TIMER_INKS.map((t) => toRgba(readTokenRgb(t))),
      canvas: toRgba(readTokenRgb("background")),
      range,
      opacity,
      brightness,
    });
  }, [url, range, opacity, brightness, theme]);
}
