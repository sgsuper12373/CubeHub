import { describe, expect, it } from "vitest";

import { resolveTokens, THEMES } from "@/themes";
import {
  composite,
  contrastRatio,
  parseColor,
  resolveToken,
} from "@/themes/color";
import { CONTRAST_RULES, SCRIM_MIN } from "@/themes/contrast-rules";

describe("colour maths", () => {
  // Pin the converter to known values so a maths slip can't make every
  // contrast check pass.
  it("converts oklch to the expected sRGB", () => {
    const toHex = (c: ReturnType<typeof parseColor>) =>
      "#" + [c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
    expect(toHex(parseColor("oklch(0.208 0.04 265.8)"))).toBe("#0f172a");
    expect(toHex(parseColor("oklch(0.984 0.003 247.9)"))).toBe("#f8fafc");
    expect(toHex(parseColor("oklch(1 0 0)"))).toBe("#ffffff");
  });

  it("matches published WCAG ratios", () => {
    expect(contrastRatio(parseColor("#000"), parseColor("#fff"))).toBeCloseTo(21, 5);
    expect(contrastRatio(parseColor("#F8FAFC"), parseColor("#0F172A"))).toBeCloseTo(17.06, 1);
    expect(contrastRatio(parseColor("#6B5E4E"), parseColor("#F6F1E7"))).toBeCloseTo(5.59, 1);
  });

  it("parses alpha and composites it", () => {
    const c = parseColor("oklch(1 0 0 / 50%)");
    expect(c.a).toBe(0.5);
    expect(composite(c, parseColor("#000")).r).toBeCloseTo(0.5, 5);
  });

  it("follows var() chains and rejects unknown notations", () => {
    const tokens = { a: "var(--b)", b: "var(--c)", c: "#fff" };
    expect(resolveToken(tokens, "a")).toBe("#fff");
    expect(() => parseColor("rgb(1 2 3)")).toThrow(/Unsupported/);
  });
});

describe.each(THEMES.map((t) => [t.name, t] as const))("%s contrast", (_name, theme) => {
  const tokens = resolveTokens(theme) as Record<string, string>;
  const color = (name: string) => parseColor(resolveToken(tokens, name));

  for (const rule of CONTRAST_RULES) {
    describe(rule.label, () => {
      it.each(rule.pairs.map(([fg, bg]) => [fg, bg]))("--%s on --%s", (fg, bg) => {
        const ratio = contrastRatio(color(fg), color(bg));
        // Message names theme, pair and ratio so a failure is actionable.
        expect(
          ratio,
          `${theme.name}: --${fg} on --${bg} is ${ratio.toFixed(2)}:1, needs ${rule.min}:1`,
        ).toBeGreaterThanOrEqual(rule.min);
      });
    });
  }

  it.each([
    ["black", "#000000"],
    ["white", "#ffffff"],
  ])("--timer-scrim keeps timer digits at 3:1 over a %s background image", (_label, image) => {
    const behindDigits = composite(color("timer-scrim"), parseColor(image));
    const ratio = contrastRatio(color("timer-digits"), behindDigits);
    expect(
      ratio,
      `${theme.name}: digits on scrim over ${image} is ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(SCRIM_MIN);
  });
});
