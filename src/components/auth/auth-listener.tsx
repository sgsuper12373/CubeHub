"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps server-rendered auth state fresh. When the user signs in or out
 * (including in another tab), refresh the route so Server Components — the
 * navbar, protected pages — re-read the session.
 *
 * Also triggers the local → cloud sync when a user signs in, migrating
 * any solves they accumulated while logged out.
 *
 * The Supabase client and the session store are imported inside the effect,
 * not at the top: this component is in the root layout, so a top-level import
 * put both in the first load of every page, the static landing page included,
 * though nothing here runs until after hydration.
 */
export function AuthListener() {
  const router = useRouter();
  const lastUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void import("@/lib/supabase/client").then(({ createClient }) => {
      if (cancelled) return;
      const {
        data: { subscription },
      } = createClient().auth.onAuthStateChange((event, session) => {
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
            void import("@/stores/session-store").then(({ useSessionStore }) =>
              useSessionStore.getState().syncToCloud(userId),
            );
          }
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [router]);

  return null;
}
