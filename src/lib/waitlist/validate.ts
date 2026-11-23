/**
 * The roadmap waitlist's input rules (docs/landing-plan.md → Roadmap and
 * sign-up). Pure, so they're unit-tested; the server action is actions.ts.
 */

export const WAITLIST_SOURCES = ["landing-roadmap", "landing-hero", "roadmap-page"] as const;
export type WaitlistSource = (typeof WAITLIST_SOURCES)[number];

const MAX_EMAIL = 254;
// Deliberately loose: something@something.tld, no spaces. The real check is the email we send.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** A normalised email (trimmed, lower-case), or null when it can't be one. */
export function normaliseEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > MAX_EMAIL || !EMAIL.test(email)) return null;
  return email;
}

export function normaliseSource(raw: unknown): WaitlistSource {
  return (WAITLIST_SOURCES as readonly unknown[]).includes(raw) ? (raw as WaitlistSource) : "landing-roadmap";
}

/**
 * A per-key fixed-window counter: `limit` hits per `windowMs`. In memory, so
 * per server instance; enough to stop one browser hammering the form, which
 * is all the plan asks for now.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return function allow(key: string, now = Date.now()): boolean {
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      // Keep the map from growing without bound on a long-lived instance.
      if (hits.size > 10_000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }
      return true;
    }
    if (entry.count >= limit) return false;
    entry.count += 1;
    return true;
  };
}

/** The client's IP from proxy headers: the first x-forwarded-for hop, else x-real-ip. */
export function clientIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
