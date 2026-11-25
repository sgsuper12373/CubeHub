/**
 * Cubby's v0 body geometry, in the art's 130 × 150 viewBox: a 3/4 view of a
 * rounded 3x3 with a big front face (where the face goes), a narrow top and a
 * narrow right side. Final art replaces the part files; this is shared by
 * the parts so arms, legs and the face line up with the body.
 */
export const VIEWBOX = "0 0 130 150";

export const FRONT = { x: 24, y: 40, size: 72 } as const;
/** How far the top and side faces recede (oblique projection). */
export const DEPTH = { dx: 14, dy: -12 } as const;

export const SHOULDER_LEFT = { x: 26, y: 80 } as const;
export const SHOULDER_RIGHT = { x: 104, y: 76 } as const;
export const HIPS = [{ x: 46, y: 111 }, { x: 74, y: 111 }] as const;
export const HOLD_POINT = { x: 62, y: 112 } as const;

type Pt = { x: number; y: number };

function quad(a: Pt, b: Pt, c: Pt, d: Pt): string {
  const f = (p: Pt) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  return `M${f(a)} L${f(b)} L${f(c)} L${f(d)}Z`;
}

const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/**
 * A 3x3 grid of sticker quads inside the parallelogram (origin, origin+u,
 * origin+u+v, origin+v), inset by `gap` (a fraction of a cell).
 */
function grid(origin: Pt, u: Pt, v: Pt, gap = 0.09): string[] {
  const at = (s: number, t: number): Pt => ({ x: origin.x + u.x * s + v.x * t, y: origin.y + u.y * s + v.y * t });
  const out: string[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const s0 = (col + gap) / 3;
      const s1 = (col + 1 - gap) / 3;
      const t0 = (row + gap) / 3;
      const t1 = (row + 1 - gap) / 3;
      out.push(quad(at(s0, t0), at(s1, t0), at(s1, t1), at(s0, t1)));
    }
  }
  return out;
}

const F = FRONT;
const frontTL = { x: F.x, y: F.y };
const frontTR = { x: F.x + F.size, y: F.y };
const frontBR = { x: F.x + F.size, y: F.y + F.size };
const backTL = { x: F.x + DEPTH.dx, y: F.y + DEPTH.dy };
const backTR = { x: F.x + F.size + DEPTH.dx, y: F.y + DEPTH.dy };
const backBR = { x: F.x + F.size + DEPTH.dx, y: F.y + F.size + DEPTH.dy };

/** The body's outline (front + top + side), for the plastic underneath the stickers. */
export const BODY_OUTLINE = `M${frontTL.x} ${frontTL.y} L${backTL.x} ${backTL.y} L${backTR.x} ${backTR.y} L${backBR.x} ${backBR.y} L${frontBR.x} ${frontBR.y} L${F.x} ${F.y + F.size}Z`;

export const FRONT_STICKERS = grid(frontTL, { x: F.size, y: 0 }, { x: 0, y: F.size }, 0.07);
export const TOP_STICKERS = grid(backTL, { x: F.size, y: 0 }, { x: -DEPTH.dx, y: -DEPTH.dy });
export const SIDE_STICKERS = grid(frontTR, { x: DEPTH.dx, y: DEPTH.dy }, { x: 0, y: F.size });

/** Faces sit on the stickers (eyes: middle-left and middle-right; mouth: bottom-middle), clear of the grid lines. */
/** The top layer of the front + side, which turns on a celebration ("layer spin"). */
export const TOP_LAYER_BAND = { y0: F.y + DEPTH.dy, y1: F.y + F.size / 3 } as const;

export const EYE_LEFT = { x: 36, y: 75 } as const;
export const EYE_RIGHT = { x: 84, y: 75 } as const;
export const MOUTH = { x: 60, y: 99 } as const;

export { lerp };
