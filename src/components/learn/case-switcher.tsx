"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { Popover } from "@base-ui/react/popover";
import { Check, ChevronsUpDown, Circle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { CaseViewer } from "@/components/learn/case-viewer";
import { FaceletViewer } from "@/components/learn/facelet-viewer";
import type { CaseDiagram } from "@/lib/learn/case-diagram";
import type { CaseOption } from "@/lib/learn/case-options";
import { casePath } from "@/lib/learn/case-route";
import { cn } from "@/lib/utils";

/**
 * A dropdown on the case page that jumps straight to any case of the set, each
 * with its recognition diagram. Type to filter, or show only the unlearned
 * ones; arrow keys move through the list. The diagrams mount on first open and
 * stay mounted (keepMounted), so reopening it doesn't rebuild every cube.
 *
 * Each option links to the case page, keeping the list filters (`query`). In
 * the side panel, `onSelect` swaps the case in place instead.
 */
export function CaseSwitcher({
  puzzle,
  series,
  current,
  options,
  query: filterQuery = "",
  onSelect,
}: {
  puzzle: string;
  series: string;
  current: number;
  options: CaseOption[];
  /** The list filters as "?status=…", carried onto each case's link. */
  query?: string;
  onSelect?: (caseNumber: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState("");
  const [unlearnedOnly, setUnlearnedOnly] = useState(false);
  const unlearnedCount = options.filter((o) => !o.learned).length;
  const listRef = useRef<HTMLDivElement>(null);
  const currentOption = options.find((o) => o.caseNumber === current);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    // The current case always stays, so you can see where you are.
    const matches = options.filter(
      (o) =>
        (!unlearnedOnly || !o.learned || o.caseNumber === current) &&
        (!q ||
          o.heading.toLowerCase().includes(q) ||
          String(o.caseNumber) === q ||
          o.category?.toLowerCase().includes(q)),
    );
    // Group by category in the set's own order; sets without categories get one group.
    const byCategory = new Map<string | null, CaseOption[]>();
    for (const o of matches) {
      const list = byCategory.get(o.category) ?? [];
      list.push(o);
      byCategory.set(o.category, list);
    }
    return [...byCategory];
  }, [options, query, unlearnedOnly, current]);

  // Bring the current case into view each time the list opens.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      listRef.current
        ?.querySelector('[aria-current="page"]')
        ?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const optionLinks = () =>
    Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-case-option]") ?? []);

  const moveFocus = (e: KeyboardEvent, from: HTMLElement | null) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const links = optionLinks();
    if (links.length === 0) return;
    const i = from ? links.indexOf(from as HTMLAnchorElement) : -1;
    const next =
      e.key === "ArrowDown"
        ? links[Math.min(i + 1, links.length - 1)]
        : i <= 0
          ? null
          : links[i - 1];
    if (next) next.focus();
    else listRef.current?.closest("[data-case-switcher]")?.querySelector("input")?.focus();
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setOpened(true);
        else setQuery("");
      }}
    >
      <Popover.Trigger
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2 pl-1.5")}
        aria-label="Jump to another case"
      >
        {currentOption && <CaseThumb diagram={currentOption.diagram} puzzle={puzzle} size={22} />}
        <span className="max-w-40 truncate">Jump to case</span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </Popover.Trigger>
      <Popover.Portal keepMounted>
        <Popover.Positioner align="end" sideOffset={6} className="isolate z-50">
          <Popover.Popup
            data-case-switcher
            className="flex w-[min(22rem,calc(100vw-2rem))] origin-(--transform-origin) flex-col rounded-lg bg-popover text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <div className="space-y-2 border-b border-border/60 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => moveFocus(e, null)}
                  placeholder="Search by name, number or group"
                  aria-label="Search cases"
                  className="pl-7"
                />
              </div>
              <button
                type="button"
                aria-pressed={unlearnedOnly}
                onClick={() => setUnlearnedOnly((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  unlearnedOnly
                    ? "border-primary/40 bg-primary/15 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Circle className="h-3 w-3" />
                Unlearned only
                <span className={cn("tabular-nums", unlearnedOnly ? "text-primary" : "text-muted-foreground/70")}>
                  {unlearnedCount}
                </span>
              </button>
            </div>
            <div
              ref={listRef}
              className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain p-1"
            >
              {opened &&
                groups.map(([category, items]) => (
                  <div key={category ?? "all"} role="group" aria-label={category ?? undefined}>
                    {category && (
                      <p className="sticky top-0 z-10 bg-popover px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {category}
                      </p>
                    )}
                    {items.map((o) => {
                      const isCurrent = o.caseNumber === current;
                      return (
                        <Link
                          key={o.caseNumber}
                          href={casePath(puzzle, series, o.caseNumber) + filterQuery}
                          data-case-option
                          aria-current={isCurrent ? "page" : undefined}
                          onClick={(e) => {
                            setOpen(false);
                            if (onSelect && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
                              e.preventDefault();
                              onSelect(o.caseNumber);
                            }
                          }}
                          onKeyDown={(e) => moveFocus(e, e.currentTarget)}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary/50",
                            isCurrent && "bg-primary/10 text-primary",
                          )}
                        >
                          <CaseThumb diagram={o.diagram} puzzle={puzzle} size={44} />
                          <span className="min-w-0 flex-1 truncate font-medium">{o.heading}</span>
                          {o.learned && (
                            <Check className="h-4 w-4 shrink-0 text-success" aria-label="Learned" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              {opened && groups.length === 0 && (
                <p className="px-2 py-6 text-center text-muted-foreground">No matching cases.</p>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function CaseThumb({ diagram, puzzle, size }: { diagram: CaseDiagram; puzzle: string; size: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-background/60"
      style={{ width: size + 4, height: size + 4 }}
    >
      {diagram.kind === "facelets" ? (
        <FaceletViewer cubeState={diagram.state} size={size} />
      ) : diagram.kind === "none" ? null : (
        <CaseViewer
          {...(diagram.kind === "algorithm"
            ? { algorithm: diagram.moves }
            : { cubeState: diagram.moves })}
          puzzle={puzzle}
          size={size}
          visualization="experimental-2D-LL"
        />
      )}
    </span>
  );
}
