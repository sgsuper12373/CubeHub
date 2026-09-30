import type { Metadata } from "next";

import { TimerScreen } from "@/components/timer/timer-screen";
import { getUser, getTimerSettings } from "@/lib/auth/dal";
import { getAlgorithmCaseById, getRandomCaseForDrill } from "@/lib/learn/dal";

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

  // Handle "Train Case" or "Train Set" (drill) mode
  const resolvedParams = await searchParams;
  const trainParam =
    typeof resolvedParams.train === "string" ? resolvedParams.train : null;
  const puzzleParam =
    typeof resolvedParams.puzzle === "string" ? resolvedParams.puzzle : "333";

  let trainCase = null;
  let drillSubset: string | null = null;

  if (trainParam) {
    // 1. Check if trainParam is a specific case UUID
    trainCase = await getAlgorithmCaseById(trainParam);

    // 2. If not a specific case, treat as a subset slug for drill mode (e.g. "oll", "pll")
    if (!trainCase) {
      trainCase = await getRandomCaseForDrill(puzzleParam, trainParam);
      if (trainCase) {
        drillSubset = trainParam;
      }
    }
  }

  return (
    <TimerScreen
      isAuthed={user !== null}
      userId={user?.id ?? null}
      initialSettings={settings}
      trainCase={trainCase}
      drillSubset={drillSubset}
    />
  );
}
