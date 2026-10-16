/**
 * Theme-aware favicon, Monkeytype-style.
 *
 * The browser draws the tab icon outside the page, so CSS variables can't
 * reach it. Instead we read the current theme colours, draw a simplified flat
 * "CH" tile on a canvas, and point <link rel="icon"> at the PNG data URL.
 * Canvas (not an SVG favicon) so it works in Safari too.
 *
 * Cost: one 64×64 canvas draw on load and on each theme change. No network.
 */

import { BRAND_FALLBACK } from "@/themes/brand";

// Flat monogram on a 32×32 grid. Kept bold so it reads at 16px.
const TILE = "M7 0H25A7 7 0 0 1 32 7V25A7 7 0 0 1 25 32H7A7 7 0 0 1 0 25V7A7 7 0 0 1 7 0Z";
const C_PATH = "M4 7H15V11H8.5V21H15V25H4Z";
const H_PATH = "M17 7H21V14H24V7H28V25H24V18H21V25H17Z";

export const FAVICON_PATHS = { tile: TILE, c: C_PATH, h: H_PATH } as const;

/** Resolve a CSS custom property to a concrete colour string the canvas accepts. */
function resolveColor(token: string, fallback: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token}, ${fallback})`;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value || fallback;
}

export function themeFaviconColors() {
  return {
    tile: resolveColor("--background", BRAND_FALLBACK.background),
    c: resolveColor("--logo-c", resolveColor("--primary", BRAND_FALLBACK.primary)),
    h: resolveColor("--logo-h", resolveColor("--foreground", BRAND_FALLBACK.foreground)),
  };
}

let canvas: HTMLCanvasElement | null = null;

/** Redraw the favicon from the current theme. Safe to call often. */
export function applyThemeFavicon(): void {
  if (typeof document === "undefined") return;
  const { tile, c, h } = themeFaviconColors();

  canvas ??= document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, size, size);
  ctx.scale(size / 32, size / 32);
  ctx.fillStyle = tile;
  ctx.fill(new Path2D(TILE));
  ctx.fillStyle = c;
  ctx.fill(new Path2D(C_PATH));
  ctx.fillStyle = h;
  ctx.fill(new Path2D(H_PATH));
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const href = canvas.toDataURL("image/png");
  // Replace every icon link Next.js rendered so browsers don't keep the static one.
  const links = document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']");
  if (links.length === 0) {
    const link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
    link.href = href;
    return;
  }
  links.forEach((link) => {
    link.type = "image/png";
    link.href = href;
  });
}
