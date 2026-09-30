"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { activeNavHref, mobileNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/stores/layout-store";

export function BottomNav() {
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
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
