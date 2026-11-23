import Link from "next/link";

import { CubeMark } from "@/components/layout/logo";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { NotificationBell } from "@/components/social/notification-bell";
import { buttonVariants } from "@/components/ui/button";
import type { CurrentProfile } from "@/lib/auth/dal";
import type { NotificationItem } from "@/lib/notifications/types";

/**
 * Phones only, Home only: the slim top bar with the bell and avatar
 * (docs/app-shell-plan.md → Phones). Every other page keeps its full height.
 */
export function HomeMobileBar({
  profile,
  notifications,
}: {
  profile: CurrentProfile | null;
  notifications: { items: NotificationItem[]; unread: number };
}) {
  return (
    <div className="flex h-12 items-center justify-between border-b border-border px-4 md:hidden" data-focus-hide>
      <CubeMark className="size-7" title="CuberHub" />
      {profile ? (
        <div className="flex items-center gap-1">
          <NotificationBell items={notifications.items} unread={notifications.unread} />
          <Link href="/profile" aria-label="Your profile" className="rounded-md">
            <ProfileAvatar url={profile.avatar_url} name={profile.display_name || profile.username} size="xs" className="size-7 rounded-md text-[10px]" />
          </Link>
        </div>
      ) : (
        <Link href="/login" className={buttonVariants({ size: "sm" })}>
          Sign in
        </Link>
      )}
    </div>
  );
}
