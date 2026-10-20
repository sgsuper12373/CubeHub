import { describe, it, expect } from "vitest";

import {
  canSwipe,
  DEFAULT_ORBIT,
  lockedSwipe,
  pickSticker,
  projectPoint,
  rotationForDrag,
  stickerCenter,
  swipeMove,
  SWIPE_THRESHOLD_PX,
  type Face,
  type OrbitCamera,
} from "@/lib/playground/swipe";

const VIEW = { width: 448, height: 448 };
const D = 40; // swipe length in px

type Dir = "left" | "right" | "up" | "down";
const DELTA: Record<Dir, [number, number]> = { left: [-D, 0], right: [D, 0], up: [0, -D], down: [0, D] };

const cam = (latitude: number, longitude: number): OrbitCamera => ({ latitude, longitude, distance: 6.25 });

/** A camera that looks at a face square-on (U and D as steep as cubing allows). */
const FACING: Record<Face, OrbitCamera> = {
  F: cam(0, 0),
  R: cam(0, 90),
  B: cam(0, 180),
  L: cam(0, -90),
  U: cam(35, 0),
  D: cam(-35, 0),
};

function swipe(face: Face, row: number, col: number, dir: Dir, camera = FACING[face], size = 3) {
  return swipeMove({ face, row, col }, size, ...DELTA[dir], camera, VIEW);
}

/*
 * Expected moves, worked out by hand from the cube, not from the code: e.g.
 * on F, dragging the top row right carries the front to the right, which is
 * U' (U turns the front to the left).
 */
const TABLE: [Face, number, number, Dir, string][] = [
  // F: rows → U/E/D, columns → L/M/R
  ["F", 0, 1, "right", "U'"], ["F", 0, 1, "left", "U"],
  ["F", 1, 1, "right", "E"], ["F", 1, 1, "left", "E'"],
  ["F", 2, 1, "right", "D"], ["F", 2, 1, "left", "D'"],
  ["F", 1, 2, "up", "R"], ["F", 1, 2, "down", "R'"],
  ["F", 1, 1, "up", "M'"], ["F", 1, 1, "down", "M"],
  ["F", 1, 0, "up", "L'"], ["F", 1, 0, "down", "L"],
  // R: columns → F/S/B
  ["R", 0, 1, "right", "U'"], ["R", 2, 1, "left", "D'"],
  ["R", 1, 0, "up", "F'"], ["R", 1, 0, "down", "F"],
  ["R", 1, 1, "up", "S'"], ["R", 1, 1, "down", "S"],
  ["R", 1, 2, "up", "B"], ["R", 1, 2, "down", "B'"],
  // B: columns → R/M/L (mirrored)
  ["B", 0, 1, "right", "U'"], ["B", 1, 1, "left", "E'"],
  ["B", 1, 0, "up", "R'"], ["B", 1, 1, "up", "M"], ["B", 1, 2, "up", "L"],
  ["B", 1, 2, "down", "L'"],
  // L: columns → B/S/F
  ["L", 2, 1, "right", "D"], ["L", 1, 1, "right", "E"],
  ["L", 1, 0, "up", "B'"], ["L", 1, 1, "up", "S"], ["L", 1, 2, "up", "F"],
  ["L", 1, 2, "down", "F'"],
  // U: rows → B/S/F, columns → L/M/R
  ["U", 2, 1, "right", "F"], ["U", 2, 1, "left", "F'"],
  ["U", 1, 1, "right", "S"], ["U", 0, 1, "right", "B'"],
  ["U", 1, 2, "down", "R'"], ["U", 1, 2, "up", "R"],
  ["U", 1, 1, "down", "M"], ["U", 1, 0, "down", "L"],
  // D: rows → F/S/B, columns → L/M/R
  ["D", 0, 1, "right", "F'"], ["D", 0, 1, "left", "F"],
  ["D", 1, 1, "right", "S'"], ["D", 2, 1, "right", "B"],
  ["D", 1, 2, "down", "R'"], ["D", 1, 2, "up", "R"],
  ["D", 1, 1, "up", "M'"], ["D", 1, 0, "up", "L'"],
];

