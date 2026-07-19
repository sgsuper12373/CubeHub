import type { Metadata } from "next";

import { TimerScreen } from "@/components/timer/timer-screen";
import { getUser, getTimerSettings } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Timer — CubeHub",
};

/**
 * Server shell only — renders instantly. `getUser()` and `getTimerSettings()`
 * are cache()d and share the same Supabase client within the render pass,
 * so the auth check is free. Timer settings hydrate from user_settings when
 * logged in; otherwise the client defaults apply (no login friction).
 */
export default async function TimerPage() {
  const user = await getUser();
  const settings = await getTimerSettings();

  return (
    <TimerScreen
      isAuthed={user !== null}
      userId={user?.id ?? null}
      initialSettings={settings}
    />
  );
}
