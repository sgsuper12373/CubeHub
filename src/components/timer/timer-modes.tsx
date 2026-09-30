"use client";

import { Monitor, Expand, EyeOff, Trophy, Settings2, Focus } from "lucide-react";
import { useEffect, useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLayoutStore } from "@/stores/layout-store";
import { useTimerStore } from "@/stores/timer-store";
import { saveSettings } from "@/lib/timer/settings-persistence";
import { cn } from "@/lib/utils";
import type { TimerSettings } from "@/lib/timer/types";

export function TimerModes({ isAuthed }: { isAuthed?: boolean }) {
  const isZenMode = useLayoutStore((s) => s.isZenMode);
  const setZenMode = useLayoutStore((s) => s.setZenMode);
  const isFocusMode = useLayoutStore((s) => s.isFocusMode);
  const setFocusMode = useLayoutStore((s) => s.setFocusMode);
  const settings = useTimerStore((s) => s.settings);
  const applySettings = useTimerStore((s) => s.applySettings);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const handleSettingsChange = (partial: Partial<TimerSettings>) => {
    applySettings(partial);
    saveSettings(partial, isAuthed ?? false);
  };

  return (
    <Popover>
      <PopoverTrigger
        className="flex items-center gap-1.5 h-7 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 hover:bg-muted transition-colors"
      >
        <Settings2 className="size-3.5" />
        Modes
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Timer Modes</h3>
        </div>
        
        <div className="flex flex-col gap-1">
          <ModeToggle
            icon={Expand}
            label="Zen Mode"
            active={isZenMode}
            onToggle={(v) => setZenMode(v)}
          />
          <ModeToggle
            icon={Focus}
            label="Focus Mode"
            hint="Hide everything but the timer while solving"
            active={isFocusMode}
            onToggle={(v) => setFocusMode(v)}
          />
          <ModeToggle
            icon={Monitor}
            label="Full Screen Mode"
            active={isFullscreen}
            onToggle={(v) => {
              if (v) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
          />
          <ModeToggle
            icon={EyeOff}
            label="Blind Mode"
            active={settings.hideTimeWhileSolving}
            onToggle={(v) => handleSettingsChange({ hideTimeWhileSolving: v })}
          />
          <ModeToggle
            icon={Trophy}
            label="WCA / Competition Mode"
            active={settings.inspectionMode === "15s"}
            onToggle={(v) => handleSettingsChange({ inspectionMode: v ? "15s" : "off" })}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ModeToggle({
  icon: Icon,
  label,
  hint,
  active,
  onToggle,
}: {
  icon: React.ElementType;
  label: string;
  /** Optional one-line explanation, shown as a tooltip. */
  hint?: string;
  active: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!active)}
      title={hint}
      className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
    >
      <div className="flex items-center gap-2.5">
        <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
        <span className="font-medium">{label}</span>
      </div>
      <div
        role="switch"
        aria-checked={active}
        className={cn(
          "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
          active ? "bg-primary" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "pointer-events-none block size-3 rounded-full bg-white shadow-sm transition-transform",
            active ? "translate-x-[14px]" : "translate-x-[2px]",
          )}
        />
      </div>
    </button>
  );
}
