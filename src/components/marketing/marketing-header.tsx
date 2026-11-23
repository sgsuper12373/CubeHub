"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Logo } from "@/components/layout/logo";
import { useViewer } from "@/components/marketing/use-viewer";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MARKETING_LINKS, OPEN_APP_HREF, SIGN_IN_HREF } from "@/lib/marketing/links";
import { cn } from "@/lib/utils";

/*
 * The marketing header (docs/landing-plan.md → Header). The page is static,
 * so the server renders it signed out and the browser fills in the user
 * (use-viewer.ts). Before that answer, the auth cookie decides: on the server
 * and while hydrating via CSS on <html data-signed-in> (set by an inline
 * script before first paint), afterwards from document.cookie. A signed-in
 * visitor never sees "Sign in" flash.
 */

// Shown only when <html> does / doesn't carry data-signed-in. `contents`
// keeps the wrapper out of the layout.
const IF_SIGNED_IN = "hidden [html[data-signed-in]_&]:contents";
const IF_SIGNED_OUT = "contents [html[data-signed-in]_&]:hidden";

/** Past this many pixels of scroll the header gets its solid backing. */
const SOLID_AFTER = 24;

function useScrolledPast(px: number): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > px);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [px]);
  return past;
}

function OpenAppLink({ className }: { className?: string }) {
  return (
    <Link href={OPEN_APP_HREF} className={cn(buttonVariants({ size: "sm" }), "rounded-full px-4", className)}>
      Open app
    </Link>
  );
}

function SignInLink({ className }: { className?: string }) {
  return (
    <Link
      href={SIGN_IN_HREF}
      className={cn("rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground", className)}
    >
      Sign in
    </Link>
  );
}

export function MarketingHeader() {
  const { viewer, likelySignedIn } = useViewer();
  const solid = useScrolledPast(SOLID_AFTER);
  const [menuOpen, setMenuOpen] = useState(false);

  // Same elements throughout, only the classes change: swapping elements
  // mid-hydration dropped clicks made meanwhile.
  const signedIn = viewer ? Boolean(viewer.profile) : likelySignedIn;
  const inClass = signedIn === null ? IF_SIGNED_IN : signedIn ? "contents" : "hidden";
  const outClass = signedIn === null ? IF_SIGNED_OUT : signedIn ? "hidden" : "contents";
  const profile = viewer?.profile ?? null;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color] duration-300 motion-reduce:transition-none",
        solid ? "border-border bg-background/80 backdrop-blur-md" : "border-transparent bg-transparent",
      )}
    >
      <nav aria-label="Site" className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" aria-label="CuberHub home" className="shrink-0 rounded-md">
          <Logo />
        </Link>

        <ul className="mx-auto hidden items-center gap-1 md:flex">
          {MARKETING_LINKS.map((l) => (
            <li key={l.label}>
              <Link
                href={l.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <span className={outClass}>
            <SignInLink className="hidden sm:inline-block" />
          </span>
          <span className={inClass}>
            {profile && (
              <Link href="/profile" aria-label="Your profile" className="rounded-md">
                <ProfileAvatar
                  url={profile.avatar_url}
                  name={profile.display_name || profile.username}
                  size="xs"
                  className="size-8 rounded-full text-[10px]"
                />
              </Link>
            )}
          </span>
          <OpenAppLink />
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-72">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <ul className="flex flex-col gap-1 px-4">
            {MARKETING_LINKS.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-muted"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-col gap-2 p-4">
            <span className={outClass}>
              <Link
                href={SIGN_IN_HREF}
                onClick={() => setMenuOpen(false)}
                className={cn(buttonVariants({ variant: "outline" }), "h-10 w-full")}
              >
                Sign in
              </Link>
            </span>
            <OpenAppLink className="h-10 w-full" />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
