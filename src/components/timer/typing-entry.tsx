"use client";

import { useState } from "react";

import { formatResult } from "@/lib/timer/format";
import { parseTypedTime } from "@/lib/timer/parse-time";
import type { Penalty, TimerSettings } from "@/lib/timer/types";
import { cn } from "@/lib/utils";

const PENALTIES: { value: Penalty; label: string }[] = [
  { value: "none", label: "OK" },
  { value: "plus2", label: "+2" },
  { value: "dnf", label: "DNF" },
];

/**
 * Typing mode: enter a result instead of timing it, for cubers on a Stackmat
 * or a phone stopwatch, or recording competition times. Takes the place of the
 * touch stage, so Space types into the box rather than starting a timer.
 *
 * Entry follows csTimer (see parse-time.ts). On a phone the numeric keypad has
 * no "+" or letters, so +2 and DNF are also buttons; a marker typed in the box
 * wins over the button.
 */
export function TypingEntry({
  onSubmit,
  timerFontSize,
}: {
  onSubmit: (timeMs: number, penalty: Penalty) => void;
  timerFontSize: TimerSettings["timerFontSize"];
}) {
  const [text, setText] = useState("");
  /** The last result saved from this box, shown as confirmation. */
  const [saved, setSaved] = useState<{ timeMs: number; penalty: Penalty } | null>(null);
  const [penalty, setPenalty] = useState<Penalty>("none");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const parsed = parseTypedTime(text);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const result = {
      timeMs: parsed.timeMs,
      penalty: parsed.penalty === "none" ? penalty : parsed.penalty,
    };
    onSubmit(result.timeMs, result.penalty);
    setSaved(result);
    setText("");
    setPenalty("none");
    setError(null);
  };

  return (
    <form
      className="flex flex-1 flex-col items-center justify-center gap-4 px-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor="typed-time" className="sr-only">
        Time
      </label>
      {/* The size setting goes on a wrapper so the box's em sizes scale with it,
          as in TimeDisplay; on the input itself it would replace them. */}
      <div className="flex w-full justify-center" style={{ fontSize: `${timerFontSize}%` }}>
        <input
          id="typed-time"
          autoFocus
          autoComplete="off"
          inputMode="decimal"
          enterKeyHint="done"
          placeholder="0.00"
          value={text}
          aria-invalid={error !== null}
          aria-describedby="typed-time-help"
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") e.currentTarget.blur();
          }}
          className={cn(
            "w-full max-w-md border-b-2 bg-transparent text-center font-timer text-[3.5em] leading-tight font-semibold text-foreground tabular-nums outline-none placeholder:text-muted-foreground/40 md:text-[4.5em]",
            error ? "border-destructive" : "border-border focus:border-primary",
          )}
        />
      </div>

      <div role="radiogroup" aria-label="Penalty" className="flex rounded-lg border border-border p-0.5">
        {PENALTIES.map((p) => (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={penalty === p.value}
            onClick={() => setPenalty(p.value)}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors",
              penalty === p.value
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p id="typed-time-help" className={cn("h-5 text-center text-sm", error ? "text-destructive" : "text-muted-foreground")}>
        {error ??
          (saved
            ? `Saved ${formatResult(saved.timeMs, saved.penalty)} · Enter to save the next`
            : "Enter to save · 1234 = 12.34 · add + for +2 · DNF")}
      </p>
    </form>
  );
}
