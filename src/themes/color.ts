/**
 * Just enough colour maths for the theme contrast test: parse the notations
 * themes use (hex, oklch), resolve `var(--token)` references, composite alpha,
 * and compute WCAG 2 contrast ratios. No dependencies.
 */

/** sRGB channels, gamma-encoded, 0..1, plus alpha 0..1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function parseHex(hex: string): Rgba {
  let h = hex.slice(1);
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
}

function parseNumber(raw: string): number {
  return raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw);
}

/** oklch → OKLab → linear sRGB (Björn Ottosson's matrices) → gamma sRGB. */
function parseOklch(body: string): Rgba {
  const [channels, alpha] = body.split("/").map((s) => s.trim());
  const [lRaw, cRaw, hRaw] = channels.split(/\s+/);
  const L = parseNumber(lRaw);
  const C = parseFloat(cRaw);
  const H = (parseFloat(hRaw) * Math.PI) / 180;
  const A = C * Math.cos(H);
  const B = C * Math.sin(H);

  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return {
    r: toGamma(clamp01(r)),
    g: toGamma(clamp01(g)),
    b: toGamma(clamp01(b)),
    a: alpha === undefined ? 1 : parseNumber(alpha),
  };
}

/** Parse a literal colour. Throws on anything else, so an unsupported notation fails loudly. */
export function parseColor(value: string): Rgba {
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{3,8}$/.test(v)) return parseHex(v);
  const oklch = /^oklch\((.+)\)$/.exec(v);
  if (oklch) return parseOklch(oklch[1]);
  throw new Error(`Unsupported colour: ${value}`);
}

/**
 * Follow `var(--x)` references through a token map until a literal remains,
 * e.g. timer-hold → var(--destructive) → oklch(...).
 */
export function resolveToken(tokens: Record<string, string>, name: string): string {
  let value = tokens[name];
  for (let depth = 0; depth < 10; depth++) {
    if (value === undefined) throw new Error(`Unknown token --${name}`);
    const ref = /^var\(--([\w-]+)\)$/.exec(value.trim());
    if (!ref) return value;
    value = tokens[ref[1]];
  }
  throw new Error(`var() chain too deep for --${name}`);
}

/** Paint `top` over an opaque `bottom`, in gamma space as browsers do. */
export function composite(top: Rgba, bottom: Rgba): Rgba {
  const mix = (t: number, b: number) => t * top.a + b * (1 - top.a);
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: 1 };
}

export function relativeLuminance({ r, g, b }: Rgba): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG 2 contrast ratio, 1..21. Translucent `fg` is composited over `bg` first. */
export function contrastRatio(fg: Rgba, bg: Rgba): number {
  const top = fg.a < 1 ? composite(fg, bg) : fg;
  const l1 = relativeLuminance(top);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
