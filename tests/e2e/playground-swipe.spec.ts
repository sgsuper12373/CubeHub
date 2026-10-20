import { test, expect, type Page } from "@playwright/test";

import {
  canSwipe,
  CUBE_HALF,
  pickSticker,
  projectPoint,
  stickerCenter,
  type Face,
  type OrbitCamera,
} from "../../src/lib/playground/swipe";

/**
 * Swipe-to-turn against the real cubing.js renderer, with touch emulation.
 *
 * The mapping is unit-tested as maths (tests/unit/playground-swipe.test.ts);
 * this checks the maths matches what cubing actually draws:
 *
 * 1. The cube's size in the scene is still CUBE_HALF (PG3D's hit planes).
 * 2. At each camera angle, the colour under every projected sticker centre is
 *    that face's colour on a solved cube, so the projection lines up with the
 *    pixels (and U/F/R are +Y/+Z/+X).
 * 3. Real touch swipes (CDP touch events → Pointer Events) on chosen stickers
 *    put the expected move in the history, and the cube visibly moved the way
 *    the finger did: the colour now under the finger is the face the row was
 *    dragged *from* (swipe the top of F right and L's colour arrives).
 *
 * Screenshots of each angle go to the test output (and SWIPE_SHOTS_DIR, if set).
 */

test.use({ hasTouch: true });

type Rgb = [number, number, number];
const VIEWS: { name: string; camera: OrbitCamera }[] = [
  { name: "default", camera: { latitude: 35, longitude: 30, distance: 6.25 } },
  { name: "front-left", camera: { latitude: 20, longitude: -40, distance: 6.25 } },
  { name: "below-back", camera: { latitude: -35, longitude: 150, distance: 6.25 } },
  { name: "level-right", camera: { latitude: 0, longitude: 80, distance: 6.25 } },
];

/** cubing's default PG3D 3x3 colours, by face. */
const FACE_COLOUR: Record<Face, string> = {
  U: "white",
  D: "yellow",
  F: "green",
  B: "blue",
  R: "red",
  L: "orange",
};

async function openCube(page: Page, puzzle = "333") {
  await page.goto(`/playground?puzzle=${puzzle}`);
  await expect(page.locator("twisty-player").first()).toBeAttached({ timeout: 30_000 });
  await expect(page.getByRole("status", { name: /loading cube/i })).toHaveCount(0, { timeout: 30_000 });
}

async function setCamera(page: Page, camera: OrbitCamera) {
  await page.evaluate(({ latitude, longitude }) => {
    const player = document.querySelector("twisty-player") as unknown as {
      cameraLatitude: number;
      cameraLongitude: number;
    };
    player.cameraLatitude = latitude;
    player.cameraLongitude = longitude;
  }, camera);
  // The orbit prop is async, and then a frame has to render.
  await page.waitForTimeout(400);
}

async function cubeBox(page: Page) {
  const box = await page.getByTestId("playground-cube").boundingBox();
  if (!box) throw new Error("no cube box");
  return box;
}

/** Name a sampled colour coarsely, enough to tell the six faces apart. */
function colourName([r, g, b]: Rgb): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max > 170 && max - min < 50) return "white";
  if (max - min < 40) return "grey";
  if (b === max && b > g + 30) return "blue";
  if (g === max && g > r + 30) return "green";
  if (r === max && g > 0.75 * r) return "yellow";
  if (r === max && g > 0.3 * r) return "orange";
  if (r === max) return "red";
  return "other";
}

/** RGB at each point of a PNG screenshot, decoded in the page. */
async function sample(page: Page, png: Buffer, points: { x: number; y: number }[]): Promise<Rgb[]> {
  return page.evaluate(
    async ({ b64, points }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      ctx.drawImage(img, 0, 0);
      return points.map(({ x, y }) => {
        const d = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
        return [d[0], d[1], d[2]] as [number, number, number];
      });
    },
    { b64: png.toString("base64"), points },
  );
}

