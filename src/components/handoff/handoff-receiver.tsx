"use client";

import { useEffect } from "react";

import { applyHandoffItems, isHandoffMessage, type HandoffMessage } from "@/lib/handoff";
import { loadBackground, saveBackground, type StoredBackground } from "@/lib/timer-background/storage";
import { SITE_URL } from "@/lib/site-url";

function isStoredBackground(v: unknown): v is StoredBackground {
  if (typeof v !== "object" || v === null) return false;
  const b = v as Partial<StoredBackground>;
  return (
    b.blob instanceof Blob &&
    typeof b.width === "number" &&
    typeof b.height === "number" &&
    typeof b.savedAt === "number" &&
    typeof b.range === "object" &&
    b.range !== null
  );
}

/**
 * The app host's half of the handoff. Accepts data only from the root host's
 * origin, writes only what this origin doesn't already have, then answers.
 */
export function HandoffReceiver() {
  useEffect(() => {
    const siteOrigin = new URL(SITE_URL).origin;
    // Only ever framed by the root host; opened any other way it does nothing.
    if (window.parent === window) return;

    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== siteOrigin || event.source !== window.parent) return;
      if (!isHandoffMessage(event.data) || event.data.type !== "cubehub-handoff:data") return;

      let written = 0;
      try {
        written = applyHandoffItems(window.localStorage, event.data.items).length;
      } catch {
        // Storage blocked: report what we managed.
      }
      const background = event.data.background;
      if (isStoredBackground(background) && !(await loadBackground())) {
        try {
          await saveBackground(background);
          written += 1;
        } catch {
          // Quota: the solves matter more than the picture.
        }
      }
      const done: HandoffMessage = { type: "cubehub-handoff:done", written };
      window.parent.postMessage(done, siteOrigin);
    };

    window.addEventListener("message", onMessage);
    const ready: HandoffMessage = { type: "cubehub-handoff:ready" };
    window.parent.postMessage(ready, siteOrigin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return null;
}
