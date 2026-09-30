"use client";

import { ImageIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { SegmentedControl, SettingRow } from "@/components/timer/quick-settings";
import {
  LIMITS,
  POSITIONS,
  type BackgroundFit,
  type BackgroundOptions,
} from "@/lib/timer-background/options";
import { cn } from "@/lib/utils";
import { useOverlayLock } from "@/stores/overlay-store";
import { useTimerBackgroundStore } from "@/stores/timer-background-store";

/**
 * Timer background popover: pick an image and tune opacity, blur,
 * brightness, fit and position. Everything stays on this device.
 *
 * Like <QuickSettings/>, the parent renders this only between solves.
 */
export function BackgroundSettings() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const url = useTimerBackgroundStore((s) => s.url);
  const options = useTimerBackgroundStore((s) => s.options);
  const busy = useTimerBackgroundStore((s) => s.busy);
  const error = useTimerBackgroundStore((s) => s.error);
  const { setImage, removeImage, setOptions, resetOptions } = useTimerBackgroundStore.getState();

  // Keep Space from starting a solve while the popover has focus.
  useOverlayLock(open);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Timer background"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(open && "text-primary")}
      >
        <ImageIcon className="size-4" />
      </Button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-sm",
            "animate-in fade-in slide-in-from-top-2 duration-150",
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Background</h3>
            <button
              type="button"
              aria-label="Close background settings"
              className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              <X className="size-3.5" />
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ""; // allow picking the same file again
              if (file) void setImage(file);
            }}
          />

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {busy ? "Processing…" : url ? "Replace image" : "Choose image"}
            </Button>
            {url && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void removeImage()}>
                Remove
              </Button>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {error}
            </p>
          )}

          {url && (
            <div className="mt-4 space-y-4">
              <Slider
                label="Opacity"
                value={options.opacity}
                limits={LIMITS.opacity}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(opacity) => setOptions({ opacity })}
              />
              <Slider
                label="Blur"
                value={options.blur}
                limits={LIMITS.blur}
                format={(v) => `${v}px`}
                onChange={(blur) => setOptions({ blur })}
              />
              <Slider
                label="Brightness"
                value={options.brightness}
                limits={LIMITS.brightness}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(brightness) => setOptions({ brightness })}
              />

              <SettingRow label="Fit">
                <SegmentedControl
                  options={[
                    { value: "cover", label: "Fill" },
                    { value: "contain", label: "Fit" },
                  ]}
                  value={options.fit}
                  onChange={(v) => setOptions({ fit: v as BackgroundFit })}
                />
              </SettingRow>

              <SettingRow label="Position">
                <PositionPicker
                  value={options.position}
                  onChange={(position) => setOptions({ position })}
                />
              </SettingRow>

              <button
                type="button"
                className="block w-full text-center text-xs text-muted-foreground transition-colors hover:text-primary"
                onClick={resetOptions}
              >
                Reset adjustments
              </button>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-foreground-subtle">
            Saved on this device only.
          </p>
        </div>
      )}
    </div>
  );
}

function Slider({
  label,
  value,
  limits,
  format,
  onChange,
}: {
  label: string;
  value: number;
  limits: { min: number; max: number; step: number };
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <SettingRow label={label}>
      <div className="flex w-36 items-center gap-2">
        <input
          type="range"
          min={limits.min}
          max={limits.max}
          step={limits.step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          aria-label={label}
        />
        <span className="w-10 text-right font-mono text-xs text-muted-foreground tabular-nums">
          {format(value)}
        </span>
      </div>
    </SettingRow>
  );
}

/** 3×3 grid of anchors; which part of the image stays in view. */
function PositionPicker({
  value,
  onChange,
}: {
  value: BackgroundOptions["position"];
  onChange: (value: BackgroundOptions["position"]) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Image position" className="grid grid-cols-3 gap-1 rounded-lg border border-border p-1">
      {POSITIONS.map((pos) => (
        <button
          key={pos}
          type="button"
          role="radio"
          aria-checked={value === pos}
          aria-label={pos === "center center" ? "center" : pos}
          title={pos === "center center" ? "center" : pos}
          onClick={() => onChange(pos)}
          className={cn(
            "size-4 rounded-sm transition-colors",
            value === pos ? "bg-primary" : "bg-muted hover:bg-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}