/** A real touch swipe: CDP touch events, which Chromium turns into pointer events. */
async function touchSwipe(page: Page, from: { x: number; y: number }, dx: number, dy: number) {
  const cdp = await page.context().newCDPSession(page);
  const at = (t: number) => [{ x: from.x + dx * t, y: from.y + dy * t, id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(0) });
  for (const t of [0.25, 0.5, 0.75, 1]) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(t) });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

async function stickerOnScreen(page: Page, camera: OrbitCamera, face: Face, row: number, col: number, size = 3) {
  const box = await cubeBox(page);
  const viewport = { width: box.width, height: box.height };
  const p = projectPoint(camera, viewport, stickerCenter({ face, row, col }, size));
  // The sticker must actually be the one in front at that point.
  expect(pickSticker(camera, viewport, p.x, p.y, size)).toEqual({ face, row, col });
  return { x: box.x + p.x, y: box.y + p.y };
}

test.describe("Playground swipe-to-turn", () => {
  test("cubing's cube is still the size the mapping assumes", async ({ page }) => {
    await openCube(page);
    const half = await page.evaluate(async () => {
      type Obj = {
        children: Obj[];
        geometry?: { attributes: { position: { count: number; getX(i: number): number } } };
        material?: unknown;
        updateMatrixWorld(force: boolean): void;
        matrixWorld: { elements: number[] };
      };
      const player = document.querySelector("twisty-player") as unknown as {
        experimentalCurrentThreeJSPuzzleObject(): Promise<Obj>;
      };
      const obj = await player.experimentalCurrentThreeJSPuzzleObject();
      obj.updateMatrixWorld(true);
      // PG3D's hit planes: the single-material meshes, one per face.
      let max = 0;
      const walk = (o: Obj) => {
        if (o.geometry && o.material && !Array.isArray(o.material)) {
          const pos = o.geometry.attributes.position;
          const e = o.matrixWorld.elements;
          for (let i = 0; i < pos.count; i++) max = Math.max(max, Math.abs(e[0] * pos.getX(i) + e[12]));
        }
        o.children.forEach(walk);
      };
      walk(obj);
      return max;
    });
    expect(half).toBeCloseTo(CUBE_HALF, 4);
  });

  for (const { name, camera } of VIEWS) {
    test(`projection matches the renderer: ${name} (${camera.latitude}°, ${camera.longitude}°)`, async ({
      page,
    }, testInfo) => {
      await openCube(page);
      await setCamera(page, camera);
      const box = await cubeBox(page);
      const viewport = { width: box.width, height: box.height };
      const png = await page.getByTestId("playground-cube").screenshot();
      await testInfo.attach(`swipe-${name}`, { body: png, contentType: "image/png" });
      if (process.env.SWIPE_SHOTS_DIR) {
        const { writeFileSync } = await import("node:fs");
        writeFileSync(`${process.env.SWIPE_SHOTS_DIR}/projection-${name}.png`, png);
      }

      const stickers: { face: Face; x: number; y: number }[] = [];
      for (const face of Object.keys(FACE_COLOUR) as Face[]) {
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            const p = projectPoint(camera, viewport, stickerCenter({ face, row, col }, 3));
            if (pickSticker(camera, viewport, p.x, p.y, 3)?.face === face) stickers.push({ face, ...p });
          }
        }
      }
      expect(stickers.length).toBeGreaterThanOrEqual(18);
      // Screenshot pixels may be scaled by the device pixel ratio.
      const scale = (await page.evaluate(() => window.devicePixelRatio)) || 1;
      const colours = await sample(
        page,
        png,
        stickers.map((s) => ({ x: s.x * scale, y: s.y * scale })),
      );
      const got = stickers.map((s, i) => `${s.face}:${colourName(colours[i])}`);
      expect(got).toEqual(stickers.map((s) => `${s.face}:${FACE_COLOUR[s.face]}`));
    });
  }

  /** `arrives`: the face whose colour should be under the finger after the turn. */
  const SWIPES: {
    view: string;
    face: Face;
    row: number;
    col: number;
    dx: number;
    dy: number;
    move: string;
    arrives: Face;
  }[] = [
    // Default view: rows and columns on all three visible faces, outer and middle.
    { view: "default", face: "F", row: 0, col: 1, dx: 60, dy: 0, move: "U'", arrives: "L" },
    { view: "default", face: "F", row: 1, col: 2, dx: 0, dy: -60, move: "R", arrives: "D" },
    { view: "default", face: "F", row: 1, col: 1, dx: 0, dy: 60, move: "M", arrives: "U" },
    { view: "default", face: "R", row: 1, col: 1, dx: 0, dy: -60, move: "S'", arrives: "D" },
    { view: "default", face: "R", row: 2, col: 1, dx: -60, dy: 0, move: "D'", arrives: "B" },
    { view: "default", face: "U", row: 2, col: 1, dx: 60, dy: 0, move: "F", arrives: "L" },
    { view: "default", face: "U", row: 1, col: 1, dx: 60, dy: 0, move: "S", arrives: "L" },
    { view: "default", face: "U", row: 1, col: 0, dx: 0, dy: 60, move: "L", arrives: "B" },
    // Other angles reach L, B and D.
    { view: "front-left", face: "L", row: 1, col: 0, dx: 0, dy: -60, move: "B'", arrives: "D" },
    { view: "front-left", face: "L", row: 1, col: 1, dx: 60, dy: 0, move: "E", arrives: "B" },
    { view: "below-back", face: "B", row: 1, col: 2, dx: 0, dy: -60, move: "L", arrives: "D" },
    { view: "below-back", face: "D", row: 1, col: 1, dx: 0, dy: -60, move: "M", arrives: "F" },
    { view: "level-right", face: "R", row: 1, col: 2, dx: 0, dy: 60, move: "B'", arrives: "U" },
    { view: "level-right", face: "R", row: 0, col: 1, dx: 60, dy: 0, move: "U'", arrives: "F" },
  ];

  for (const view of VIEWS) {
    const swipes = SWIPES.filter((s) => s.view === view.name);
    test(`touch swipes turn the expected layers: ${view.name}`, async ({ page }, testInfo) => {
      await openCube(page);
      await setCamera(page, view.camera);
      const history = page.getByTestId("playground-history");
      const cube = page.getByTestId("playground-cube");
      const scale = (await page.evaluate(() => window.devicePixelRatio)) || 1;
      for (const [i, s] of swipes.entries()) {
        const label = `${s.face} r${s.row} c${s.col} (${s.dx}, ${s.dy})`;
        // Each swipe starts from solved, so every sticker is where the projection says.
        if (i > 0) await page.getByRole("button", { name: "Reset" }).click();
        await expect(history).toHaveText(/Turn the cube to start/);
        await page.waitForTimeout(300); // the reset redraw
        const from = await stickerOnScreen(page, view.camera, s.face, s.row, s.col);
        await touchSwipe(page, from, s.dx, s.dy);
        await expect(history, label).toHaveText(s.move);

        await page.waitForTimeout(800); // let the turn finish animating
        const box = await cubeBox(page);
        const png = await cube.screenshot();
        await testInfo.attach(`after-${view.name}-${s.move}`, { body: png, contentType: "image/png" });
        if (process.env.SWIPE_SHOTS_DIR && i === 0) {
          const { writeFileSync } = await import("node:fs");
          writeFileSync(`${process.env.SWIPE_SHOTS_DIR}/swipe-${view.name}-${s.face}-${s.move}.png`, png);
        }
        const [rgb] = await sample(page, png, [{ x: (from.x - box.x) * scale, y: (from.y - box.y) * scale }]);
        expect(colourName(rgb), `${label}: colour under the finger after ${s.move}`).toBe(FACE_COLOUR[s.arrives]);
      }
    });
  }

  test("a tap does nothing, a drag off the cube orbits, and a mouse swipe works", async ({ page }) => {
    await openCube(page);
    const history = page.getByTestId("playground-history");
    const camera = VIEWS[0].camera;
    const centre = await stickerOnScreen(page, camera, "F", 1, 1);

    // Under the 15 px threshold: no move, and no click-to-turn either.
    await touchSwipe(page, centre, 8, 0);
    await page.mouse.click(centre.x, centre.y);
    await page.waitForTimeout(300);
    await expect(history).toHaveText(/Turn the cube to start/);

    // Off the cube: orbit, no move.
    const box = await cubeBox(page);
    await touchSwipe(page, { x: box.x + 10, y: box.y + 10 }, 80, 0);
    await page.waitForTimeout(300);
    await expect(history).toHaveText(/Turn the cube to start/);

    // Mouse, back at the default camera.
    await setCamera(page, camera);
    const right = await stickerOnScreen(page, camera, "F", 1, 2);
    await page.mouse.move(right.x, right.y);
    await page.mouse.down();
    await page.mouse.move(right.x, right.y - 30, { steps: 5 });
    await page.mouse.up();
    await expect(history).toHaveText("R");
  });

  test("a face seen nearly edge-on isn't swiped: the drag orbits the camera instead", async ({ page }) => {
    await openCube(page);
    const camera = { latitude: 10, longitude: 30, distance: 6.25 };
    await setCamera(page, camera);
    const box = await cubeBox(page);
    const viewport = { width: box.width, height: box.height };
    const p = projectPoint(camera, viewport, stickerCenter({ face: "U", row: 2, col: 1 }, 3));
    expect(pickSticker(camera, viewport, p.x, p.y, 3)?.face).toBe("U");
    expect(canSwipe({ face: "U", row: 2, col: 1 }, 3, camera, viewport)).toBe(false);

    await touchSwipe(page, { x: box.x + p.x, y: box.y + p.y }, 0, 60);
    await page.waitForTimeout(300);
    await expect(page.getByTestId("playground-history")).toHaveText(/Turn the cube to start/);
    const latitude = await page.evaluate(async () => {
      const player = document.querySelector("twisty-player") as unknown as {
        experimentalModel: { twistySceneModel: { orbitCoordinates: { get(): Promise<{ latitude: number }> } } };
      };
      return (await player.experimentalModel.twistySceneModel.orbitCoordinates.get()).latitude;
    });
    expect(latitude).toBeGreaterThan(camera.latitude + 5);
  });

  test("off-cube drag can rotate the cube instead, and swipe can be turned off", async ({ page }) => {
    await openCube(page);
    const history = page.getByTestId("playground-history");
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("checkbox", { name: "Drag off the cube rotates it" }).check();
    await page.keyboard.press("Escape");
    const box = await cubeBox(page);
    await touchSwipe(page, { x: box.x + 10, y: box.y + box.height / 2 }, 80, 0);
    await expect(history).toHaveText("y'");

    // Off: cubing's click-to-turn is back and the gesture layer stands aside.
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("checkbox", { name: "Swipe to turn" }).uncheck();
    await expect(page.getByRole("checkbox", { name: "Drag off the cube rotates it" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    const centre = await stickerOnScreen(page, VIEWS[0].camera, "F", 1, 1);
    await touchSwipe(page, centre, 0, -60);
    await page.waitForTimeout(300);
    await expect(history).toHaveText("y'");
  });

  test("2x2: swipes turn outer layers", async ({ page }) => {
    await openCube(page, "222");
    const history = page.getByTestId("playground-history");
    const camera = VIEWS[0].camera;
    const from = await stickerOnScreen(page, camera, "F", 0, 1, 2);
    await touchSwipe(page, from, 0, -60);
    await expect(history).toHaveText("R");
  });

  test("the touch hint shows once and remembers it was closed", async ({ page }) => {
    await openCube(page);
    const hint = page.getByRole("note").filter({ hasText: "Swipe a row to turn it" });
    const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
    test.skip(!coarse, "this browser doesn't report a coarse pointer under touch emulation");
    await expect(hint).toBeVisible();
    await hint.getByRole("button", { name: "Got it" }).click();
    await expect(hint).toHaveCount(0);
    await page.reload();
    await openCube(page);
    await expect(page.getByText("Swipe a row to turn it. Drag outside")).toHaveCount(0);
  });
});
