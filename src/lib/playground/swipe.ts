/**
 * Swipe-to-turn geometry for the playground's 3D cube: which sticker a pointer
 * is on, and which move a swipe from it means. Pure functions, no DOM and no
 * cubing import, so the whole mapping is unit-testable.
 *
 * The camera model is copied from cubing.js 0.56's PG3D view, not guessed:
 *
 * - `Twisty3DVantage.camera()`: `PerspectiveCamera(20, aspect, 0.1, 20)`, so a
 *   20° *vertical* field of view, default up vector +Y.
 * - `setCameraFromOrbitCoordinates()`: the camera sits at
 *   `Spherical(distance, 90° − latitude, longitude)` and does `lookAt(0, 0, 0)`.
 *   three.js puts a spherical (r, φ, θ) at (r sinφ sinθ, r cosφ, r sinφ cosθ).
 * - `Twisty3DVantage.#onResize()`: aspect is width / height, and when the view
 *   is taller than wide it sets a view offset so the cube stays centred.
 *   Reproduced in `frustum()`.
 * - Default PG3D orbit for cubes: latitude 35, longitude 30, distance 6.25.
 *   Latitude is clamped to ±35 (`DEFAULT_LATITUDE_LIMIT`).
 *
 * The cube is axis-aligned at the origin: U is +Y, F is +Z, R is +X. Its faces
 * (PG3D's own hit planes) sit at ±CUBE_HALF, measured from the live object;
 * the e2e test re-measures it, so a cubing upgrade that moves it fails there.
 *
 * Moves are position-based in cubing's KPuzzle, so after `x`/`y`/`z` the top
 * layer is still `U`: no orientation tracking is needed.
 */

export type Vec3 = readonly [number, number, number];

export interface OrbitCamera {
  /** Degrees above the equator. */
  latitude: number;
  /** Degrees round the vertical axis; 0 looks at F. */
  longitude: number;
  distance: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export type Face = "U" | "D" | "F" | "B" | "R" | "L";

/** A sticker, by face and its row/column in the usual net (row 0 at the top). */
export interface StickerHit {
  face: Face;
  row: number;
  col: number;
}

export const DEFAULT_ORBIT: OrbitCamera = { latitude: 35, longitude: 30, distance: 6.25 };
export const FOV_DEG = 20;
const NEAR = 0.1;
/** Half the cube's edge in cubing's world units (PG3D hit planes, cubing 0.56). */
export const CUBE_HALF = 0.5551444888114929;
/** Pixels a pointer must travel before a press becomes a swipe. */
export const SWIPE_THRESHOLD_PX = 15;
/**
 * A face seen so obliquely that its two in-plane axes look less than this far
 * apart on screen can't reliably tell a row from a column: a swipe would have
 * to be within half this angle of the row to be read right. Such a face isn't
 * swipeable (the press orbits the camera instead). In practice: U or D with
 * the camera within about 15° of level, or a side face seen nearly edge-on.
 * At the default view every visible face is well clear (U 58°, F 68°, R 37°).
 */
export const MIN_AXIS_SEPARATION_DEG = 30;

/**
 * Each face's outward normal, and its net "right" and "down" directions as seen
 * from outside (side faces with U on top; U with F at the bottom; D with F at
 * the top).
 */
const FACES: Record<Face, { normal: Vec3; right: Vec3; down: Vec3 }> = {
  U: { normal: [0, 1, 0], right: [1, 0, 0], down: [0, 0, 1] },
  D: { normal: [0, -1, 0], right: [1, 0, 0], down: [0, 0, -1] },
  F: { normal: [0, 0, 1], right: [1, 0, 0], down: [0, -1, 0] },
  B: { normal: [0, 0, -1], right: [-1, 0, 0], down: [0, -1, 0] },
  R: { normal: [1, 0, 0], right: [0, 0, -1], down: [0, -1, 0] },
  L: { normal: [-1, 0, 0], right: [0, 0, 1], down: [0, -1, 0] },
};

/**
 * Per axis: the layer names from the negative side to the positive one, and
 * whether each turns clockwise as a *negative* rotation about the +axis (the
 * right-hand rule). R, U, F and S are negative; L, D, B, M and E positive.
 */
const LAYERS: Record<0 | 1 | 2, { outer: [string, string]; middle: string; sign: { neg: 1; mid: 1 | -1; pos: -1 } }> = {
  0: { outer: ["L", "R"], middle: "M", sign: { neg: 1, mid: 1, pos: -1 } },
  1: { outer: ["D", "U"], middle: "E", sign: { neg: 1, mid: 1, pos: -1 } },
  2: { outer: ["B", "F"], middle: "S", sign: { neg: 1, mid: -1, pos: -1 } },
};
const ROTATIONS = ["x", "y", "z"] as const;

// --- vector helpers ---------------------------------------------------------

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(a[0], a[1], a[2]));

