import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Navbar } from "@/components/layout/navbar";
import { UsernameOnboarding } from "@/components/auth/username-onboarding";
import { getProfile } from "@/lib/auth/dal";
import { getLearnNav } from "@/lib/learn/public-dal";
import { getNotifications } from "@/lib/notifications/dal";
import { parseSidebarCookie, SIDEBAR_COOKIE } from "@/lib/sidebar";
import { APP_URL } from "@/lib/site-url";

/**
 * App pages resolve relative canonical and Open Graph URLs against the app
 * origin, not the marketing one the root layout sets (docs/app-shell-plan.md →
 * Robots and sitemaps). The same origin in single-host mode.
 */
export const metadata: Metadata = { metadataBase: new URL(APP_URL) };

/**
 * The signed-in app shell: navbar + mobile bottom nav.
 *
 * This group is a *chrome* boundary, not an access boundary — /timer,
 * /learn, /compete and /shop are all public. Routes that require an
 * account live in the nested `(protected)` group; content that requires
 * an account or a subscription is gated by RLS on the row itself.
 * See `docs/access-control.md`.
 */
/**
 * TEMP(app shell step 6): the sidebar renders beside the old navbar only with
 * NEXT_PUBLIC_SIDEBAR=1, so it can be reviewed in a preview first.
 */
const SIDEBAR_PREVIEW = process.env.NEXT_PUBLIC_SIDEBAR === "1";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [profile, notifications] = await Promise.all([getProfile(), getNotifications()]);

  if (SIDEBAR_PREVIEW) {
    const [cookieStore, learnNav] = await Promise.all([cookies(), getLearnNav()]);
    const sidebarPrefs = parseSidebarCookie(cookieStore.get(SIDEBAR_COOKIE)?.value);
    return (
      <div className="flex flex-1">
        <AppSidebar profile={profile} notifications={notifications} initialPrefs={sidebarPrefs} learnNav={learnNav} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar profile={profile} notifications={notifications} />
          <main className="flex flex-1 flex-col pb-16 md:pb-0">{children}</main>
        </div>
        <BottomNav unread={notifications.unread} username={profile?.username ?? null} />
        <UsernameOnboarding profile={profile} />
      </div>
    );
  }

  return (
    <>
      <Navbar profile={profile} notifications={notifications} />
      <main className="flex flex-1 flex-col pb-16 md:pb-0">{children}</main>
      <BottomNav unread={notifications.unread} username={profile?.username ?? null} />
      <UsernameOnboarding profile={profile} />
    </>
  );
}
