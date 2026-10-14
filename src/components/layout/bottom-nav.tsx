"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { activeNavHref, mobileNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/stores/layout-store";

/** `unread` puts a dot on the Profile tab: phones have no top bar for the bell. */
export function BottomNav({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();
  const activeHref = activeNavHref(pathname, mobileNavItems);
  const isZenMode = useLayoutStore((s) => s.isZenMode);

  if (isZenMode) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden" data-focus-hide>
      <div className="flex h-16 items-stretch">
        {mobileNavItems.map(({ label, href, icon: Icon }) => {
          const active = href === activeHref;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="relative">
                <Icon className="size-5" />
                {href === "/profile" && unread > 0 && (
                  <span className="absolute -top-0.5 -right-1 size-2 rounded-full bg-primary ring-2 ring-background" />
                )}
              </span>
              {href === "/profile" && unread > 0 ? (
                <>
                  {label}
                  <span className="sr-only">, {unread} unread notifications</span>
                </>
              ) : (
                label
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
