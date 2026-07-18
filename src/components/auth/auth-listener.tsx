"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * Keeps server-rendered auth state fresh. When the user signs in or out
 * (including in another tab), refresh the route so Server Components — the
 * navbar, protected pages — re-read the session.
 */
export function AuthListener() {
  const router = useRouter();
  const lastUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null;
      // Ignore token refreshes that don't change who is logged in.
      if (lastUserId.current === undefined) {
        lastUserId.current = userId;
        return;
      }
      if (userId !== lastUserId.current) {
        lastUserId.current = userId;
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
