import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyThemeFavicon, themeFaviconColors } from "@/lib/brand/favicon";
import { BRAND_FALLBACK } from "@/themes/brand";

/**
 * jsdom neither resolves var() in computed styles nor implements canvas, so
 * both are stubbed: getComputedStyle resolves `var(--x, fallback)` against a
 * token map the way a browser would, and the 2D context records fills.
 */
let tokens: Record<string, string> = {};

function resolveVar(value: string): string {
  const m = /^var\((--[\w-]+),\s*(.*)\)$/.exec(value);
  if (!m) return value;
  return tokens[m[1]] ?? resolveVar(m[2]);
}

const fills: string[] = [];

beforeEach(() => {
  tokens = {};
  fills.length = 0;
  document.head.innerHTML = "";

  vi.spyOn(window, "getComputedStyle").mockImplementation(
    (el) => ({ color: resolveVar((el as HTMLElement).style.color) }) as CSSStyleDeclaration,
  );
  vi.stubGlobal("Path2D", class {});
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function () {
    const ctx = {
      fillStyle: "",
      clearRect() {},
      scale() {},
      setTransform() {},
      fill() {
        fills.push(ctx.fillStyle);
      },
    };
    return ctx as unknown as CanvasRenderingContext2D;
  } as unknown as HTMLCanvasElement["getContext"]);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,AAAA");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("themeFaviconColors", () => {
  it("falls back to the Slate brand colours when no token resolves", () => {
    expect(themeFaviconColors()).toEqual({
      tile: BRAND_FALLBACK.background,
      c: BRAND_FALLBACK.primary,
      h: BRAND_FALLBACK.foreground,
    });
  });

  it("uses the theme's primary / foreground when no logo tokens are set", () => {
    tokens = { "--background": "rgb(246, 241, 231)", "--primary": "rgb(169, 64, 22)", "--foreground": "rgb(40, 30, 20)" };
    expect(themeFaviconColors()).toEqual({
      tile: "rgb(246, 241, 231)",
      c: "rgb(169, 64, 22)",
      h: "rgb(40, 30, 20)",
    });
  });

  it("prefers --logo-c / --logo-h over primary / foreground", () => {
    tokens = { "--primary": "red", "--foreground": "white", "--logo-c": "blue", "--logo-h": "gold" };
    expect(themeFaviconColors()).toMatchObject({ c: "blue", h: "gold" });
  });
});

describe("applyThemeFavicon", () => {
  it("points every icon link Next rendered at a PNG data URL", () => {
    document.head.innerHTML =
      '<link rel="icon" href="/icon.png" type="image/png" sizes="64x64"><link rel="shortcut icon" href="/x.png"><link rel="apple-touch-icon" href="/apple-icon.png">';
    applyThemeFavicon();

    const icons = document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']");
    expect(icons).toHaveLength(2);
    for (const link of icons) {
      expect(link.href).toMatch(/^data:image\/png;base64,/);
      expect(link.type).toBe("image/png");
    }
    // The apple-touch-icon stays static: home-screen icons are fetched once.
    expect(document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']")!.getAttribute("href")).toBe(
      "/apple-icon.png",
    );
  });

  it("draws tile, C and H in the theme colours", () => {
    applyThemeFavicon();
    expect(fills).toEqual([BRAND_FALLBACK.background, BRAND_FALLBACK.primary, BRAND_FALLBACK.foreground]);
  });

  it("adds an icon link when the page has none", () => {
    applyThemeFavicon();
    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    expect(link?.href).toMatch(/^data:image\/png;base64,/);
  });
});
