"use client";

import { CalendarDays, Check, Flame, Loader2, Share2, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { PreviewPanel } from "@/components/timer/preview-panel";
import { ScrambleTokens } from "@/components/timer/scramble-bar";
import { TimeDisplay } from "@/components/timer/time-display";
import { TouchStage } from "@/components/timer/touch-stage";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ServerTimerSettings } from "@/lib/auth/dal";
import { dayStatus, formatDay, istDay } from "@/lib/daily/day";
import { fetchBoard, fetchDaily, fetchMine, fetchMyDays, postDailyResult, type DailyRow, type DailyScramble } from "@/lib/daily/data";
import { dailyShareText, dailyStreak } from "@/lib/daily/share";
import { trackDailyAttempt } from "@/lib/home/analytics";
import { copyWithToast } from "@/lib/timer/copy-text";
import { appUrl } from "@/lib/site-url";
import {
  allowedPenalties,
  dailyResultProblem,
  loadAttempt,
  loadAttemptDays,
  saveAttempt,
  type DailyAttempt,
} from "@/lib/daily/result";
import { FOCUS_ATTR, isFocusHidden } from "@/lib/timer/focus";
import { formatMs, formatResult } from "@/lib/timer/format";
import { loadClientSettings } from "@/lib/timer/settings-persistence";
import type { Penalty } from "@/lib/timer/types";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/stores/layout-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useTimerStore } from "@/stores/timer-store";

type Status = "loading" | "unavailable" | "closed" | "future" | "ready" | "done";

const PENALTY_LABEL: Record<Penalty, string> = { none: "OK", plus2: "+2", dnf: "DNF" };

/**
 * `/timer?daily=yyyy-mm-dd` (docs/home-plan.md → card 2): today's scramble,
 * WCA inspection, one attempt. The attempt is kept in this browser
 * (`cubehub.daily.v1`) the moment the timer stops, so a reload can't buy a
 * second try; a signed-in cuber then confirms the penalty and posts it once.
 *
 * It borrows the timer store's engine (TouchStage, TimeDisplay) and gives it
 * back on the way out: the normal session's scramble slots, puzzle and
 * settings are saved on entry and restored on exit, and the daily attempt is
 * never recorded into a session (the normal TimerScreen isn't mounted here).
 */
export function DailyTimer({
  day,
  isAuthed,
  userId,
  initialSettings,
}: {
  day: string;
  isAuthed: boolean;
  userId: string | null;
  initialSettings: ServerTimerSettings | null;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [daily, setDaily] = useState<DailyScramble | null>(null);
  const [attempt, setAttempt] = useState<DailyAttempt | null>(null);
  /** The penalty inspection gave: the floor for the cuber's own choice. */
  const [floor, setFloor] = useState<Penalty>("none");
  const [posted, setPosted] = useState<{ row: DailyRow; rank: number | null } | null>(null);

  // Load the day: the scramble, then any result already made (here or posted).
  useEffect(() => {
    let live = true;
    void (async () => {
      const when = dayStatus(day, istDay());
      const found = await fetchDaily(day);
      if (!live) return;
      if (!found) return setStatus(when === "future" ? "future" : "unavailable");
      setDaily(found);
      const mine = userId ? await fetchMine(day, userId) : null;
      if (!live) return;
      const local = loadAttempt(day);
      if (mine) {
        setPosted(mine);
        return setStatus("done");
      }
      if (local) {
        setAttempt(local);
        setFloor(local.penalty);
        return setStatus("done");
      }
      setStatus(when === "today" ? "ready" : when === "past" ? "closed" : "future");
    })();
    return () => {
      live = false;
    };
  }, [day, userId]);

  return (
    <div className="relative isolate flex min-h-0 flex-1 flex-col">
      <DailyBanner day={day} />
      {status === "loading" && (
        <div className="flex flex-1 items-center justify-center" role="status" aria-label="Loading the daily scramble">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      )}
      {status === "unavailable" && (
        <Notice title="No daily scramble today" body="The daily scramble isn't available right now. Try the normal timer instead." day={day} />
      )}
      {status === "future" && <Notice title="Not open yet" body="This daily scramble opens at midnight IST." day={day} />}
      {status === "closed" && (
        <Notice title="This daily has closed" body="Each daily scramble is open for its own day (IST). See how it went:" day={day} leaderboard />
      )}
      {status === "ready" && daily && (
        <DailyAttemptStage
          daily={daily}
          initialSettings={initialSettings}
          onDone={(a) => {
            saveAttempt(day, a);
            trackDailyAttempt(a.penalty);
            setAttempt(a);
            setFloor(a.penalty);
            setStatus("done");
          }}
        />
      )}
      {status === "done" && (
        <DailyResult
          day={day}
          isAuthed={isAuthed}
          userId={userId}
          attempt={attempt}
          floor={floor}
          posted={posted}
          onPenalty={(p) => {
            if (!attempt) return;
            const next = { ...attempt, penalty: p };
            saveAttempt(day, next);
            setAttempt(next);
          }}
          onPosted={(mine) => {
            if (attempt) saveAttempt(day, { ...attempt, posted: true });
            setPosted(mine);
          }}
        />
      )}
    </div>
  );
}

function DailyBanner({ day }: { day: string }) {
  return (
    <div className="flex items-center justify-center gap-2 border-b border-border bg-primary/10 px-4 py-2 text-sm" data-focus-hide>
      <CalendarDays className="size-4 text-primary" aria-hidden />
      <span className="font-semibold text-foreground">Daily scramble · {formatDay(day)}</span>
      <span className="hidden text-muted-foreground sm:inline">One attempt, WCA inspection</span>
    </div>
  );
}

function Notice({ title, body, day, leaderboard = false }: { title: string; body: string; day: string; leaderboard?: boolean }) {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {leaderboard && (
          <Link href={`/home/daily?day=${day}`} className={buttonVariants({ size: "sm" })}>
            See the leaderboard
          </Link>
        )}
        <Link href="/timer" className={buttonVariants({ size: "sm", variant: "outline" })}>
          Open the timer
        </Link>
      </div>
    </div>
  );
}

