"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useState } from "react";

import { formatAverage, formatMs } from "@/lib/timer/format";
import { formatDuration } from "@/lib/timer/next-solve";
import { sortSessions, type SessionSortKey, type SessionSummary } from "@/lib/timer/session-summary";
import { cn } from "@/lib/utils";

/** Rows shown before "Show all". */
const COLLAPSED_ROWS = 6;

// On phones the date moves under the name, so the times fit before the table scrolls.
const COLUMNS: { key: SessionSortKey; label: string; numeric: boolean; wideOnly?: boolean }[] = [
  { key: "name", label: "Session", numeric: false },
  { key: "lastAt", label: "Last solve", numeric: false, wideOnly: true },
  { key: "solves", label: "Solves", numeric: true },
  { key: "mean", label: "Mean", numeric: true },
  { key: "best", label: "Best", numeric: true },
  { key: "bestAo5", label: "Best Ao5", numeric: true },
  { key: "bestAo12", label: "Best Ao12", numeric: true },
];

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" });

/**
 * The event's sessions over the solves in view, one row each, sortable.
 * Clicking a row filters the whole page to it; ticking two compares them.
 * Replaces the session dropdown, which was unusable with two dozen sessions
 * mostly called "Session 1", and gives per-session bests somewhere to live.
 */
export function SessionsTable({
  rows,
  selectedId,
  onSelect,
  compareIds,
  onToggleCompare,
  emptySessions,
}: {
  rows: SessionSummary[];
  /** The session the page is filtered to, or "all". */
  selectedId: string;
  onSelect: (id: string) => void;
  /** Up to two sessions ticked for comparison. */
  compareIds: string[];
  onToggleCompare: (id: string) => void;
  /** Sessions with no solves in view (left out of the table). */
  emptySessions: number;
}) {
  const [sort, setSort] = useState<{ key: SessionSortKey; direction: "asc" | "desc" }>({
    key: "lastAt",
    direction: "desc",
  });
  const [expanded, setExpanded] = useState(false);

  const sorted = sortSessions(rows, sort.key, sort.direction);
  // The selected session stays visible even when the list is collapsed.
  const shown = expanded
    ? sorted
    : sorted.filter((r, i) => i < COLLAPSED_ROWS || r.id === selectedId || compareIds.includes(r.id));
  // Older session on the left.
  const comparing = rows
    .filter((r) => compareIds.includes(r.id))
    .sort((x, y) => (x.firstAt < y.firstAt ? -1 : 1));

  // A new column starts the useful way round: newest and most solves first,
  // names A–Z, times fastest first. Clicking it again flips it.
  const sortBy = (key: SessionSortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, direction: s.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "lastAt" || key === "solves" ? "desc" : "asc" },
    );

  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="sessions-heading">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="sessions-heading" className="text-sm font-semibold text-foreground">
          Sessions
        </h2>
        <p className="text-xs text-muted-foreground">
          In this range · click one to filter the page · tick two to compare
        </p>
      </header>

      {comparing.length === 2 && (
        <SessionCompare a={comparing[0]} b={comparing[1]} onClear={() => compareIds.forEach(onToggleCompare)} />
      )}

      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[32rem] text-left text-xs sm:min-w-[40rem]">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th scope="col" className="w-8 py-2 pr-2">
                <span className="sr-only">Compare</span>
              </th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={sort.key === c.key ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
                  className={cn(
                    "py-2 pr-3 font-medium",
                    c.numeric && "text-right",
                    c.wideOnly && "hidden sm:table-cell",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => sortBy(c.key)}
                    className={cn(
                      "inline-flex items-center gap-0.5 hover:text-foreground",
                      sort.key === c.key && "text-foreground",
                    )}
                  >
                    {c.label}
                    {sort.key === c.key &&
                      (sort.direction === "asc" ? (
                        <ArrowUp className="size-3" aria-hidden />
                      ) : (
                        <ArrowDown className="size-3" aria-hidden />
                      ))}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const selected = r.id === selectedId;
              const ticked = compareIds.includes(r.id);
              const full = compareIds.length >= 2 && !ticked;
              return (
                <tr
                  key={r.id}
                  onClick={() => onSelect(selected ? "all" : r.id)}
                  className={cn(
                    "cursor-pointer border-b border-border/50 last:border-0",
                    selected ? "bg-primary/10" : "hover:bg-muted/50",
                  )}
                >
                  <td className="py-2 pr-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="size-3.5 accent-primary align-middle"
                      checked={ticked}
                      disabled={full}
                      title={full ? "Two sessions are already ticked" : undefined}
                      aria-label={`Compare ${r.name}, last solve ${shortDate(r.lastAt)}`}
                      onChange={() => onToggleCompare(r.id)}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(selected ? "all" : r.id);
                      }}
                      className="max-w-[12rem] truncate text-left font-medium text-foreground hover:underline"
                    >
                      {r.name}
                    </button>
                    {r.isActive && (
                      <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-muted-foreground">
                        current
                      </span>
                    )}
                    <span className="block text-[0.65rem] text-muted-foreground sm:hidden">{shortDate(r.lastAt)}</span>
                  </td>
                  <td className="hidden py-2 pr-3 whitespace-nowrap text-muted-foreground sm:table-cell">
                    {shortDate(r.lastAt)}
                  </td>
                  <Num>{r.solves.toLocaleString()}</Num>
                  <Num>{formatAverage(r.mean)}</Num>
                  <Num>{formatAverage(r.best)}</Num>
                  <Num>{formatAverage(r.bestAo5)}</Num>
                  <Num>{formatAverage(r.bestAo12)}</Num>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {sorted.length > COLLAPSED_ROWS && (
          <button type="button" onClick={() => setExpanded((e) => !e)} className="font-medium text-primary hover:underline">
            {expanded ? "Show fewer" : `Show all ${sorted.length} sessions`}
          </button>
        )}
        {selectedId !== "all" && (
          <button type="button" onClick={() => onSelect("all")} className="font-medium text-primary hover:underline">
            Show all sessions again
          </button>
        )}
        {emptySessions > 0 && (
          <span>
            {emptySessions} session{emptySessions === 1 ? " has" : "s have"} no solves in this range.
          </span>
        )}
      </div>
    </section>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return <td className="py-2 pr-3 text-right font-mono tabular-nums text-foreground">{children}</td>;
}

