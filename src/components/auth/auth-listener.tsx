"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { useSessionStore } from "@/stores/session-store";

/**
 * Keeps server-rendered auth state fresh. When the user signs in or out
 * (including in another tab), refresh the route so Server Components — the
 * navbar, protected pages — re-read the session.
 *
 * Also triggers the local → cloud sync when a user signs in, migrating
 * any solves they accumulated while logged out.
 */
export function AuthListener() {
  const router = useRouter();
  const lastUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user.id ?? null;
      // Ignore token refreshes that don't change who is logged in.
      if (lastUserId.current === undefined) {
        lastUserId.current = userId;
        return;
      }
      if (userId !== lastUserId.current) {
        lastUserId.current = userId;
        router.refresh();

        // On sign-in, trigger local → cloud sync
        if (event === "SIGNED_IN" && userId) {
          void useSessionStore.getState().syncToCloud(userId);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
