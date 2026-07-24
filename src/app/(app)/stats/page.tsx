import type { Metadata } from "next";

import { StatsScreen } from "@/components/stats/analytics/stats-screen";
import { getUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Stats — CubeHub",
  description:
    "Your solve history: trend, distribution, consistency and practice over time.",
};

/**
 * Server shell only, mirroring /timer. `getUser()` is cache()d, so the auth
 * check costs nothing extra, and the page renders before any solve data has
 * been asked for.
 *
 * Deliberately outside the `(protected)` group: analytics work logged out over
 * localStorage, and gating them behind an account would hide the reason to make
 * one. See `docs/access-control.md` — this group is a chrome boundary, not an
 * access boundary.
 */
export default async function StatsPage() {
  const user = await getUser();

  return <StatsScreen userId={user?.id ?? null} />;
}
