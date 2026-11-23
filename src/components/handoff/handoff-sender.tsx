"use client";

import { useEffect, useState } from "react";

import {
  collectHandoffItems,
  HANDOFF_COOKIE,
  HANDOFF_COOKIE_MAX_AGE,
  HANDOFF_TIMEOUT_MS,
  isHandoffMessage,
  safeNextPath,
  type HandoffMessage,
} from "@/lib/handoff";
import { loadBackground } from "@/lib/timer-background/storage";
import { APP_URL, COOKIE_DOMAIN } from "@/lib/site-url";

function markDone() {
  const domain = COOKIE_DOMAIN ? `; domain=${COOKIE_DOMAIN}` : "";
  document.cookie = `${HANDOFF_COOKIE}=1; path=/; max-age=${HANDOFF_COOKIE_MAX_AGE}; SameSite=Lax${domain}`;
}

/** Where the visitor was going: the rewritten path itself, or ?next= on a direct visit. */
function nextPath(): string {
  const { pathname, search } = window.location;
  if (pathname !== "/handoff") return safeNextPath(pathname + search);
  return safeNextPath(new URLSearchParams(search).get("next"));
}

/**
 * Copies this origin's `cubehub` data into the app host, then sends the
 * visitor there. Never deletes anything here: if the copy times out the old
 * data stays put and the next visit tries again (no cookie is set).
 */
export function HandoffSender() {
  const [status, setStatus] = useState("Opening the app…");

  useEffect(() => {
    let finished = false;
    let iframe: HTMLIFrameElement | null = null;
    const appOrigin = new URL(APP_URL).origin;
    const target = `${APP_URL}${nextPath()}`;

    const go = (done: boolean) => {
      if (finished) return;
      finished = true;
      if (done) markDone();
      window.location.replace(target);
    };

    let items: Record<string, string> = {};
    try {
      items = collectHandoffItems(window.localStorage);
    } catch {
      // Storage blocked: nothing we can move.
    }

    let onMessage: ((event: MessageEvent) => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    void loadBackground().then((background) => {
      if (finished) return;
      if (Object.keys(items).length === 0 && !background) {
        go(true);
        return;
      }

      setStatus("Moving your solves and settings to the app…");
      onMessage = (event: MessageEvent) => {
        if (event.origin !== appOrigin || !isHandoffMessage(event.data)) return;
        if (event.data.type === "cubehub-handoff:ready") {
          const message: HandoffMessage = { type: "cubehub-handoff:data", items, background };
          iframe?.contentWindow?.postMessage(message, appOrigin);
        } else if (event.data.type === "cubehub-handoff:done") {
          go(true);
        }
      };
      window.addEventListener("message", onMessage);

      iframe = document.createElement("iframe");
      iframe.src = `${APP_URL}/handoff/receive`;
      iframe.title = "Handoff";
      iframe.hidden = true;
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);

      timer = setTimeout(() => go(false), HANDOFF_TIMEOUT_MS);
    });

    return () => {
      if (onMessage) window.removeEventListener("message", onMessage);
      if (timer) clearTimeout(timer);
      iframe?.remove();
    };
  }, []);

  return (
    <p className="text-sm text-muted-foreground" role="status">
      {status}
    </p>
  );
}
