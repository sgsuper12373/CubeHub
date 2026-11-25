/**
 * The command palette's commands and matching (docs/app-shell-plan.md →
 * Command palette). Pure, so the matching is unit-tested; the dialog is
 * components/layout/command-palette.tsx.
 */
import { SHOW_CUBBY } from "@/lib/companion/flag";
import type { LearnNavPuzzle } from "@/lib/learn/public-dal";
import { THEMES as THEME_DEFS } from "@/themes";
import type { ThemePreference } from "@/themes/preference";

export type PaletteGroup = "Pages" | "Learn" | "Cases" | "Cubers" | "Theme";

export type PaletteCommand = {
  id: string;
  label: string;
  group: PaletteGroup;
  /** Extra words that should find it ("pb" finds Stats). */
  keywords?: string;
  hint?: string;
} & ({ href: string } | { theme: ThemePreference });

const PAGES: { label: string; href: string; keywords?: string }[] = [
  { label: "Home", href: "/home", keywords: "start dashboard" },
  { label: "Timer", href: "/timer", keywords: "solve session time" },
  { label: "Daily scramble", href: "/home/daily", keywords: "leaderboard today challenge" },
  { label: "Stats", href: "/stats", keywords: "pb personal best average graph" },
  { label: "Learn", href: "/learn", keywords: "tutorial algorithms oll pll" },
  { label: "Drill Lab", href: "/learn/333/drill", keywords: "practice spaced repetition" },
  { label: "Playground", href: "/playground", keywords: "virtual cube turn" },
  { label: "Clubs", href: "/clubs", keywords: "college community" },
  { label: "People", href: "/people", keywords: "friends follow feed" },
  { label: "Settings", href: "/settings", keywords: "preferences account" },
  // Cubby's settings open over the current page: the way back after switching Cubby off.
  ...(SHOW_CUBBY ? [{ label: "Cubby settings", href: "?cubby=settings", keywords: "companion mascot tour mute" }] : []),
];

/** Every theme the app ships, then "follow the system". */
const THEMES: { theme: ThemePreference; label: string }[] = [
  ...THEME_DEFS.map((t) => ({ theme: t.id as ThemePreference, label: `Theme: ${t.name}` })),
  { theme: "system", label: "Theme: follow the system" },
];

/** Everything the palette knows without a query to the database. */
export function staticCommands(learnNav: LearnNavPuzzle[], username: string | null): PaletteCommand[] {
  const out: PaletteCommand[] = PAGES.map((p) => ({ id: `page:${p.href}`, group: "Pages" as const, ...p }));
  if (username) out.push({ id: "page:profile", group: "Pages", label: "Your profile", href: `/profile/${username}`, keywords: "me account" });
  for (const p of learnNav) {
    for (const s of p.series) {
      out.push({
        id: `learn:${p.puzzle}/${s.slug}`,
        group: "Learn",
        label: `${s.name}`,
        hint: p.name,
        href: `/learn/${p.puzzle}/${s.slug}`,
        keywords: `${p.name} ${s.slug}`,
      });
    }
  }
  for (const t of THEMES) out.push({ id: `theme:${t.theme}`, group: "Theme", label: t.label, theme: t.theme, keywords: "appearance colour color mode" });
  return out;
}

function words(s: string): string[] {
  return s.toLowerCase().split(/[\s/·,-]+/).filter(Boolean);
}

/**
 * Commands whose label or keywords contain every word of the query (as a
 * word prefix), best first: label prefix, then label word prefix, then
 * keyword matches. An empty query lists the pages.
 */
export function matchCommands(commands: PaletteCommand[], query: string, limit = 8): PaletteCommand[] {
  const q = words(query);
  if (q.length === 0) return commands.filter((c) => c.group === "Pages").slice(0, limit);
  const scored: { c: PaletteCommand; score: number }[] = [];
  for (const c of commands) {
    const label = words(c.label);
    const all = [...label, ...words(c.keywords ?? ""), ...words(c.hint ?? "")];
    if (!q.every((w) => all.some((a) => a.startsWith(w)))) continue;
    let score = 0;
    if (c.label.toLowerCase().startsWith(query.trim().toLowerCase())) score += 4;
    score += q.filter((w) => label.some((a) => a.startsWith(w))).length * 2;
    if (c.group === "Pages") score += 1;
    scored.push({ c, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.c.label.localeCompare(b.c.label))
    .slice(0, limit)
    .map((s) => s.c);
}

/**
 * "OLL 33", "pll 4", "oll33": a series slug and a case number, when the slug
 * is one the Learn index lists. Null otherwise (then it's a name search).
 */
export function parseCaseQuery(query: string, learnNav: LearnNavPuzzle[]): { puzzle: string; series: string; number: number } | null {
  const m = query.trim().toLowerCase().match(/^([a-z][a-z0-9-]*?)\s*#?\s*(\d{1,3})$/);
  if (!m) return null;
  for (const p of learnNav) {
    const s = p.series.find((x) => x.slug.toLowerCase() === m[1]);
    if (s) return { puzzle: p.puzzle, series: s.slug, number: Number(m[2]) };
  }
  return null;
}

/** A username-ish query worth looking up: 2–24 of the characters handles allow, an optional "@". */
export function usernameQuery(query: string): string | null {
  const q = query.trim().replace(/^@/, "");
  return /^[A-Za-z0-9_]{2,24}$/.test(q) ? q : null;
}

/**
 * A display-name query ("Riya S"): 2–40 letters, digits, spaces, dots or
 * hyphens, with nothing PostgREST's filter syntax would read as an operator.
 */
export function nameQuery(query: string): string | null {
  const q = query.trim().replace(/^@/, "").replace(/\s+/g, " ");
  return /^[\p{L}\p{N}_ .'-]{2,40}$/u.test(q) && !/[,()*%]/.test(q) ? q : null;
}
