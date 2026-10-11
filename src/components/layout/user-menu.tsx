"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import type { CurrentProfile } from "@/lib/auth/dal";

export function UserMenu({ profile }: { profile: CurrentProfile }) {
  const name = profile.display_name || profile.username;

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/profile"
        title="My profile"
        className="max-w-[12ch] truncate rounded-md text-sm font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {name}
      </Link>
      <form action={signOut}>
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          aria-label="Sign out"
        >
          <LogOut />
        </Button>
      </form>
    </div>
  );
}
