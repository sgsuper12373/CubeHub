import { describe, expect, it } from "vitest";

import { base, THEMES } from "@/themes";
import { themesToCss } from "@/themes/css";
import type { ThemeDefinition } from "@/themes/types";

describe("theme CSS generation", () => {
  it("matches the checked-in src/themes/themes.generated.css", async () => {
    // Run `npx vitest run -u` after editing a theme to regenerate the file.
    await expect(themesToCss(base, THEMES)).toMatchFileSnapshot(
      "../../src/themes/themes.generated.css",
    );
  });

  it("emits the base before any theme so [data-theme] wins on equal specificity", () => {
    const css = themesToCss(base, THEMES);
    const rootAt = css.indexOf(":root {");
    for (const theme of THEMES) {
      expect(css.indexOf(`[data-theme="${theme.id}"]`)).toBeGreaterThan(rootAt);
    }
  });

  it("sets color-scheme from each theme's mode", () => {
    const css = themesToCss(base, THEMES);
    for (const theme of THEMES) {
      const block = css.slice(css.indexOf(`[data-theme="${theme.id}"]`));
      expect(block.slice(0, block.indexOf("}"))).toContain(`color-scheme: ${theme.mode};`);
    }
  });

  it("rejects values that could escape the declaration", () => {
    const evil = {
      ...THEMES[0],
      id: "evil",
      tokens: { ...THEMES[0].tokens, background: "red; } body { display: none" },
    } satisfies ThemeDefinition;
    expect(() => themesToCss(base, [evil])).toThrow(/Unsafe value/);
  });

  it("rejects duplicate and malformed ids", () => {
    expect(() => themesToCss(base, [THEMES[0], THEMES[0]])).toThrow(/Duplicate/);
    expect(() => themesToCss(base, [{ ...THEMES[0], id: 'x"]' }])).toThrow(/Invalid theme id/);
  });
});
