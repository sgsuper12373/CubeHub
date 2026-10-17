"use client";

import { useEffect, useRef } from "react";

/**
 * ← and → step to the previous and next case. Ignored while typing, with a
 * modifier held (Alt+← is the browser's Back), or inside widgets that use the
 * arrow keys themselves. Listens in the capture phase: the side panel's dialog
 * stops keydown from bubbling out of it.
 */
export function useCaseKeys(onPrev: (() => void) | null, onNext: (() => void) | null) {
  // Kept in a ref so the listener isn't re-attached on every render.
  const handlers = useRef({ onPrev, onNext });
  useEffect(() => {
    handlers.current = { onPrev, onNext };
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable='true'], [role='slider'], [role='listbox'], [role='menu'], [role='tablist']",
        )
      ) {
        return;
      }
      const handler =
        e.key === "ArrowLeft"
          ? handlers.current.onPrev
          : e.key === "ArrowRight"
            ? handlers.current.onNext
            : null;
      if (!handler) return;
      e.preventDefault();
      handler();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
