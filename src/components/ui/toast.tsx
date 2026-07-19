"use client";

import { AlertTriangle, Trophy, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { type Toast, useToastStore } from "@/stores/toast-store";

/**
 * Auto-dismissing toast renderer. Mounts once at the root layout; renders
 * all active toasts from the store. aria-live="polite" so screen readers
 * announce them without interrupting.
 *
 * Toasts slide up from the bottom-right (desktop) or bottom-center (mobile),
 * above the bottom nav (bottom-20). Never blocks pointer input on the timer.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 pointer-events-none md:items-end md:right-4 md:left-auto md:bottom-4"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => dismiss(t.id), t.durationMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [t.id, t.durationMs, dismiss]);

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm",
        "animate-in slide-in-from-bottom-4 fade-in duration-200",
        t.kind === "pb" && "border-timer-ready/30 bg-timer-ready/10 text-timer-ready",
        t.kind === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
        t.kind !== "pb" &&
          t.kind !== "error" &&
          "border-border bg-card/90 text-foreground",
      )}
    >
      {t.kind === "pb" && <Trophy className="size-4 shrink-0" />}
      {t.kind === "error" && <AlertTriangle className="size-4 shrink-0" />}
      <span className="text-sm font-medium">{t.message}</span>
      {t.action && (
        <button
          type="button"
          className="ml-2 rounded-md px-2.5 py-1 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
          onClick={() => {
            t.action!.onAction();
            dismiss(t.id);
          }}
        >
          {t.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        className="ml-1 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => dismiss(t.id)}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
