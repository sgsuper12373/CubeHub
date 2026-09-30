import { describe, expect, it } from "vitest";

import {
  DEFAULT_BACKGROUND_OPTIONS,
  imageStyle,
  POSITIONS,
  sanitizeOptions,
} from "@/lib/timer-background/options";
import {
  effectiveBackground,
  luminancePercentiles,
  timerNeedsScrim,
} from "@/lib/timer-background/scrim";
import { resolveTokens, THEMES } from "@/themes";
import { contrastRatio, parseColor, resolveToken } from "@/themes/color";

describe("sanitizeOptions", () => {
  it("returns defaults for garbage", () => {
    expect(sanitizeOptions(null)).toEqual(DEFAULT_BACKGROUND_OPTIONS);
    expect(sanitizeOptions("nope")).toEqual(DEFAULT_BACKGROUND_OPTIONS);
  });

  it("clamps numbers and rejects unknown enums", () => {
    const o = sanitizeOptions({ opacity: 5, blur: -3, brightness: "x", fit: "stretch", position: "middle" });
    expect(o).toEqual({ ...DEFAULT_BACKGROUND_OPTIONS, opacity: 1, blur: 0 });
  });

  it("keeps valid values", () => {
    const valid = { opacity: 0.3, blur: 8, brightness: 0.7, fit: "contain", position: "right top" };
    expect(sanitizeOptions(valid)).toEqual(valid);
  });

  it("offers nine anchors, top-left first", () => {
    expect(POSITIONS).toHaveLength(9);
    expect(POSITIONS[0]).toBe("left top");
    expect(POSITIONS[4]).toBe("center center");
  });
});

describe("imageStyle", () => {
  it("maps options to CSS and overscans only a blurred cover", () => {
    const s = imageStyle({ ...DEFAULT_BACKGROUND_OPTIONS, blur: 6, brightness: 0.8 });
    expect(s.filter).toBe("blur(6px) brightness(0.8)");
    expect(s.transform).toBe("scale(1.06)");
    expect(imageStyle({ ...DEFAULT_BACKGROUND_OPTIONS, blur: 6, fit: "contain" }).transform).toBeUndefined();
    expect(imageStyle(DEFAULT_BACKGROUND_OPTIONS).transform).toBeUndefined();
  });
});

describe("luminancePercentiles", () => {
  it("finds the dark and bright ends and ignores transparent pixels", () => {
    // 5 black, 5 white, plus a transparent white pixel that must not count.
    const px = (v: number, a = 255) => [v, v, v, a];
    const data = [...Array(5).fill(px(0)).flat(), ...Array(5).fill(px(255)).flat(), ...px(255, 0)];
    const r = luminancePercentiles(data);
    expect(r.p10).toBe(0);
    expect(r.p90).toBe(1);
  });

  it("is zero for an empty or fully transparent image", () => {
    expect(luminancePercentiles([])).toEqual({ p10: 0, p90: 0 });
  });
});

describe("effectiveBackground", () => {
  it("is the canvas at zero opacity and the image at full opacity", () => {
    const canvas = parseColor("#0f172a");
    expect(effectiveBackground(1, canvas, { opacity: 0, brightness: 1 })).toMatchObject({ r: canvas.r });
    expect(effectiveBackground(1, canvas, { opacity: 1, brightness: 1 }).r).toBeCloseTo(1, 5);
    // brightness 0.5 on white is linear 0.5, not gamma 0.5
    expect(effectiveBackground(1, canvas, { opacity: 1, brightness: 0.5 }).r).toBeCloseTo(0.735, 2);
  });
});

describe("timerNeedsScrim with the real themes", () => {
  const inksFor = (id: string) => {
    const theme = THEMES.find((t) => t.id === id)!;
    const tokens = resolveTokens(theme) as Record<string, string>;
    const c = (n: string) => parseColor(resolveToken(tokens, n));
    return {
      inks: ["timer-digits", "timer-holding", "timer-running", "timer-ready", "timer-hold"].map(c),
      canvas: c("background"),
    };
  };
  const WHITE = { p10: 1, p90: 1 };
  const BLACK = { p10: 0, p90: 0 };
  const MIXED = { p10: 0.01, p90: 0.9 };

  it("Slate: a bright image under light digits needs the scrim", () => {
    expect(timerNeedsScrim({ ...inksFor("slate"), range: WHITE, opacity: 1, brightness: 1 })).toBe(true);
  });

  it("Slate: a dark image doesn't", () => {
    expect(timerNeedsScrim({ ...inksFor("slate"), range: BLACK, opacity: 1, brightness: 1 })).toBe(false);
  });

  it("Paper: a dark image under dark digits needs the scrim", () => {
    expect(timerNeedsScrim({ ...inksFor("paper"), range: BLACK, opacity: 1, brightness: 1 })).toBe(true);
  });

  it("lowering opacity or brightness can remove the need", () => {
    const slate = inksFor("slate");
    expect(timerNeedsScrim({ ...slate, range: WHITE, opacity: 0.1, brightness: 1 })).toBe(false);
    // A dim image fails the red "holding" colour until brightness drops it
    // further. (White at 30% is still mid-grey, which red can't beat.)
    const DIM = { p10: 0.08, p90: 0.08 };
    expect(timerNeedsScrim({ ...slate, range: DIM, opacity: 1, brightness: 1 })).toBe(true);
    expect(timerNeedsScrim({ ...slate, range: DIM, opacity: 1, brightness: 0.3 })).toBe(false);
  });

  it("a high-contrast image fails in both themes", () => {
    expect(timerNeedsScrim({ ...inksFor("slate"), range: MIXED, opacity: 1, brightness: 1 })).toBe(true);
    expect(timerNeedsScrim({ ...inksFor("paper"), range: MIXED, opacity: 1, brightness: 1 })).toBe(true);
  });

  it("whenever it decides no, every timer colour really has 3:1", () => {
    for (const id of ["slate", "paper"]) {
      const { inks, canvas } = inksFor(id);
      for (const lum of [0, 0.05, 0.2, 0.5, 1]) {
        for (const opacity of [0.1, 0.5, 1]) {
          const range = { p10: lum, p90: lum };
          if (timerNeedsScrim({ inks, canvas, range, opacity, brightness: 1 })) continue;
          const behind = effectiveBackground(lum, canvas, { opacity, brightness: 1 });
          for (const ink of inks) expect(contrastRatio(ink, behind)).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });
});
