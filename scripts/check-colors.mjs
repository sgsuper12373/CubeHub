// Fail on new hardcoded colours in .ts/.tsx files (step 3, docs/design-tokens.md).
//
//   node scripts/check-colors.mjs [base]
//   npm run check:colors               # base defaults to origin/main
//   npm run check:colors -- HEAD~1
//
// Only lines *added* since the merge base with <base> are checked (committed
// or not), so touching an old file doesn't force migrating all of it. What
// fails:
//   1. Raw Tailwind palette classes:   bg-slate-800, text-teal-400, from-blue-400
//   2. White/black classes:            text-white, bg-white/5, border-black/10
//   3. Arbitrary colour values:        bg-[#fff], text-[rgb(...)], fill-[oklch(...)]
//   4. Hex literals:                   "#EAB308", `#111827`
//   5. Literal colour functions:       rgba(0, 229, 196, 0.3), hsl(200 50% 50%)
//
// Use role tokens instead: bg-card, text-foreground, border-border,
// text-primary, var(--sticker-u), color-mix(in oklch, var(--primary) 20%,
// transparent). Canvas code: readTokenRgb() in src/lib/token-color.ts.
//
// Exempt: src/themes/** (where raw values belong), tests, and ImageResponse
// files (src/app/icon.tsx, src/app/opengraph-image.tsx), which cannot read
// CSS variables. For a genuine one-off, put `color-guard-allow: <reason>` in
// a comment on the same line or the line above.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const PREFIX =
  "bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|fill|stroke|from|via|to|shadow|outline|divide|placeholder|decoration|caret|accent";

/** @type {ReadonlyArray<{ kind: string, re: RegExp, hint: string }>} */
const RULES = [
  {
    kind: "palette class",
    re: new RegExp(`(?<![\\w-])(?:${PREFIX})-(?:${PALETTE})-\\d{2,3}\\b`, "g"),
    hint: "use a role token utility (bg-card, text-primary, text-muted-foreground, …)",
  },
  {
    kind: "white/black class",
    re: new RegExp(`(?<![\\w-])(?:${PREFIX})-(?:white|black)(?![\\w-])`, "g"),
    hint: "use text-foreground / bg-background / border-border (or /opacity on them)",
  },
  {
    kind: "arbitrary colour",
    re: /-\[(?:#|(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\()/g,
    hint: "use a token utility, or var(--token) / color-mix(in oklch, var(--token) …)",
  },
  {
    kind: "hex literal",
    // `_` may follow: Tailwind arbitrary values use it for spaces.
    re: /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9A-Za-z-])/g,
    hint: "use var(--token); add the colour to src/themes/ if no role fits",
  },
  {
    kind: "colour function",
    // No \b: in Tailwind arbitrary values `_` (a word char) precedes it.
    re: /(?<![A-Za-z0-9-])(?:rgba?|hsla?|oklch|oklab)\(\s*[\d.]/g,
    hint: "use var(--token) or color-mix(); canvas code: readTokenRgb()",
  },
];

const EXEMPT = [
  /^src\/themes\//,
  /^tests\//,
  /^src\/app\/icon\.tsx$/,
  /^src\/app\/opengraph-image\.tsx$/,
];

const ALLOW = "color-guard-allow";

/**
 * Every raw colour on one line of source.
 * @param {string} line
 * @returns {{ kind: string, match: string, hint: string }[]}
 */
export function findColorViolations(line) {
  const trimmed = line.trim();
  // Comments may mention colours (e.g. "#0F172A was the old value").
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
    return [];
  }
  const found = [];
  for (const { kind, re, hint } of RULES) {
    for (const m of line.matchAll(re)) found.push({ kind, match: m[0], hint });
  }
  return found;
}

/** @param {string} path */
export function isExempt(path) {
  return !/\.(ts|tsx)$/.test(path) || EXEMPT.some((re) => re.test(path));
}

/**
 * Parse `git diff -U0` output into added lines.
 * @param {string} diff
 * @returns {{ file: string, line: number, text: string }[]}
 */
export function addedLines(diff) {
  const out = [];
  let file = null;
  let lineNo = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      file = raw === "+++ /dev/null" ? null : raw.slice(6); // strip "+++ b/"
    } else if (raw.startsWith("@@")) {
      const m = /\+(\d+)/.exec(raw);
      lineNo = m ? Number(m[1]) : 0;
    } else if (raw.startsWith("+") && file) {
      out.push({ file, line: lineNo, text: raw.slice(1) });
      lineNo++;
    }
  }
  return out;
}

/**
 * @param {{ file: string, line: number, text: string }[]} lines
 * @param {(file: string) => string[] | null} readFile  current file contents, for allow comments
 */
export function checkLines(lines, readFile) {
  const cache = new Map();
  const problems = [];
  for (const { file, line, text } of lines) {
    if (isExempt(file)) continue;
    const violations = findColorViolations(text);
    if (violations.length === 0) continue;
    if (!cache.has(file)) cache.set(file, readFile(file));
    const source = cache.get(file);
    const previous = source?.[line - 2] ?? "";
    if (text.includes(ALLOW) || previous.includes(ALLOW)) continue;
    for (const v of violations) problems.push({ file, line, ...v });
  }
  return problems;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function main() {
  const base = process.argv[2] || process.env.COLOR_GUARD_BASE || "origin/main";
  let mergeBase;
  try {
    mergeBase = git(["merge-base", base, "HEAD"]).trim();
  } catch {
    console.error(`[check-colors] cannot find merge base with "${base}". Fetch it first (CI: fetch-depth: 0).`);
    process.exit(2);
  }

  // Diffing against the merge base (not base...HEAD) also covers uncommitted
  // edits to tracked files when run locally.
  const diff = git(["diff", "-U0", "--no-color", "--diff-filter=AM", mergeBase, "--", "*.ts", "*.tsx"]);
  const problems = checkLines(addedLines(diff), (file) =>
    existsSync(file) ? readFileSync(file, "utf8").split("\n") : null,
  );

  if (problems.length === 0) {
    console.log(`[check-colors] OK: no new hardcoded colours since ${base} (${mergeBase.slice(0, 7)})`);
    return;
  }
  console.error(`[check-colors] ${problems.length} new hardcoded colour(s) since ${base}:\n`);
  for (const p of problems) {
    console.error(`  ${p.file}:${p.line}  ${p.match}  (${p.kind})\n      → ${p.hint}`);
  }
  console.error(`\nSee docs/design-tokens.md. For a genuine exception add a "${ALLOW}: <reason>" comment.`);
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
