import { describe, expect, it } from "vitest";

import { addedLines, checkLines, findColorViolations, isExempt } from "../../scripts/check-colors.mjs";

const kinds = (line: string) =>
  (findColorViolations(line) as { kind: string; match: string }[]).map((v) => `${v.kind}: ${v.match}`);

describe("findColorViolations", () => {
  it.each([
    ['className="bg-slate-800 p-4"', "palette class: bg-slate-800"],
    ['className="hover:text-teal-400"', "palette class: text-teal-400"],
    ['"from-primary to-blue-400"', "palette class: to-blue-400"],
    ['className="border-white/5 text-white"', "white/black class: border-white"],
    ['className="text-black"', "white/black class: text-black"],
    ['className="bg-[#fff]"', "arbitrary colour: -[#"],
    ['const C = { U: "#EAB308" };', "hex literal: #EAB308"],
    ["ctx.strokeStyle = `rgba(20, 184, 166, ${a})`;", "colour function: rgba(2"],
    ['style={{ color: "hsl(200 50% 50%)" }}', "colour function: hsl(2"],
  ])("flags %s", (line, expected) => {
    expect(kinds(line)).toContain(expected);
  });

  it.each([
    'className="bg-card text-foreground border-border"',
    'className="bg-primary/20 text-primary-foreground ring-ring/50"',
    'className="bg-accent-2/10 text-muted-foreground"',
    'className="shadow-[0_0_20px_color-mix(in_oklch,var(--primary)_15%,transparent)]"',
    'style={{ fill: "var(--sticker-u)" }}',
    "ctx.fillStyle = `rgb(${r} ${g} ${b} / ${a})`;",
    'className="whitespace-nowrap"',
    "// was #0F172A before the theme refactor",
    ' * Hex anchors: #0F172A',
    '<a href="#features">',
  ])("allows %s", (line) => {
    expect(kinds(line)).toEqual([]);
  });
});

describe("isExempt", () => {
  it("exempts theme sources, tests, ImageResponse files and non-TS files", () => {
    expect(isExempt("src/themes/paper.ts")).toBe(true);
    expect(isExempt("tests/unit/x.test.ts")).toBe(true);
    expect(isExempt("src/app/opengraph-image.tsx")).toBe(true);
    expect(isExempt("src/app/globals.css")).toBe(true);
    expect(isExempt("src/components/learn/puzzle-card.tsx")).toBe(false);
    expect(isExempt("src/lib/token-color.ts")).toBe(false);
  });
});

describe("diff scanning", () => {
  const diff = [
    "diff --git a/src/a.tsx b/src/a.tsx",
    "--- a/src/a.tsx",
    "+++ b/src/a.tsx",
    "@@ -10,0 +11,3 @@",
    '+<div className="bg-card" />',
    '+<div className="bg-red-500" />',
    '+<div className="text-white" /> {/* color-guard-allow: mask needs pure white */}',
    "--- a/src/themes/slate.ts",
    "+++ b/src/themes/slate.ts",
    "@@ -1,0 +2 @@",
    '+  background: "#0f172a",',
  ].join("\n");

  it("reads added lines with their line numbers", () => {
    expect(addedLines(diff).map((l: { file: string; line: number }) => `${l.file}:${l.line}`)).toEqual([
      "src/a.tsx:11",
      "src/a.tsx:12",
      "src/a.tsx:13",
      "src/themes/slate.ts:2",
    ]);
  });

  it("reports only unexempted, unallowed violations", () => {
    const problems = checkLines(addedLines(diff), () => null);
    expect(problems.map((p: { file: string; line: number; match: string }) => `${p.file}:${p.line} ${p.match}`)).toEqual([
      "src/a.tsx:12 bg-red-500",
    ]);
  });

  it("honours an allow comment on the line above", () => {
    const lines = [{ file: "src/b.tsx", line: 2, text: 'const INK = "#000";' }];
    const source = ["// color-guard-allow: canvas export needs literal black", 'const INK = "#000";'];
    expect(checkLines(lines, () => source)).toEqual([]);
  });
});
