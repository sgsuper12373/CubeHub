"use client";

import { useEffect, useRef, useState } from "react";

/**
 * True once the element comes within `margin` of the viewport, and from then
 * on. For holding back below-the-fold work (a lazy chunk, a WebGL view) until
 * a visitor scrolls towards it. False on the server and while hydrating.
 */
export function useNearViewport<T extends Element>(margin = "800px"): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: `${margin} 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, margin]);

  return [ref, near];
}
