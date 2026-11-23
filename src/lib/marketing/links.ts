import { appUrl, HOST_SPLIT } from "@/lib/site-url";

/**
 * Where the marketing site links to (docs/landing-plan.md).
 *
 * Every link into the product goes through `appHref()` (landing plan step
 * 11). With the hosts split (NEXT_PUBLIC_APP_URL set) it's an absolute URL on
 * the app host, via the app shell's `appUrl()`. Until then it stays a relative
 * path, so previews, local dev on any port and the e2e server keep linking to
 * themselves rather than to NEXT_PUBLIC_SITE_URL.
 */
export function appHref(path: string): string {
  return HOST_SPLIT ? appUrl(path) : path;
}

/** The header's "Open app": Home, the app's front door (docs/home-plan.md → Routing changes). */
export const OPEN_APP_HREF = appHref("/home");
export const SIGN_IN_HREF = appHref("/login");
export const SIGN_UP_HREF = appHref("/signup");

/** The header's centre links: in-page anchors on /, which also work from any other page. */
export const MARKETING_LINKS: { label: string; href: string }[] = [
  { label: "Features", href: "/#features" },
  { label: "Learn", href: appHref("/learn") },
  { label: "Roadmap", href: "/#roadmap" },
  { label: "FAQ", href: "/#faq" },
];
