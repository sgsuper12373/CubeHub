"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { announceUnlocks, checkAchievements } from "@/lib/profile/achievements";

/**
 * On your own profile: award anything already earned but not yet recorded
 * (everything, the first time after achievements shipped), announce it, and
 * refresh so the badge grid shows it. Renders nothing.
 */
export function AchievementCheck() {
  const router = useRouter();
  useEffect(() => {
    void checkAchievements().then((unlocks) => {
      announceUnlocks(unlocks);
      if (unlocks.length > 0) router.refresh();
    });
  }, [router]);
  return null;
}
