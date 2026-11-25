"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { LearnNavPuzzle } from "@/lib/learn/public-dal";
import { matchCommands, nameQuery, parseCaseQuery, staticCommands, usernameQuery, type PaletteCommand } from "@/lib/palette";
import { createClient } from "@/lib/supabase/client";
import { setTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useOverlayLock } from "@/stores/overlay-store";
import { usePaletteStore } from "@/stores/palette-store";
import { useSidebarStore } from "@/stores/sidebar-store";

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
}

/** Cases and cubers found in the database for the current query. */
async function searchDatabase(query: string, learnNav: LearnNavPuzzle[]): Promise<PaletteCommand[]> {
  const supabase = createClient();
  const published = new Map(learnNav.flatMap((p) => p.series.map((s) => [`${p.puzzle}/${s.slug}`, { puzzle: p, series: s }])));
  const out: PaletteCommand[] = [];

  const byNumber = parseCaseQuery(query, learnNav);
  const term = query.trim().replace(/[%_,()]/g, " ").trim();
  const cases = byNumber
    ? supabase
        .from("algorithm_cases")
        .select("puzzle_type, subset, case_number, name, description")
        .eq("puzzle_type", byNumber.puzzle)
        .eq("subset", byNumber.series)
        .eq("case_number", byNumber.number)
        .limit(1)
    : term.length >= 2
      ? supabase
          .from("algorithm_cases")
          .select("puzzle_type, subset, case_number, name, description")
          .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
          .not("case_number", "is", null)
          .limit(6)
      : null;
  // Cubers by handle prefix or by display name (a friend is often searched by name).
  const handle = usernameQuery(query);
  const name = nameQuery(query);
  const people = handle || name
    ? supabase
        .from("profiles")
        .select("username, display_name")
        .or(
          [handle && `username.ilike.${handle}%`, name && `display_name.ilike."*${name}*"`]
            .filter(Boolean)
            .join(","),
        )
        .limit(5)
    : null;

  const [c, p] = await Promise.all([cases, people]);
  for (const row of (c?.data ?? []) as { puzzle_type: string; subset: string; case_number: number; name: string | null; description: string | null }[]) {
    const where = published.get(`${row.puzzle_type}/${row.subset}`);
    if (!where) continue; // unpublished series
    const title = row.name?.trim() || `${where.series.name} ${row.case_number}`;
    out.push({
      id: `case:${row.puzzle_type}/${row.subset}/${row.case_number}`,
      group: "Cases",
      label: title,
      hint: `${where.puzzle.name} ${where.series.name} #${row.case_number}`,
      href: `/learn/${encodeURIComponent(row.puzzle_type)}/${encodeURIComponent(row.subset)}/${row.case_number}`,
    });
  }
  for (const row of (p?.data ?? []) as { username: string; display_name: string | null }[]) {
    out.push({
      id: `cuber:${row.username}`,
      group: "Cubers",
      label: row.display_name?.trim() ? `${row.display_name} (@${row.username})` : `@${row.username}`,
      href: `/profile/${row.username}`,
    });
  }
  return out;
}

/**
 * Ctrl/⌘+K (docs/app-shell-plan.md → Command palette): go to any page or
 * Learn series, open a case by name or number ("Gb perm", "OLL 33"), find a
 * cuber by username, switch the theme. Never opens while a solve is under way
 * (the timer's sidebar lock), and takes the overlay lock while open so Space
 * can't reach the timer behind it.
 */
export function CommandPalette({ learnNav, username }: { learnNav: LearnNavPuzzle[]; username: string | null }) {
  const open = usePaletteStore((s) => s.open);
  const setOpen = usePaletteStore((s) => s.setOpen);
  useOverlayLock(open);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "k") return;
      if (useSidebarStore.getState().shortcutsLocked) return;
      if (!usePaletteStore.getState().open && isTyping(e.target)) return;
      e.preventDefault();
      setOpen(!usePaletteStore.getState().open);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-card shadow-xl outline-none transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <Dialog.Title className="sr-only">Search CuberHub</Dialog.Title>
          {open && <PaletteBody learnNav={learnNav} username={username} onClose={() => setOpen(false)} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PaletteBody({ learnNav, username, onClose }: { learnNav: LearnNavPuzzle[]; username: string | null; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ query: string; items: PaletteCommand[] }>({ query: "", items: [] });
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const commands = useMemo(() => staticCommands(learnNav, username), [learnNav, username]);

  // Database results, debounced; stale answers are dropped by comparing the query.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let live = true;
    const t = setTimeout(() => {
      void searchDatabase(q, learnNav)
        .catch(() => [])
        .then((items) => {
          if (live) setFound({ query: q, items });
        });
    }, 180);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query, learnNav]);

  const fromDb = found.query === query.trim() ? found.items : [];
  const results = [...matchCommands(commands, query), ...fromDb.filter((d) => !commands.some((c) => c.id === d.id))];
  const current = Math.min(active, Math.max(0, results.length - 1));

  const run = (c: PaletteCommand) => {
    onClose();
    if ("theme" in c) setTheme(c.theme);
    else router.push(c.href);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && results[current]) {
              e.preventDefault();
              run(results[current]);
            }
          }}
          placeholder="Pages, cases (OLL 33, Gb perm), cubers, themes…"
          role="combobox"
          aria-expanded
          aria-controls="palette-results"
          aria-activedescendant={results[current] ? `palette-${current}` : undefined}
          aria-label="Search CuberHub"
          className="h-12 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
        />
        <kbd className="hidden rounded border border-border px-1.5 text-[11px] text-muted-foreground sm:inline">Esc</kbd>
      </div>
      <ul id="palette-results" role="listbox" ref={listRef} aria-label="Results" className="max-h-[50vh] overflow-y-auto p-1.5">
        {results.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing found.</li>
        ) : (
          results.map((c, i) => (
            <li
              key={c.id}
              id={`palette-${i}`}
              role="option"
              aria-selected={i === current}
              onPointerMove={() => setActive(i)}
              onClick={() => run(c)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm",
                i === current ? "bg-muted text-foreground" : "text-foreground/90",
              )}
            >
              <span className="truncate">{c.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{c.hint ?? c.group}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