/** Two sessions side by side; the faster of each time is highlighted. */
function SessionCompare({ a, b, onClear }: { a: SessionSummary; b: SessionSummary; onClear: () => void }) {
  const times: { label: string; key: "mean" | "median" | "best" | "bestAo5" | "bestAo12" | "stdDev" }[] = [
    { label: "Mean", key: "mean" },
    { label: "Median", key: "median" },
    { label: "Best", key: "best" },
    { label: "Best Ao5", key: "bestAo5" },
    { label: "Best Ao12", key: "bestAo12" },
    { label: "Spread (σ)", key: "stdDev" },
  ];
  const better = (x: number | null, y: number | null) => x !== null && y !== null && x < y;

  return (
    <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3" data-testid="session-compare">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-foreground">Comparing two sessions</h3>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" aria-hidden />
          Clear
        </button>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th scope="col" className="w-1/3 py-1 text-left font-medium">
              <span className="sr-only">Measure</span>
            </th>
            {[a, b].map((s) => (
              <th key={s.id} scope="col" className="py-1 text-right font-medium text-foreground">
                <span className="block truncate">{s.name}</span>
                <span className="block font-normal text-muted-foreground">
                  {shortDate(s.firstAt)} – {shortDate(s.lastAt)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-border/50">
            <th scope="row" className="py-1 text-left font-normal text-muted-foreground">Solves</th>
            <td className="py-1 text-right font-mono tabular-nums">{a.solves.toLocaleString()}</td>
            <td className="py-1 text-right font-mono tabular-nums">{b.solves.toLocaleString()}</td>
          </tr>
          {times.map((t) => (
            <tr key={t.key} className="border-t border-border/50">
              <th scope="row" className="py-1 text-left font-normal text-muted-foreground">{t.label}</th>
              {[
                [a[t.key], b[t.key]],
                [b[t.key], a[t.key]],
              ].map(([mine, theirs], i) => (
                <td
                  key={i}
                  className={cn(
                    "py-1 text-right font-mono tabular-nums",
                    better(mine, theirs) ? "font-semibold text-success" : "text-foreground",
                  )}
                >
                  {mine === null ? "—" : formatMs(mine)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-border/50">
            <th scope="row" className="py-1 text-left font-normal text-muted-foreground">Time solving</th>
            <td className="py-1 text-right font-mono tabular-nums">{formatDuration(a.timeMs)}</td>
            <td className="py-1 text-right font-mono tabular-nums">{formatDuration(b.timeMs)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
