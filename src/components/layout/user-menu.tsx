"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import type { CurrentProfile } from "@/lib/auth/dal";

export function UserMenu({ profile }: { profile: CurrentProfile }) {
  const name = profile.display_name || profile.username;

  return (
    <div className="flex items-center gap-3">
      <span className="max-w-[12ch] truncate text-sm font-medium text-foreground">
        {name}
      </span>
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
