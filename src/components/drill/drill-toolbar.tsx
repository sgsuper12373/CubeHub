"use client";

import Link from "next/link";
import { Keyboard, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import type { DrillSubset } from "@/lib/drill/dal";
import type { DrillOrder } from "@/lib/drill/types";
import { cn } from "@/lib/utils";

/** The five drill options. Their state lives in DrillLab (and the drill store). */
export interface DrillOptions {
  hideAlg: boolean;
  randomizeAuf: boolean;
  showSetup: boolean;
  visualization: "2D" | "3D";
}

type OptionKey = "hideAlg" | "randomizeAuf" | "showSetup" | "twoD";

const OPTION_ROWS: { key: OptionKey; label: string }[] = [
  { key: "hideAlg", label: "Hide algorithm until done" },
  { key: "randomizeAuf", label: "Random AUF" },
  { key: "showSetup", label: "Show setup" },
  { key: "twoD", label: "2D view" },
];

/**
 * Chips under the toolbar: options that are on and not on by default, so a
 * changed drill is visible without opening the popover. Hide algorithm and
 * Random AUF are on by default, so they never show here.
 */
const CHIPS: { key: OptionKey; label: string }[] = [
  { key: "showSetup", label: "Setup shown" },
  { key: "twoD", label: "2D" },
];

function isOn(options: DrillOptions, key: OptionKey): boolean {
  return key === "twoD" ? options.visualization === "2D" : options[key];
}

const SHORTCUTS: [string, string][] = [
  ["Space", "start, stop, next case"],
  ["Any key", "stop a running rep"],
  ["Esc", "abandon the rep"],
  ["1", "+2 on the last rep"],
  ["2", "DNF on the last rep"],
  ["D", "delete the last rep"],
];

const segment = "flex shrink-0 items-center rounded-lg border border-border p-0.5";

function segmentItem(active: boolean) {
  return cn(
    "rounded-md px-2.5 py-1 text-sm whitespace-nowrap",
    active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
  );
}

export function DrillToolbar({
  puzzle,
  subsets,
  activeSet,
  caseCount,
  scopeInfo,
  order,
  onOrderChange,
  options,
  onOptionChange,
  optionsOpen,
  onOptionsOpenChange,
}: {
  puzzle: string;
  subsets: DrillSubset[];
  /** Subset slug, "all", or "custom". */
  activeSet: string;
  caseCount: number;
  scopeInfo: { scope: "learned" | "all"; learned: number; total: number } | null;
  order: DrillOrder;
  onOrderChange: (order: DrillOrder) => void;
  options: DrillOptions;
  onOptionChange: (key: OptionKey, on: boolean) => void;
  optionsOpen: boolean;
  onOptionsOpenChange: (open: boolean) => void;
}) {
  const setHref = (slug: string) => `/learn/${puzzle}/drill?set=${encodeURIComponent(slug)}`;
  const chips = CHIPS.filter((c) => isOn(options, c.key));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
        <nav className={cn(segment, "max-w-full min-w-0 overflow-x-auto")} aria-label="Drill set">
          {subsets.map((s) => (
            <Link
              key={s.slug}
              href={setHref(s.slug)}
              aria-current={activeSet === s.slug ? "page" : undefined}
              className={segmentItem(activeSet === s.slug)}
            >
              {s.name}
            </Link>
          ))}
          <Link
            href={`${setHref("all")}&order=weakest`}
            aria-current={activeSet === "all" ? "page" : undefined}
            className={segmentItem(activeSet === "all")}
          >
            All cases
          </Link>
          {activeSet === "custom" && (
            <span aria-current="page" className={segmentItem(true)}>
              Custom · {caseCount}
            </span>
          )}
        </nav>

        {scopeInfo && scopeInfo.learned > 0 && (
          <div className={segment} role="group" aria-label="Which cases">
            {(["learned", "all"] as const).map((s) => (
              <Link
                key={s}
                href={`${setHref(activeSet)}&scope=${s}`}
                aria-current={scopeInfo.scope === s ? "true" : undefined}
                className={segmentItem(scopeInfo.scope === s)}
              >
                {s === "learned" ? `Learned · ${scopeInfo.learned}` : `All · ${scopeInfo.total}`}
              </Link>
            ))}
          </div>
        )}

        <div className={segment} role="group" aria-label="Case order">
          {(["weakest", "random"] as const).map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={order === o}
              onClick={() => onOrderChange(o)}
              className={segmentItem(order === o)}
            >
              {o === "weakest" ? "Weakest first" : "Random"}
            </button>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Popover open={optionsOpen} onOpenChange={onOptionsOpenChange}>
            <PopoverTrigger
              render={
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Drill options" title="Drill options">
                  <Settings2 />
                </Button>
              }
            />
            <PopoverContent align="end" className="w-64 gap-3 p-4">
              <PopoverTitle className="text-sm">Drill options</PopoverTitle>
              {OPTION_ROWS.map((row) => (
                <label key={row.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={isOn(options, row.key)}
                    onChange={(e) => onOptionChange(row.key, e.target.checked)}
                  />
                  {row.label}
                </label>
              ))}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger
              render={
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Keyboard shortcuts" title="Keyboard shortcuts">
                  <Keyboard />
                </Button>
              }
            />
            <PopoverContent align="end" className="w-64 gap-2 p-4">
              <PopoverTitle className="text-sm">Keyboard shortcuts</PopoverTitle>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                {SHORTCUTS.map(([key, what]) => (
                  <div key={key} className="contents">
                    <dt>
                      <kbd className="rounded border border-border px-1.5 font-mono text-xs text-foreground">{key}</kbd>
                    </dt>
                    <dd className="text-muted-foreground">{what}</dd>
                  </div>
                ))}
              </dl>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Options in use">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onOptionsOpenChange(true)}
              className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-xs text-primary hover:bg-primary/10"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export type { OptionKey as DrillOptionKey };
