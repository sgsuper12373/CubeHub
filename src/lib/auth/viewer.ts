/**
 * Who is signed in, as a statically rendered page learns it in the browser
 * (GET /api/viewer). No server imports, so client code can use it.
 */

import type { CurrentProfile } from "@/lib/auth/dal";
import type { NotificationItem } from "@/lib/notifications/types";

export type Viewer = {
  signedIn: boolean;
  profile: CurrentProfile | null;
  notifications: { items: NotificationItem[]; unread: number };
};

export const SIGNED_OUT_VIEWER: Viewer = {
  signedIn: false,
  profile: null,
  notifications: { items: [], unread: 0 },
};

/**
 * Supabase's session cookie, `sb-<project>-auth-token` (chunked as `.0`, `.1`…
 * when large). It isn't httpOnly: the browser client reads it too. Present
 * means "probably signed in"; only GET /api/viewer can say for sure.
 */
export const AUTH_COOKIE_PATTERN = /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/;

/** Set on <html> before first paint when the auth cookie is present. */
export const SIGNED_IN_HINT_ATTR = "data-signed-in";

/**
 * Inline script for static pages: marks <html> with SIGNED_IN_HINT_ATTR so
 * server-rendered markup can pick the signed-in or signed-out chrome with CSS
 * before hydration, instead of flashing "Sign In" at a signed-in visitor.
 */
export const SIGNED_IN_HINT_SCRIPT = `try{document.documentElement.toggleAttribute(${JSON.stringify(SIGNED_IN_HINT_ATTR)},${AUTH_COOKIE_PATTERN}.test(document.cookie))}catch(e){}`;