// --- camera -----------------------------------------------------------------

interface CameraBasis {
  position: Vec3;
  right: Vec3;
  up: Vec3;
  forward: Vec3;
}

function cameraBasis(camera: OrbitCamera): CameraBasis {
  const rad = Math.PI / 180;
  // three's Spherical.makeSafe keeps φ off the poles.
  const EPS = 0.000001;
  const phi = Math.max(EPS, Math.min(Math.PI - EPS, (90 - camera.latitude) * rad));
  const theta = camera.longitude * rad;
  const r = camera.distance;
  const position: Vec3 = [r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.cos(theta)];
  // lookAt(0, 0, 0) with up = +Y.
  const forward = normalize(scale(position, -1));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  return { position, right, up, forward };
}

/** The near-plane window three.js builds, including cubing's view offset. */
function frustum(viewport: Viewport) {
  const { width: w, height: h } = viewport;
  const top = NEAR * Math.tan(((FOV_DEG / 2) * Math.PI) / 180);
  const height = 2 * top;
  const width = (w / h) * height;
  // cubing calls setViewOffset(w, h - excess, 0, yoff, w, h), where excess and
  // yoff are 0 unless the view is taller than wide; three.js then shifts and
  // stretches the window like this.
  const excess = h > w ? h - w : 0;
  const yoff = -Math.floor(0.5 * excess);
  const fullH = h - excess;
  return {
    left: -0.5 * width,
    top: top - (yoff * height) / fullH,
    width,
    height: height * (h / fullH),
  };
}

/** World point → CSS pixels within the viewport (origin top-left). */
export function projectPoint(camera: OrbitCamera, viewport: Viewport, p: Vec3): { x: number; y: number } {
  const c = cameraBasis(camera);
  const rel = sub(p, c.position);
  const depth = dot(rel, c.forward);
  const xn = (dot(rel, c.right) * NEAR) / depth;
  const yn = (dot(rel, c.up) * NEAR) / depth;
  const f = frustum(viewport);
  return {
    x: ((xn - f.left) / f.width) * viewport.width,
    y: ((f.top - yn) / f.height) * viewport.height,
  };
}

/** World position of a sticker's centre on an n×n cube. */
export function stickerCenter(hit: StickerHit, size: number): Vec3 {
  const { normal, right, down } = FACES[hit.face];
  const along = (i: number) => ((i + 0.5) / size) * 2 - 1;
  return add(
    scale(normal, CUBE_HALF),
    add(scale(right, along(hit.col) * CUBE_HALF), scale(down, along(hit.row) * CUBE_HALF)),
  );
}

/** Which sticker of an n×n cube is under (x, y), or null if the cube isn't. */
export function pickSticker(
  camera: OrbitCamera,
  viewport: Viewport,
  x: number,
  y: number,
  size: number,
): StickerHit | null {
  const c = cameraBasis(camera);
  const f = frustum(viewport);
  const xn = f.left + (x / viewport.width) * f.width;
  const yn = f.top - (y / viewport.height) * f.height;
  const dir = add(add(scale(c.right, xn), scale(c.up, yn)), scale(c.forward, NEAR));

  // Slab test against the axis-aligned box; the entry face is the axis whose
  // slab is entered last.
  let tMin = -Infinity;
  let tMax = Infinity;
  let entryAxis = -1;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(dir[k]) < 1e-12) {
      if (Math.abs(c.position[k]) > CUBE_HALF) return null;
      continue;
    }
    const t1 = (-CUBE_HALF - c.position[k]) / dir[k];
    const t2 = (CUBE_HALF - c.position[k]) / dir[k];
    const near = Math.min(t1, t2);
    if (near > tMin) {
      tMin = near;
      entryAxis = k;
    }
    tMax = Math.min(tMax, Math.max(t1, t2));
  }
  if (entryAxis < 0 || tMin > tMax || tMin <= 0) return null;

  const point = add(c.position, scale(dir, tMin));
  const face = faceFor(entryAxis, -Math.sign(dir[entryAxis]));
  const { right, down } = FACES[face];
  const cell = (v: number) => Math.min(size - 1, Math.max(0, Math.floor(((v / CUBE_HALF + 1) / 2) * size)));
  return { face, row: cell(dot(point, down)), col: cell(dot(point, right)) };
}

function faceFor(axis: number, sign: number): Face {
  const names: [Face, Face][] = [
    ["L", "R"],
    ["D", "U"],
    ["B", "F"],
  ];
  return names[axis][sign > 0 ? 1 : 0];
}

/** A swipe's screen delta once it has passed the threshold; null while it is still a tap. */
export function lockedSwipe(dx: number, dy: number): { dx: number; dy: number } | null {
  return Math.hypot(dx, dy) >= SWIPE_THRESHOLD_PX ? { dx, dy } : null;
}

