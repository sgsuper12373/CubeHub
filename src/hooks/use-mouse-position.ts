"use client";

import { useState, useEffect, RefObject } from "react";

/**
 * Tracks mouse position relative to a specific element.
 * Useful for hover-tracking radial gradient spotlights.
 */
export function useMousePosition(ref: RefObject<HTMLElement | null>) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const element = ref.current;
    if (element) {
      element.addEventListener("mousemove", handleMouseMove);
      return () => {
        element.removeEventListener("mousemove", handleMouseMove);
      };
    }
  }, [ref]);

  return mousePosition;
}
