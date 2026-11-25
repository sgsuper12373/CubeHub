"use client";

import { useEffect } from "react";

const REFRESH_KEY = "cubehub.sw.refreshedAt";
const DAY_MS = 24 * 60 * 60_000;

/**
 * Registers public/sw.js (offline timer, docs/pwa.md) in production builds
 * only: in `next dev` a worker would serve stale build files. Once a day,
 * while online, it asks the worker to re-cache the guest timer so the
 * offline copy follows deploys. Renders nothing.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async (reg) => {
        const last = Number(localStorage.getItem(REFRESH_KEY) ?? 0);
        if (!navigator.onLine || Date.now() - last < DAY_MS) return;
        const worker = reg.active ?? (await navigator.serviceWorker.ready).active;
        worker?.postMessage("refresh-shell");
        localStorage.setItem(REFRESH_KEY, String(Date.now()));
      })
      .catch(() => undefined);
  }, []);
  return null;
}