/** Screen direction (unit, y down) of moving along `axis` from `from`. */
function screenDirection(camera: OrbitCamera, viewport: Viewport, from: Vec3, axis: Vec3): [number, number] | null {
  const a = projectPoint(camera, viewport, from);
  const b = projectPoint(camera, viewport, add(from, scale(axis, 0.01)));
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  return len > 1e-9 ? [(b.x - a.x) / len, (b.y - a.y) / len] : null;
}

/** The sticker's face axes (right, down) on screen, or null if the face is too oblique to swipe. */
function screenAxes(
  hit: StickerHit,
  size: number,
  camera: OrbitCamera,
  viewport: Viewport,
): [[number, number], [number, number]] | null {
  const { right, down } = FACES[hit.face];
  const center = stickerCenter(hit, size);
  const su = screenDirection(camera, viewport, center, right);
  const sv = screenDirection(camera, viewport, center, down);
  if (!su || !sv) return null;
  const separation = (Math.acos(Math.min(1, Math.abs(su[0] * sv[0] + su[1] * sv[1]))) * 180) / Math.PI;
  return separation >= MIN_AXIS_SEPARATION_DEG ? [su, sv] : null;
}

/** Whether a swipe on this sticker can be read from this camera (see MIN_AXIS_SEPARATION_DEG). */
export function canSwipe(hit: StickerHit, size: number, camera: OrbitCamera, viewport: Viewport): boolean {
  return screenAxes(hit, size, camera, viewport) !== null;
}

/** The world axis (0 x, 1 y, 2 z) a unit vector lies along, and its sign. */
function axisOf(v: Vec3): { axis: 0 | 1 | 2; sign: 1 | -1 } {
  const k = [0, 1, 2].reduce((best, i) => (Math.abs(v[i]) > Math.abs(v[best]) ? i : best), 0) as 0 | 1 | 2;
  return { axis: k, sign: v[k] >= 0 ? 1 : -1 };
}

/**
 * The move a swipe on a sticker makes, or null when it can't be read (the face
 * is too oblique, or the layer doesn't exist on this cube).
 *
 * The face's two in-plane axes are projected to the screen from the sticker's
 * centre; the swipe follows whichever is closer in direction. The sticker then
 * moves along that world axis `m`, which is a rotation about `ω = normal × m`
 * (for a point on the face, ω × normal = m). The layer is the sticker's slice
 * along ω, and the sign of ω says clockwise or not for that layer.
 */
export function swipeMove(
  hit: StickerHit,
  size: number,
  dx: number,
  dy: number,
  camera: OrbitCamera,
  viewport: Viewport,
): string | null {
  const axes = screenAxes(hit, size, camera, viewport);
  if (!axes) return null;
  const [su, sv] = axes;
  const { normal, right, down } = FACES[hit.face];
  const center = stickerCenter(hit, size);

  const len = Math.hypot(dx, dy);
  if (len === 0) return null;
  const alongU = (dx * su[0] + dy * su[1]) / len;
  const alongV = (dx * sv[0] + dy * sv[1]) / len;
  const m = Math.abs(alongU) >= Math.abs(alongV) ? scale(right, Math.sign(alongU)) : scale(down, Math.sign(alongV));

  const { axis, sign } = axisOf(cross(normal, m));
  // Which slice along the turn axis the sticker sits in.
  const coord = center[axis];
  const index = Math.min(size - 1, Math.max(0, Math.floor(((coord / CUBE_HALF + 1) / 2) * size)));
  const layers = LAYERS[axis];
  let name: string;
  let clockwiseSign: 1 | -1;
  if (index === 0) {
    name = layers.outer[0];
    clockwiseSign = layers.sign.neg;
  } else if (index === size - 1) {
    name = layers.outer[1];
    clockwiseSign = layers.sign.pos;
  } else if (size === 3) {
    name = layers.middle;
    clockwiseSign = layers.sign.mid;
  } else {
    return null;
  }
  return sign === clockwiseSign ? name : `${name}'`;
}

/**
 * A drag that starts off the cube, read as a whole-cube rotation: the drag
 * turns the cube about `ω = towardViewer × drag`, snapped to the nearest of
 * x, y and z. x, y and z all turn clockwise as a negative rotation about their
 * +axis (they follow R, U and F).
 */
export function rotationForDrag(dx: number, dy: number, camera: OrbitCamera): string | null {
  if (dx === 0 && dy === 0) return null;
  const c = cameraBasis(camera);
  const drag = add(scale(c.right, dx), scale(c.up, -dy));
  const { axis, sign } = axisOf(cross(scale(c.forward, -1), drag));
  return sign === -1 ? ROTATIONS[axis] : `${ROTATIONS[axis]}'`;
}
