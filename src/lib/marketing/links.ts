/**
 * Where the marketing site links to (docs/landing-plan.md).
 *
 * Every link into the product goes through `appHref()`. On this branch it
 * returns the path unchanged (one host). Landing plan step 11 swaps it for the
 * app shell's `appUrl()` (`src/lib/site-url.ts` on feat/app-shell) once
 * app.cuberhub.me is live, so that switch is a change to this file only.
 */
export function appHref(path: string): string {
  return path;
}

/**
 * The header's "Open app". The plan points it at /home, which lands with the
 * app shell and Home (feat/app-shell, feat/home); until those merge it opens
 * the timer, the app's front door today.
 */
export const OPEN_APP_HREF = appHref("/timer");
export const SIGN_IN_HREF = appHref("/login");
export const SIGN_UP_HREF = appHref("/signup");

/** The header's centre links: in-page anchors on /, which also work from any other page. */
export const MARKETING_LINKS: { label: string; href: string }[] = [
  { label: "Features", href: "/#features" },
  { label: "Learn", href: appHref("/learn") },
  { label: "Roadmap", href: "/#roadmap" },
  { label: "FAQ", href: "/#faq" },
];
