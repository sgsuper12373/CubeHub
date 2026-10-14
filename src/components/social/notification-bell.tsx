"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { markAllNotificationsRead } from "@/lib/notifications/actions";
import { notificationHref, notificationText, timeAgo, type NotificationItem } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

/**
 * The bell: unread count, and the latest notifications in a popover. Opening
 * it marks everything read (the dots stay until it closes, so you can see
 * what was new).
 */
export function NotificationBell({ items, unread }: { items: NotificationItem[]; unread: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next && unread > 0) {
      startTransition(async () => {
        await markAllNotificationsRead();
      });
    }
    if (!next && unread > 0) router.refresh();
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          />
        }
      >
        <Bell />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-1 p-1.5">
        <div className="flex items-center justify-between px-2 pt-1 pb-1.5">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          <Link href="/people" onClick={() => setOpen(false)} className="text-xs font-medium text-primary hover:underline">
            People
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Nothing yet. Follow some cubers to get started.
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {items.map((n) => {
              const name = n.actor ? n.actor.displayName || n.actor.username : "CubeHub";
              return (
                <li key={n.id}>
                  <Link
                    href={notificationHref(n)}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-muted",
                      !n.isRead && "bg-primary/5",
                    )}
                  >
                    <ProfileAvatar url={n.actor?.avatarUrl ?? null} name={name} size="xs" />
                    <span className="min-w-0 flex-1 text-foreground/90">
                      <span className="font-semibold text-foreground">{name}</span> {notificationText(n)}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                    {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="unread" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
