"use client";

import { cn } from "@/lib/utils";

/**
 * A row of mutually exclusive buttons (range, x-axis mode). `short` labels
 * replace the full ones below the `sm` breakpoint, where five have to fit.
 */
export function SegmentedControl({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: string; label: string; short?: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex rounded-md border border-border bg-card p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          aria-label={o.short ? o.label : undefined}
          onClick={() => onChange(o.key)}
          className={cn(
            "whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium transition-colors",
            value === o.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.short ? (
            <>
              <span className="sm:hidden" aria-hidden>{o.short}</span>
              <span className="hidden sm:inline" aria-hidden>{o.label}</span>
            </>
          ) : (
            o.label
          )}
        </button>
      ))}
    </div>
  );
}
