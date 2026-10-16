import { afterEach, describe, expect, it, vi } from "vitest";

import { followSystemTheme } from "@/lib/theme";
import { THEME_COOKIE } from "@/themes/preference";

/** A matchMedia stub whose "light" answer the test can flip. */
function stubScheme(light: boolean) {
  let onChange: (() => void) | undefined;
  const query = {
    get matches() {
      return light;
    },
    addEventListener: (_: string, cb: () => void) => (onChange = cb),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("matchMedia", () => query);
  return {
    query,
    flip(next: boolean) {
      light = next;
      onChange?.();
    },
  };
}

function setCookie(value: string) {
  document.cookie = `${THEME_COOKIE}=${value}; path=/`;
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.className = "";
});

describe("followSystemTheme", () => {
  it("re-applies the theme when the OS scheme flips and the preference is system", () => {
    setCookie("system");
    const scheme = stubScheme(false);
    const stop = followSystemTheme();

    scheme.flip(true);
    expect(document.documentElement.dataset.theme).toBe("paper");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    scheme.flip(false);
    expect(document.documentElement.dataset.theme).toBe("slate");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    stop();
    expect(scheme.query.removeEventListener).toHaveBeenCalled();
  });

  it("leaves an explicit theme alone", () => {
    setCookie("slate");
    document.documentElement.dataset.theme = "slate";
    const scheme = stubScheme(false);
    followSystemTheme();

    scheme.flip(true);
    expect(document.documentElement.dataset.theme).toBe("slate");
  });
});
