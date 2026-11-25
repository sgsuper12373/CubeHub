import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

import { CUBBY_CONTENT } from "@/content/cubby";
import { contentProblems } from "@/lib/companion/content";
import { COMPANION_PAGES } from "@/lib/companion/pages";

/** Every `data-tour` value written literally in src/ (plus the timer's panel template). */
function markers(): Set<string> {
  const out = execFileSync("grep", ["-rhoE", 'data-tour="[a-z0-9-]+"', "src"], { encoding: "utf8" });
  const found = new Set(out.split("\n").filter(Boolean).map((m) => m.slice('data-tour="'.length, -1)));
  // layout-shell.tsx: data-tour={`timer-panel-${cell.i}`} for each timer panel.
  for (const panel of ["scramble", "preview", "timer", "stats", "trend", "solves"]) found.add(`timer-panel-${panel}`);
  // algorithm-case-list.tsx passes the first card's marker as a prop.
  found.add("learn-case-card");
  return found;
}

describe("Cubby's content files", () => {
  it("has one valid file for each beta page", () => {
    for (const page of COMPANION_PAGES) {
      const content = CUBBY_CONTENT[page];
      expect(content, page).toBeDefined();
      expect(contentProblems(content), page).toEqual([]);
      expect(content!.page).toBe(page);
    }
  });

  it("points every tour step at a marker that exists", () => {
    const known = markers();
    for (const content of Object.values(CUBBY_CONTENT)) {
      for (const step of content!.tour) {
        if (step.target !== null) expect(known, `${content!.page}/${step.id} → ${step.target}`).toContain(step.target);
      }
    }
  });

  it("keeps tours short (5–8 steps) and lines short", () => {
    for (const content of Object.values(CUBBY_CONTENT)) {
      expect(content!.tour.length).toBeGreaterThanOrEqual(4);
      expect(content!.tour.length).toBeLessThanOrEqual(8);
      for (const s of content!.tour) expect(s.body.length, s.id).toBeLessThanOrEqual(140);
      for (const g of content!.greetings) expect(g.line.length).toBeLessThanOrEqual(100);
    }
  });

  it("never guilt-trips", () => {
    const all = JSON.stringify(Object.values(CUBBY_CONTENT)).toLowerCase();
    for (const word of ["streak is in danger", "don't lose", "you missed", "lazy", "shame", "hurry"]) expect(all).not.toContain(word);
  });
});
