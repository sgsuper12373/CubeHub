/**
 * Which companion page a pathname is: one content file (and one tour) per
 * page. Pages without a content file get the dock but no tour or greeting.
 */
export const COMPANION_PAGES = ["timer", "learn", "learn-series", "drill", "playground"] as const;
export type CompanionPage = (typeof COMPANION_PAGES)[number];

export function companionPageFor(pathname: string): CompanionPage | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/timer") return "timer";
  if (path === "/playground") return "playground";
  if (path === "/learn") return "learn";
  const learn = /^\/learn\/[^/]+\/([^/]+)$/.exec(path);
  if (learn) return learn[1] === "drill" ? "drill" : "learn-series";
  return null;
}
