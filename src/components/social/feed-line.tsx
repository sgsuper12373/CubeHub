import type { FeedItem } from "@/lib/social/types";
import { eventLabel, isTimerEvent } from "@/lib/timer/events";
import { formatMs } from "@/lib/timer/format";

/** What one activity-feed item says: People's feed and Home's friends card. */

const CATEGORY_LABEL: Record<string, string> = {
  single: "single",
  mean3: "Mo3",
  ao5: "Ao5",
  ao12: "Ao12",
  ao100: "Ao100",
};

function eventName(puzzle: string | null): string {
  if (!puzzle) return "";
  return isTimerEvent(puzzle) ? eventLabel(puzzle) : puzzle;
}

export function feedLine(item: FeedItem): React.ReactNode {
  const time = (ms: number | null) =>
    ms === null ? null : <span className="font-mono font-semibold text-foreground tabular-nums">{formatMs(ms)}</span>;
  switch (item.kind) {
    case "pb":
      return (
        <>
          New {eventName(item.puzzleType)} {CATEGORY_LABEL[item.category ?? ""] ?? item.category} PB {time(item.timeMs)}
        </>
      );
    case "practice":
      return (
        <>
          {item.n} {eventName(item.puzzleType)} solve{item.n === 1 ? "" : "s"}
          {item.timeMs !== null && <> · best {time(item.timeMs)}</>}
        </>
      );
    case "badge":
      return (
        <>
          Earned <span className="font-medium text-foreground">{item.label}</span>
        </>
      );
    case "learned":
      return (
        <>
          Learned {item.n} {item.label} case{item.n === 1 ? "" : "s"}
        </>
      );
  }
}

export function feedDate(at: string): string {
  return new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}
