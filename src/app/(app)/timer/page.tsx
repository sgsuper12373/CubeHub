import type { Metadata } from "next";

import { TimerScreen } from "@/components/timer/timer-screen";
import { getUser, getTimerSettings } from "@/lib/auth/dal";
import { getAlgorithmCaseById } from "@/lib/learn/dal";

export const metadata: Metadata = {
  title: "Timer — CubeHub",
};

/**
 * Server shell only — renders instantly. `getUser()` and `getTimerSettings()`
 * are cache()d and share the same Supabase client within the render pass,
 * so the auth check is free. Timer settings hydrate from user_settings when
 * logged in; otherwise the client defaults apply (no login friction).
 */
export default async function TimerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getUser();
  const settings = await getTimerSettings();
  
  // Handle "Train Case" mode
  const resolvedParams = await searchParams;
  const trainId = resolvedParams.train;
  const trainCase = typeof trainId === "string" ? await getAlgorithmCaseById(trainId) : null;

  return (
    <TimerScreen
      isAuthed={user !== null}
      userId={user?.id ?? null}
      initialSettings={settings}
      trainCase={trainCase}
    />
  );
}
