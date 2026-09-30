import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TimerScreen } from "@/components/timer/timer-screen";
import { getUser, getTimerSettings } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Timer — CubeHub",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  // The timer's old "train" mode moved to the Drill Lab. Old links (a case
  // UUID or a subset slug in ?train=) land on the equivalent drill.
  const { train, puzzle } = await searchParams;
  if (typeof train === "string" && train.length > 0) {
    const puzzleId = typeof puzzle === "string" && /^[a-z0-9]+$/i.test(puzzle) ? puzzle : "333";
    const query = UUID.test(train) ? `case=${train}` : `set=${encodeURIComponent(train)}`;
    redirect(`/learn/${puzzleId}/drill?${query}`);
  }

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
