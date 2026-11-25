"use client";

import { useEffect } from "react";

import { trackHomeCardClick } from "@/lib/home/analytics";

/**
 * One delegated listener for Home's card clicks (`home_card_click`), so the
 * cards, server and client alike, need no tracking code of their own. Cards
 * are found by their `data-tour="home-<id>"`.
 */
export function HomeAnalytics() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => trackHomeCardClick(e.target instanceof Element ? e.target : null);
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