/**
 * The one attempt. Takes over the timer store while mounted and hands it
 * back on unmount.
 */
function DailyAttemptStage({
  daily,
  initialSettings,
  onDone,
}: {
  daily: DailyScramble;
  initialSettings: ServerTimerSettings | null;
  onDone: (attempt: DailyAttempt) => void;
}) {
  const phase = useTimerStore((s) => s.phase);
  const settings = useTimerStore((s) => s.settings);
  const inInspection = useTimerStore((s) => s.inspectionStartedAt !== null);
  const isFocusMode = useLayoutStore((s) => s.isFocusMode);
  const setSidebarLocked = useSidebarStore((s) => s.setShortcutsLocked);
  // Entered once the store holds the daily scramble (set by the effect below).
  const entered = useTimerStore((s) => s.scramble.alg === daily.scramble && s.scramble.next === null);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  // Enter daily mode: the fixed scramble, 3x3, WCA (15 s) inspection. Save
  // what the normal timer had and put it back on the way out.
  useEffect(() => {
    const store = useTimerStore.getState();
    const saved = { puzzle: store.puzzle, scramble: store.scramble, settings: store.settings };
    store.cancel();
    useTimerStore.setState({
      puzzle: "333",
      scramble: { alg: daily.scramble, next: null, generating: false, custom: false, prev: null },
      finalElapsedMs: null,
      stoppedAt: null,
      inspectionPenalty: "none",
    });
    store.applySettings({ ...(initialSettings ?? {}), ...loadClientSettings(), inspectionMode: "15s" });
    return () => {
      useTimerStore.getState().cancel();
      useTimerStore.setState({
        puzzle: saved.puzzle,
        scramble: saved.scramble,
        settings: saved.settings,
        finalElapsedMs: null,
        stoppedAt: null,
        inspectionPenalty: "none",
      });
    };
  }, [daily.scramble, initialSettings]);

  // The attempt ends when the timer stops: keep it, once.
  useEffect(() => {
    if (!entered || phase !== "stopped") return;
    const t = useTimerStore.getState();
    if (t.finalElapsedMs === null) return;
    doneRef.current({ timeMs: Math.max(1, Math.round(t.finalElapsedMs)), penalty: t.inspectionPenalty, posted: false });
  }, [entered, phase]);

  const focusHidden = isFocusMode && isFocusHidden(phase, inInspection);
  useEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute(FOCUS_ATTR, focusHidden);
    return () => root.removeAttribute(FOCUS_ATTR);
  }, [focusHidden]);
  const busy = phase !== "idle" && phase !== "stopped";
  useEffect(() => {
    setSidebarLocked(busy);
    return () => setSidebarLocked(false);
  }, [busy, setSidebarLocked]);

  const solving = phase === "holding" || phase === "ready" || phase === "running";
  if (!entered) return null;
  return (
    <>
      <div
        className={cn(
          "flex flex-col items-center gap-2 px-4 pt-4 transition-opacity",
          solving ? "pointer-events-none opacity-[0.1] duration-150" : "opacity-100 duration-300",
        )}
        data-focus-hide
      >
        <ScrambleTokens alg={daily.scramble} />
      </div>
      <TouchStage disabled={phase === "stopped"} shortcuts={false}>
        <TimeDisplay hideWhileSolving={settings.hideTimeWhileSolving} />
        <p className="absolute bottom-[15%] h-5 w-full text-center text-sm text-muted-foreground">
          {phase === "idle" ? "One attempt. Tap or press space to start inspection." : ""}
        </p>
      </TouchStage>
      {settings.showScramblePreview && (
        <div
          className={cn("mx-auto hidden h-44 w-60 md:flex", solving && "opacity-[0.1]")}
          data-focus-hide
        >
          <PreviewPanel alg={daily.scramble} puzzle="333" dimension="2D" />
        </div>
      )}
      <div className="h-[3.75rem] shrink-0 md:hidden" aria-hidden />
    </>
  );
}

