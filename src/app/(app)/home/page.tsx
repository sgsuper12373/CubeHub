import type { Metadata } from "next";
import { Suspense } from "react";

import { GuestHome } from "@/components/home/guest-home";
import { HomeGreeting } from "@/components/home/home-greeting";
import { HomeMobileBar } from "@/components/home/home-mobile-bar";
import { MemberHome, MemberQuickStart } from "@/components/home/member-home";
import { QuickStart } from "@/components/home/quick-start";
import { getProfile } from "@/lib/auth/dal";
import { greetingName } from "@/lib/home/cards";
import { getNotifications } from "@/lib/notifications/dal";

export const metadata: Metadata = {
  title: "Home — CuberHub",
  description: "Your practice at a glance: start a session, drill your slow cases, keep learning.",
  robots: { index: false },
};

/**
 * The app's front door (docs/home-plan.md): where sign-in lands and where
 * app.cuberhub.me/ redirects. Short and calm: a greeting, one click to start
 * practising, then a few cards. The page fetches nothing slow itself; the
 * member's quick start and cards stream in behind Suspense, and a guest's are
 * decided in the browser from local data.
 */
export default async function HomePage() {
  const [profile, notifications] = await Promise.all([getProfile(), getNotifications()]);
  const name = profile ? greetingName(profile.display_name, profile.username) : null;

  return (
    <>
      <HomeMobileBar profile={profile} notifications={notifications} />
      <div className="mx-auto flex w-full max-w-[1212px] flex-col gap-6 px-4 py-6 md:px-6 lg:py-8">
        <header className="flex flex-col gap-4">
          <HomeGreeting name={name} />
          {profile ? (
            <Suspense fallback={<QuickStart />}>
              <MemberQuickStart username={profile.username} />
            </Suspense>
          ) : (
            <QuickStart />
          )}
        </header>
        {profile ? (
          <Suspense fallback={null}>
            <MemberHome profile={profile} layout={null} />
          </Suspense>
        ) : (
          <GuestHome />
        )}
      </div>
    </>
  );
}
