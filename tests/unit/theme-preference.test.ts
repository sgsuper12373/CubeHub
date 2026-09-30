import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { THEME_INIT_SCRIPT } from "@/themes/init-script";
import { parseThemePreference, resolveThemeId, THEME_COOKIE } from "@/themes/preference";

describe("parseThemePreference", () => {
  it("accepts theme ids and system", () => {
    expect(parseThemePreference("slate")).toBe("slate");
    expect(parseThemePreference("paper")).toBe("paper");
    expect(parseThemePreference("system")).toBe("system");
  });

  it("maps the pre-step-3 cookie values", () => {
    expect(parseThemePreference("dark")).toBe("slate");
    expect(parseThemePreference("light")).toBe("paper");
  });

  it("falls back to the default (Slate) for missing or unknown values", () => {
    expect(parseThemePreference(undefined)).toBe("slate");
    expect(parseThemePreference("")).toBe("slate");
    expect(parseThemePreference("neon")).toBe("slate");
  });
});

describe("resolveThemeId", () => {
  it("resolves system from the OS mode, or to the default on the server", () => {
    expect(resolveThemeId("system", "light")).toBe("paper");
    expect(resolveThemeId("system", "dark")).toBe("slate");
    expect(resolveThemeId("system")).toBe("slate");
    expect(resolveThemeId("paper", "dark")).toBe("paper");
  });
});

describe("THEME_INIT_SCRIPT", () => {
  const root = document.documentElement;

  function run(cookie: string | null, prefersLight: boolean) {
    document.cookie = `${THEME_COOKIE}=; max-age=0`;
    if (cookie !== null) document.cookie = `${THEME_COOKIE}=${cookie}`;
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: prefersLight })),
    );
    // Same as the browser executing the inline <script>.
    new Function(THEME_INIT_SCRIPT)();
  }

  beforeEach(() => {
    // What the server renders for "system": the default, Slate.
    root.setAttribute("data-theme", "slate");
    root.classList.add("dark");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applies Paper for system + OS light", () => {
    run("system", true);
    expect(root.dataset.theme).toBe("paper");
    expect(root.classList.contains("dark")).toBe(false);
  });

  it("keeps Slate for system + OS dark", () => {
    run("system", false);
    expect(root.dataset.theme).toBe("slate");
    expect(root.classList.contains("dark")).toBe(true);
  });

  it("does nothing for an explicit theme or no cookie — the server already rendered it", () => {
    run("slate", true);
    expect(root.dataset.theme).toBe("slate");
    run(null, true);
    expect(root.dataset.theme).toBe("slate");
    expect(root.classList.contains("dark")).toBe(true);
  });
});