describe("swipeMove on a 3x3, each face seen square-on", () => {
  it.each(TABLE)("%s r%i c%i swipe %s → %s", (face, row, col, dir, move) => {
    expect(swipe(face, row, col, dir)).toBe(move);
  });

  it("covers every face, both directions, outer and middle layers", () => {
    const faces = new Set(TABLE.map((t) => t[0]));
    const moves = new Set(TABLE.map((t) => t[4]));
    expect(faces.size).toBe(6);
    for (const m of ["R", "L", "U", "D", "F", "B", "M", "E", "S"]) {
      expect(moves.has(m) && moves.has(`${m}'`)).toBe(true);
    }
  });
});

describe("swipeMove at other camera angles", () => {
  it("default view (35°, 30°): a row on F follows the screen, not the axis", () => {
    // The top row of F slopes down to the right on screen; a flat swipe right still reads as along it.
    expect(swipe("F", 0, 1, "right", DEFAULT_ORBIT)).toBe("U'");
    expect(swipe("F", 1, 2, "up", DEFAULT_ORBIT)).toBe("R");
    expect(swipe("R", 1, 2, "up", DEFAULT_ORBIT)).toBe("B");
    expect(swipe("R", 0, 1, "left", DEFAULT_ORBIT)).toBe("U");
    expect(swipe("U", 1, 2, "down", DEFAULT_ORBIT)).toBe("R'");
  });

  it("a swipe along the projected axis gives the same move at any angle", () => {
    // Swipe exactly along each sticker's projected "right" / "down" direction.
    for (const camera of [DEFAULT_ORBIT, cam(-35, 30), cam(20, 135), cam(-10, -120), cam(35, 225), cam(0, 45)]) {
      for (const [face, row, col, dir, move] of TABLE) {
        if (!pickVisible(camera, face, row, col)) continue;
        const [ux, uy] = screenAxis(camera, face, row, col, dir);
        const got = swipeMove({ face, row, col }, 3, ux * D, uy * D, camera, VIEW);
        const label = `${face} r${row} c${col} ${dir} at ${camera.latitude}/${camera.longitude}`;
        // A face seen nearly edge-on refuses rather than guess; anything wider must be right.
        if (!canSwipe({ face, row, col }, 3, camera, VIEW)) expect(got, label).toBeNull();
        else expect(got, label).toBe(move);
      }
    }
  });

  it("refuses on a face seen nearly edge-on instead of guessing", () => {
    expect(canSwipe({ face: "D", row: 0, col: 1 }, 3, cam(-10, -120), VIEW)).toBe(false);
    expect(swipe("D", 0, 1, "right", cam(-10, -120))).toBeNull();
    expect(canSwipe({ face: "U", row: 1, col: 1 }, 3, cam(10, 30), VIEW)).toBe(false);
    // Every face visible from the default view is swipeable.
    for (const face of ["U", "F", "R"] as Face[]) {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) expect(canSwipe({ face, row, col }, 3, DEFAULT_ORBIT, VIEW)).toBe(true);
      }
    }
  });

  it("a swipe up to 15° off the row still reads as that row on any swipeable face", () => {
    for (let latitude = -35; latitude <= 35; latitude += 5) {
      for (let longitude = 0; longitude < 360; longitude += 15) {
        const camera = cam(latitude, longitude);
        for (const [face, row, col, dir, move] of TABLE) {
          if (!pickVisible(camera, face, row, col) || !canSwipe({ face, row, col }, 3, camera, VIEW)) continue;
          const [ux, uy] = screenAxis(camera, face, row, col, dir);
          for (const deg of [-15, -8, 8, 15]) {
            const r = (deg * Math.PI) / 180;
            const dx = (ux * Math.cos(r) - uy * Math.sin(r)) * D;
            const dy = (ux * Math.sin(r) + uy * Math.cos(r)) * D;
            expect(swipeMove({ face, row, col }, 3, dx, dy, camera, VIEW)).toBe(move);
          }
        }
      }
    }
  });

  it("the back face from behind and below", () => {
    expect(swipe("B", 1, 0, "up", cam(-20, 180))).toBe("R'");
    expect(swipe("D", 0, 1, "right", cam(-35, 0))).toBe("F'");
  });
});

describe("swipeMove on a 2x2", () => {
  it("only outer layers, and the same senses", () => {
    expect(swipe("F", 0, 0, "right", FACING.F, 2)).toBe("U'");
    expect(swipe("F", 1, 1, "left", FACING.F, 2)).toBe("D'");
    expect(swipe("F", 0, 1, "up", FACING.F, 2)).toBe("R");
    expect(swipe("F", 1, 0, "down", FACING.F, 2)).toBe("L");
    expect(swipe("U", 1, 0, "right", FACING.U, 2)).toBe("F");
    expect(swipe("R", 0, 1, "up", FACING.R, 2)).toBe("B");
  });
});

