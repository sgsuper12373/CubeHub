"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/layout/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/social/notification-bell";
import { Button } from "@/components/ui/button";
import type { CurrentProfile } from "@/lib/auth/dal";
import { activeNavHref, navItems } from "@/lib/navigation";
import type { NotificationItem } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/stores/layout-store";

export function Navbar({
  profile,
  notifications,
}: {
  profile: CurrentProfile | null;
  notifications: { items: NotificationItem[]; unread: number };
}) {
  const pathname = usePathname();
  const activeHref = activeNavHref(pathname, navItems, profile?.username ?? null);
  const isZenMode = useLayoutStore((s) => s.isZenMode);

  if (isZenMode) return null;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 hidden border-b bg-background/80 backdrop-blur-sm md:block",
        // Over the timer's background image (TimerBackground sets
        // data-timer-bg on <html>) the bar turns to the frostier bar glass.
        "[html[data-timer-bg]_&]:timer-glass [html[data-timer-bg]_&]:timer-glass-bar",
      )}
      data-focus-hide
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 lg:gap-6">
        <Link href="/" aria-label="CubeHub home" className="text-lg">
          <Logo />
        </Link>
        {/* Labels show from lg up; between md and lg eight labelled links
            don't fit beside the logo and user menu, so they go icon-only. */}
        <div className="flex h-full min-w-0 items-center gap-1">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = href === activeHref;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                title={label}
                className={cn(
                  "relative flex h-full items-center gap-1.5 px-2.5 text-sm font-medium transition-colors lg:px-3",
                  active
                    ? "text-primary after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:bg-primary lg:after:inset-x-3"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                <span className="sr-only lg:not-sr-only">{label}</span>
              </Link>
            );
          })}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {profile ? (
            <>
              <NotificationBell items={notifications.items} unread={notifications.unread} />
              <UserMenu profile={profile} />
            </>
          ) : (
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Sign In
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
