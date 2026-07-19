"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * A one-time banner shown after the user's first solve to introduce
 * the keyboard shortcuts (Space, D, 1, 2).
 */
export function ShortcutHint() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true); // default true for SSR

  useEffect(() => {
    const key = "cubehub.shortcutHintSeen";
    const seen = localStorage.getItem(key);
    if (!seen) {
      setDismissed(false);
      // Wait a moment after mount so it doesn't pop immediately while they're looking at the time
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem("cubehub.shortcutHintSeen", "true");
    setTimeout(() => setDismissed(true), 300); // Wait for fade out
  };

  if (dismissed) return null;

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-40 -translate-x-1/2 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-4 rounded-full border border-border bg-card/95 px-4 py-2 text-sm text-foreground shadow-lg backdrop-blur-sm sm:px-6">
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">⌨️</span>
          <span>
            <kbd className="rounded border border-border bg-muted px-1.5 font-mono text-[11px]">Space</kbd> start/stop
          </span>
          <span className="text-muted-foreground">·</span>
          <span>
            <kbd className="rounded border border-border bg-muted px-1.5 font-mono text-[11px]">D</kbd> delete
          </span>
          <span className="text-muted-foreground">·</span>
          <span>
            <kbd className="rounded border border-border bg-muted px-1.5 font-mono text-[11px]">1</kbd> +2
          </span>
          <span className="text-muted-foreground">·</span>
          <span>
            <kbd className="rounded border border-border bg-muted px-1.5 font-mono text-[11px]">2</kbd> DNF
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Dismiss shortcut hint"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
