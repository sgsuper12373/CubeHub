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

  it("falls back to system for missing or unknown values", () => {
    expect(parseThemePreference(undefined)).toBe("system");
    expect(parseThemePreference("")).toBe("system");
    expect(parseThemePreference("neon")).toBe("system");
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
    // What the server renders for every visitor: the default, Slate.
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

  it("follows the OS when there's no cookie or an unknown value", () => {
    run(null, true);
    expect(root.dataset.theme).toBe("paper");
    expect(root.classList.contains("dark")).toBe(false);
    root.setAttribute("data-theme", "slate");
    run("neon", true);
    expect(root.dataset.theme).toBe("paper");
  });

  it("applies an explicit or legacy theme from the cookie, whatever the OS says", () => {
    run("paper", false);
    expect(root.dataset.theme).toBe("paper");
    expect(root.classList.contains("dark")).toBe(false);
    run("slate", true);
    expect(root.dataset.theme).toBe("slate");
    expect(root.classList.contains("dark")).toBe(true);
    run("light", false);
    expect(root.dataset.theme).toBe("paper");
    expect(root.classList.contains("dark")).toBe(false);
    run("dark", true);
    expect(root.dataset.theme).toBe("slate");
    expect(root.classList.contains("dark")).toBe(true);
  });

  it("treats inherited object keys as unknown values", () => {
    run("constructor", true);
    expect(root.dataset.theme).toBe("paper");
  });
});
