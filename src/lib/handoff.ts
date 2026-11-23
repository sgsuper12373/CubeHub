/**
 * The one-time guest data handoff from cuberhub.me to app.cuberhub.me
 * (docs/app-shell-plan.md → Guest data handoff).
 *
 * Browser storage is per origin, so a guest who timed on the root host has
 * their solves there and the app host can't read them. For a transition window
 * the root host answers app paths with /handoff, which copies the `cubehub`
 * keys (and the timer background image) into a hidden /handoff/receive iframe
 * on the app host, then sends the visitor on.
 *
 * The iframe works because the two hosts are the same *site*: browsers
 * partition storage only for cross-site frames, so app.cuberhub.me inside
 * cuberhub.me reads and writes its normal first-party storage.
 *
 * Pure helpers only; the pages are src/app/handoff/.
 */

/** After this date the routing rule, both pages and the cookie check can go. */
export const HANDOFF_UNTIL = new Date("2027-03-01T00:00:00+05:30");

/** Set on the parent domain once a browser has been handed off (or had nothing to hand off). */
export const HANDOFF_COOKIE = "cubehub-handoff-done";

/** One year: the window is shorter than that. */
export const HANDOFF_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The receiver's reply and the sender's give up time. */
export const HANDOFF_TIMEOUT_MS = 5000;

export type HandoffMessage =
  | { type: "cubehub-handoff:ready" }
  | { type: "cubehub-handoff:data"; items: Record<string, string>; background: unknown | null }
  | { type: "cubehub-handoff:done"; written: number };

/** localStorage keys that move: everything CuberHub stores (the names keep the old prefix). */
export function isHandoffKey(key: string): boolean {
  return key.startsWith("cubehub-") || key.startsWith("cubehub.");
}

/** Every handoff key and its value. */
export function collectHandoffItems(storage: Storage): Record<string, string> {
  const items: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key === null || !isHandoffKey(key)) continue;
    const value = storage.getItem(key);
    if (value !== null) items[key] = value;
  }
  return items;
}

/**
 * Writes each received key the app origin doesn't already have, so anything
 * the visitor did on the app host wins over the old copy. Returns the keys
 * written. Anything that isn't a handoff key is ignored.
 */
export function applyHandoffItems(storage: Storage, items: unknown): string[] {
  if (typeof items !== "object" || items === null) return [];
  const written: string[] = [];
  for (const [key, value] of Object.entries(items)) {
    if (!isHandoffKey(key) || typeof value !== "string") continue;
    if (storage.getItem(key) !== null) continue;
    try {
      storage.setItem(key, value);
      written.push(key);
    } catch {
      // Quota or blocked storage: skip this key, keep the rest.
    }
  }
  return written;
}

/**
 * Where to send the visitor: a same-origin path only. Anything else (an
 * absolute URL, `//evil.example`, a backslash trick) becomes /home.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/home";
  return next;
}

export function isHandoffMessage(data: unknown): data is HandoffMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as { type?: unknown }).type === "string" &&
    (data as { type: string }).type.startsWith("cubehub-handoff:")
  );
}
