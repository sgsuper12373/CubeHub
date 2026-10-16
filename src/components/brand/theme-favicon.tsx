"use client";

import { useEffect } from "react";
import { applyThemeFavicon } from "@/lib/brand/favicon";

/** True once Next has inserted an icon link we haven't repointed yet. */
const hasStaticIcon = () =>
  [...document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']")].some(
    (link) => !link.href.startsWith("data:"),
  );

/**
 * Keeps the tab icon in sync with the theme. Watches <html data-theme> and the
 * .dark class, so it also catches "system" theme changes and the theme
 * customizer, without coupling to setTheme(). Renders nothing.
 *
 * It also watches <head>: Next streams metadata in after hydration and
 * re-inserts the static <link rel="icon"> on client navigations. Browsers use
 * the last icon link, so a fresh static one would win; repoint it too.
 * Repointing only changes attributes, so it never retriggers this observer.
 */
export function ThemeFavicon() {
  useEffect(() => {
    applyThemeFavicon();
    const root = document.documentElement;
    const themeObserver = new MutationObserver(() => applyThemeFavicon());
    themeObserver.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme", "class", "style"],
    });
    const headObserver = new MutationObserver(() => {
      if (hasStaticIcon()) applyThemeFavicon();
    });
    headObserver.observe(document.head, { childList: true, subtree: true });
    return () => {
      themeObserver.disconnect();
      headObserver.disconnect();
    };
  }, []);
  return null;
}
