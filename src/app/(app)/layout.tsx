import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { UsernameOnboarding } from "@/components/auth/username-onboarding";
import { CubbyMount } from "@/components/cubby/cubby-mount";
import { getProfile } from "@/lib/auth/dal";
import { SHOW_CUBBY } from "@/lib/companion/flag";
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
 * The app shell: the sidebar from md up (docs/app-shell-plan.md → The
 * sidebar), the bottom nav below md. The sidebar's width comes from the
 * `cubehub-sidebar` cookie, read here so the first paint is right; this
 * layout already reads auth cookies, so it costs no static rendering.
 *
 * This group is a *chrome* boundary, not an access boundary — /timer,
 * /learn, /compete and /shop are all public. Routes that require an
 * account live in the nested `(protected)` group; content that requires
 * an account or a subscription is gated by RLS on the row itself.
 * See `docs/access-control.md`.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [profile, notifications, cookieStore, learnNav] = await Promise.all([
    getProfile(),
    getNotifications(),
    cookies(),
    getLearnNav(),
  ]);
  const sidebarPrefs = parseSidebarCookie(cookieStore.get(SIDEBAR_COOKIE)?.value);

  return (
    <div className="flex flex-1">
      <AppSidebar profile={profile} notifications={notifications} initialPrefs={sidebarPrefs} learnNav={learnNav} />
      <main className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">{children}</main>
      <BottomNav unread={notifications.unread} username={profile?.username ?? null} />
      <UsernameOnboarding profile={profile} />
      <CommandPalette learnNav={learnNav} username={profile?.username ?? null} />
      {SHOW_CUBBY && <CubbyMount />}
    </div>
  );
}
