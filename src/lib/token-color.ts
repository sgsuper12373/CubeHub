/**
 * Canvas code can't use CSS variables directly, and needs alpha variants of a
 * colour. This resolves a theme token (any CSS colour syntax, e.g. oklch) to
 * sRGB bytes by painting one pixel, so callers can build `rgb(r g b / a)`
 * strings that follow the active theme. Client-only.
 */
export type Rgb = readonly [number, number, number];

let probe: CanvasRenderingContext2D | null = null;

export function readTokenRgb(token: string, el: Element = document.documentElement): Rgb {
  if (!probe) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    probe = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!probe) return [0, 0, 0];
  const value = getComputedStyle(el).getPropertyValue(`--${token}`).trim();
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = value;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** `rgb(r g b / alpha)` for a colour read with {@link readTokenRgb}. */
export function withAlpha([r, g, b]: Rgb, alpha: number): string {
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

/**
 * Call `onChange` whenever the theme on <html> changes (data-theme or the
 * `dark` class). Returns an unsubscribe function.
 */
export function observeTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
  });
  return () => observer.disconnect();
}