function DailyResult({
  day,
  isAuthed,
  userId,
  attempt,
  floor,
  posted,
  onPenalty,
  onPosted,
}: {
  day: string;
  isAuthed: boolean;
  userId: string | null;
  attempt: DailyAttempt | null;
  floor: Penalty;
  posted: { row: DailyRow; rank: number | null } | null;
  onPenalty: (p: Penalty) => void;
  onPosted: (mine: { row: DailyRow; rank: number | null }) => void;
}) {
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [solved, setSolved] = useState<number | null>(null);

  // The streak (posted days, plus this browser's attempts) and how many solved today.
  useEffect(() => {
    let live = true;
    void (async () => {
      const [mine, board] = await Promise.all([userId ? fetchMyDays(userId) : Promise.resolve([]), fetchBoard(day, 1)]);
      if (!live) return;
      setStreak(dailyStreak([...mine, ...loadAttemptDays(), day], istDay()));
      setSolved(board.solved || null);
    })();
    return () => {
      live = false;
    };
  }, [day, userId, posted]);

  const share = async () => {
    const result = posted ? posted.row : attempt;
    if (!result) return;
    const text = dailyShareText({
      day,
      timeMs: result.timeMs ?? 0,
      penalty: result.penalty,
      rank: posted?.rank ?? null,
      solved,
      streak,
      url: appUrl(`/timer?daily=${day}`),
    });
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // Cancelled, or not allowed here: fall back to copying.
      }
    }
    await copyWithToast(text, "Result");
  };

  const shown = posted
    ? posted.row.penalty === "dnf"
      ? "DNF"
      : formatResult(posted.row.timeMs ?? 0, posted.row.penalty)
    : attempt
      ? formatResult(attempt.timeMs, attempt.penalty)
      : "—";
  const problem = !posted && attempt ? dailyResultProblem(attempt.timeMs, attempt.penalty) : null;
  const canPost = isAuthed && userId !== null && !posted && attempt !== null && !attempt.posted && problem === null;

  const post = async () => {
    if (!attempt || !userId) return;
    setPosting(true);
    setError(null);
    const res = await postDailyResult(day, attempt.timeMs, attempt.penalty);
    if (!res.ok) {
      setError(res.error);
      setPosting(false);
      return;
    }
    if (!res.recorded) setNote("You'd already posted today's daily; your first result stands.");
    const mine = await fetchMine(day, userId);
    setPosting(false);
    if (mine) onPosted(mine);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <p className="text-sm font-medium text-muted-foreground">{posted ? "Your posted result" : "Your result"}</p>
      <p className="font-mono text-6xl font-bold tabular-nums text-foreground" data-testid="daily-result">
        {shown}
      </p>
      {attempt && attempt.penalty === "plus2" && !posted && (
        <p className="text-xs text-muted-foreground">{formatMs(attempt.timeMs)} + 2</p>
      )}

      {posted ? (
        <p className="flex items-center gap-2 text-sm text-foreground" role="status">
          <Check className="size-4 text-primary" aria-hidden />
          {posted.rank ? `On the leaderboard: #${posted.rank} today` : "Posted. DNFs aren't ranked."}
        </p>
      ) : attempt && !attempt.posted && isAuthed ? (
        <fieldset className="flex flex-col items-center gap-2">
          <legend className="mb-2 text-sm text-muted-foreground">Check the penalty, then post. You can post once.</legend>
          <div className="flex gap-2">
            {allowedPenalties(floor).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={attempt.penalty === p}
                onClick={() => onPenalty(p)}
                className={cn(
                  "min-h-10 min-w-16 rounded-lg border px-3 text-sm font-semibold transition-colors",
                  attempt.penalty === p
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                {PENALTY_LABEL[p]}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {streak >= 2 && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground" data-testid="daily-streak">
          <Flame className="size-4 text-primary" aria-hidden />
          {streak}-day streak
        </p>
      )}

      {problem && <p className="text-sm text-destructive">{problem}</p>}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {note && <p className="text-sm text-muted-foreground">{note}</p>}

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {canPost && (
          <Button onClick={() => void post()} disabled={posting} size="lg">
            {posting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trophy className="size-4" aria-hidden />}
            Post to the leaderboard
          </Button>
        )}
        {!isAuthed && (
          <Link
            href={`/login?next=${encodeURIComponent(`/timer?daily=${day}`)}`}
            className={buttonVariants({ size: "lg" })}
          >
            Sign in to get on the leaderboard
          </Link>
        )}
        <Link href={`/home/daily?day=${day}`} className={buttonVariants({ size: "lg", variant: "outline" })}>
          See the leaderboard
        </Link>
        <Button variant="outline" size="lg" onClick={() => void share()}>
          <Share2 className="size-4" aria-hidden />
          Share
        </Button>
      </div>
      <Link href="/timer" className="text-sm font-medium text-primary hover:underline">
        Back to the normal timer
      </Link>
    </div>
  );
}
