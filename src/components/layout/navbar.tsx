"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/layout/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import type { CurrentProfile } from "@/lib/auth/dal";
import { navItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Navbar({ profile }: { profile: CurrentProfile | null }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 hidden border-b bg-background/80 backdrop-blur-sm md:block">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" aria-label="CubeHub home" className="text-lg">
          <Logo />
        </Link>
        <div className="flex h-full items-center gap-1">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full items-center gap-1.5 px-3 text-sm font-medium transition-colors",
                  active
                    ? "text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </div>
        <div className="ml-auto">
          {profile ? (
            <UserMenu profile={profile} />
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
