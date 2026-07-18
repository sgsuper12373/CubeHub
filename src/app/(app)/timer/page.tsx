import type { Metadata } from "next";

import { TimerScreen } from "@/components/timer/timer-screen";
import { getUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Timer — CubeHub",
};

/**
 * Server shell only — renders instantly, no data fetch on the interaction
 * path. `getUser()` is cache()d and already resolved by the (app) layout in
 * the same render pass. Timer settings from user_settings arrive with the
 * cloud-sync step (getTimerSettings DAL helper); until then the client
 * defaults apply.
 */
export default async function TimerPage() {
  const user = await getUser();

  return (
    <TimerScreen
      isAuthed={user !== null}
      userId={user?.id ?? null}
      initialSettings={null}
    />
  );
}
