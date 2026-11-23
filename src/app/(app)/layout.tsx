import type { Metadata } from "next";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Navbar } from "@/components/layout/navbar";
import { UsernameOnboarding } from "@/components/auth/username-onboarding";
import { getProfile } from "@/lib/auth/dal";
import { getNotifications } from "@/lib/notifications/dal";
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
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [profile, notifications] = await Promise.all([getProfile(), getNotifications()]);

  return (
    <>
      <Navbar profile={profile} notifications={notifications} />
      <main className="flex flex-1 flex-col pb-16 md:pb-0">{children}</main>
      <BottomNav unread={notifications.unread} username={profile?.username ?? null} />
      <UsernameOnboarding profile={profile} />
    </>
  );
}
