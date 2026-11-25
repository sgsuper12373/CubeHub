"use client";

import { LogIn, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ThemePicker } from "@/components/layout/theme-picker";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { signOut } from "@/lib/auth/actions";
import { activeNavHref, mobileMoreItems, mobileNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useOverlayLock } from "@/stores/overlay-store";

const TAB =
  "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/**
 * The phone tab bar (below md): Home, Timer, Learn, Drill and More, which
 * opens a bottom sheet with everything else (docs/app-shell-plan.md → Phones).
 * `unread` puts a dot on More and on Profile inside it: phones have no top bar
 * for the bell outside Home. Focus mode hides it while solving (data-focus-hide).
 */
export function BottomNav({
  unread = 0,
  username = null,
  signedIn = username !== null,
}: {
  unread?: number;
  username?: string | null;
  signedIn?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Space must not reach the timer behind the open sheet.
  useOverlayLock(open);

  const activeTab = activeNavHref(pathname, mobileNavItems, username);
  const activeMore = activeTab ? null : activeNavHref(pathname, mobileMoreItems, username);

  return (
    <nav
      aria-label="Tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      data-focus-hide
    >
      <div className="flex h-16 items-stretch">
        {mobileNavItems.map(({ label, href, icon: Icon }) => {
          const active = href === activeTab;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(TAB, active ? "text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <Icon className="size-5" />
              {label === "Drill Lab" ? "Drill" : label}
            </Link>
          );
        })}
        <Sheet open={open} onOpenChange={setOpen}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={cn(TAB, activeMore ? "text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <span className="relative">
              <Menu className="size-5" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-1 size-2 rounded-full bg-primary ring-2 ring-background" />
              )}
            </span>
            More
            {unread > 0 && <span className="sr-only">, {unread} unread notifications</span>}
          </button>
          <SheetContent side="bottom" className="rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
            <SheetHeader className="pb-0">
              <SheetTitle>More</SheetTitle>
              <SheetDescription className="sr-only">Every other page in CuberHub</SheetDescription>
            </SheetHeader>
            <ul className="grid grid-cols-3 gap-2 px-4">
              {mobileMoreItems.map(({ label, href, icon: Icon }) => {
                const active = href === activeMore;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        active
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:bg-muted",
                      )}
                    >
                      <Icon className="size-5" />
                      {label}
                      {href === "/profile" && unread > 0 && (
                        <span className="absolute top-2 right-2 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-bold text-primary-foreground">
                          {unread > 9 ? "9+" : unread}
                          <span className="sr-only"> unread notifications</span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-col gap-3 px-4">
              <ThemePicker className="text-sm" />
              {signedIn ? (
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <LogIn className="size-4" />
                  Sign in
                </Link>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
