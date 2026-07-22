"use client";

import { useEffect, useRef } from "react";

import { formatResult } from "@/lib/timer/format";
import type { Penalty } from "@/lib/timer/types";
import { cn } from "@/lib/utils";
import { isOverlayOpen } from "@/stores/overlay-store";
import { useSessionStore } from "@/stores/session-store";
import { useTimerStore } from "@/stores/timer-store";
import { toast } from "@/stores/toast-store";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

/**
 * The interaction surface: owns both input engines and forwards them to the
 * timer store's press/release, where the transition table lives.
 *
 * Desktop — window-level key events so focus never matters:
 *   Space down = press, Space up = release, Esc = cancel,
 *   and while running *any* key stops (panic-stop muscle memory; the stop
 *   happens on keydown, and the matching keyup is a no-op in `stopped`).
 *
 * Mobile — Pointer Events on the full-bleed stage itself:
 *   pointerdown = press, pointerup/cancel = release, with pointer capture so
 *   a finger dragged off the stage still releases. `touch-action: none`
 *   prevents scroll/zoom during a hold; the store's stop-debounce keeps the
 *   stopping tap from instantly re-arming.
 */
export function TouchStage({
  disabled = false,
  onShowShortcuts,
  children,
}: {
  disabled?: boolean;
  onShowShortcuts?: () => void;
  children: React.ReactNode;
}) {
  const disabledRef = useRef(disabled);
  // The key listener mounts once, so the callback is reached through a ref
  // rather than being closed over.
  const shortcutsRef = useRef(onShowShortcuts);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    shortcutsRef.current = onShowShortcuts;
  }, [onShowShortcuts]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        disabledRef.current ||
        isOverlayOpen() ||
        e.repeat ||
        isEditableTarget(e.target)
      )
        return;
      const store = useTimerStore.getState();

      if (e.key === "Escape") {
        store.cancel();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault(); // page scroll
        store.press(performance.now());
        return;
      }
      if (store.phase === "running") {
        store.stop(performance.now());
        return;
      }

      // Shortcuts: idle/stopped only (csTimer muscle memory)
      if (store.phase === "idle" || store.phase === "stopped") {
        const key = e.key.toLowerCase();

        if (e.key === "?") {
          e.preventDefault();
          shortcutsRef.current?.();
          return;
        }

        if (key === "d") {
          const last = useSessionStore.getState().solves[0];
          if (last) {
            void useSessionStore.getState().deleteSolve(last.id);
            store.clearResult();
            toast({ kind: "info", message: "Solve deleted", durationMs: 2000 });
          }
          return;
        }

        if (key === "1" || key === "2") {
          const last = useSessionStore.getState().solves[0];
          if (!last) return;
          const penaltyType: Exclude<Penalty, "none"> = key === "1" ? "plus2" : "dnf";
          const next: Penalty = last.penalty === penaltyType ? "none" : penaltyType;
          void useSessionStore.getState().setPenalty(last.id, next);
          if (store.phase === "stopped") store.setResultPenalty(next);
          toast({
            kind: "info",
            message: next === "none"
              ? `Penalty removed — ${formatResult(last.timeMs, "none")}`
              : `${next === "plus2" ? "+2" : "DNF"} — ${formatResult(last.timeMs, next)}`,
            durationMs: 2000,
          });
          return;
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (disabledRef.current || isOverlayOpen() || isEditableTarget(e.target))
        return;
      if (e.code === "Space") {
        e.preventDefault();
        useTimerStore.getState().release(performance.now());
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <div
      role="button"
      aria-label="Timer — hold, then release to start; tap to stop"
      className={cn(
        "flex flex-1 cursor-pointer flex-col items-center justify-center",
        "touch-none select-none",
      )}
      onPointerDown={(e) => {
        if (disabled || !e.isPrimary) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        useTimerStore.getState().press(performance.now());
      }}
      onPointerUp={(e) => {
        if (disabled || !e.isPrimary) return;
        useTimerStore.getState().release(performance.now());
      }}
      onPointerCancel={() => {
        if (disabled) return;
        useTimerStore.getState().release(performance.now());
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}