describe("pickSticker", () => {
  it("finds every visible sticker from its own projected centre", () => {
    for (const size of [2, 3]) {
      for (const camera of [DEFAULT_ORBIT, cam(0, 0), cam(-35, 210), cam(35, -60), cam(12, 95)]) {
        let found = 0;
        for (const face of ["U", "D", "F", "B", "R", "L"] as Face[]) {
          for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
              if (!pickVisible(camera, face, row, col, size)) continue;
              const p = projectPoint(camera, VIEW, stickerCenter({ face, row, col }, size));
              expect(pickSticker(camera, VIEW, p.x, p.y, size)).toEqual({ face, row, col });
              found++;
            }
          }
        }
        expect(found).toBeGreaterThanOrEqual(size * size);
      }
    }
  });

  it("square-on, the middle of the view is the centre of F", () => {
    expect(pickSticker(cam(0, 0), VIEW, 224, 224, 3)).toEqual({ face: "F", row: 1, col: 1 });
  });

  it("misses off the cube", () => {
    expect(pickSticker(DEFAULT_ORBIT, VIEW, 5, 5, 3)).toBeNull();
    expect(pickSticker(DEFAULT_ORBIT, VIEW, 440, 224, 3)).toBeNull();
  });

  it("handles a view taller than wide the way cubing centres it", () => {
    const tall = { width: 300, height: 500 };
    const p = projectPoint(cam(0, 0), tall, [0, 0, 0]);
    expect(p.x).toBeCloseTo(150);
    expect(p.y).toBeCloseTo(250, 0);
  });
});

describe("swipe threshold and off-cube rotation", () => {
  it("is a tap below the threshold", () => {
    expect(lockedSwipe(10, 10)).toBeNull();
    expect(lockedSwipe(SWIPE_THRESHOLD_PX, 0)).toEqual({ dx: SWIPE_THRESHOLD_PX, dy: 0 });
  });

  it("drags off the cube rotate it like x, y and z", () => {
    expect(rotationForDrag(D, 0, cam(0, 0))).toBe("y'");
    expect(rotationForDrag(-D, 0, cam(0, 0))).toBe("y");
    expect(rotationForDrag(0, -D, cam(0, 0))).toBe("x");
    expect(rotationForDrag(0, D, cam(0, 0))).toBe("x'");
    // Looking at R, an upward drag turns the cube about z.
    expect(rotationForDrag(0, -D, cam(0, 90))).toBe("z'");
    expect(rotationForDrag(D, 0, DEFAULT_ORBIT)).toBe("y'");
  });
});

/** True when the sticker's centre is on a face that points toward the camera, and nothing hides it. */
function pickVisible(camera: OrbitCamera, face: Face, row: number, col: number, size = 3): boolean {
  const p = projectPoint(camera, VIEW, stickerCenter({ face, row, col }, size));
  const hit = pickSticker(camera, VIEW, p.x, p.y, size);
  return hit?.face === face;
}

/** Unit screen direction of a TABLE swipe, along the sticker's projected row or column. */
function screenAxis(camera: OrbitCamera, face: Face, row: number, col: number, dir: Dir): [number, number] {
  const center = stickerCenter({ face, row, col }, 3);
  const axis = dir === "left" || dir === "right" ? axisVec(face, "right") : axisVec(face, "down");
  const s = dir === "left" || dir === "up" ? -1 : 1;
  const a = projectPoint(camera, VIEW, center);
  const b = projectPoint(camera, VIEW, [
    center[0] + axis[0] * 0.01 * s,
    center[1] + axis[1] * 0.01 * s,
    center[2] + axis[2] * 0.01 * s,
  ]);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  return [(b.x - a.x) / len, (b.y - a.y) / len];
}

function axisVec(face: Face, which: "right" | "down"): [number, number, number] {
  const a = stickerCenter({ face, row: 0, col: 0 }, 3);
  const b = stickerCenter({ face, row: which === "down" ? 1 : 0, col: which === "right" ? 1 : 0 }, 3);
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return [d[0] / len, d[1] / len, d[2] / len];
}
