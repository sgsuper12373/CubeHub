import { describe, expect, it } from "vitest";

import { placeCard, spotlightRect } from "@/lib/companion/placement";

const VIEW = { width: 1280, height: 800 };
const CARD = { width: 352, height: 200 };

describe("placeCard", () => {
  it("centres the card when there's no target", () => {
    expect(placeCard(null, CARD, VIEW)).toEqual({ x: 464, y: 300, side: null, pointAt: null });
  });

  it("goes below the target when it fits, Cubby pointing up", () => {
    const p = placeCard({ x: 500, y: 100, width: 200, height: 40 }, CARD, VIEW);
    expect(p.side).toBe("below");
    expect(p.pointAt).toBe("up");
    expect(p.y).toBe(154);
    expect(p.x).toBe(424);
  });

  it("goes above a target near the bottom", () => {
    const p = placeCard({ x: 500, y: 700, width: 200, height: 60 }, CARD, VIEW);
    expect(p.side).toBe("above");
    expect(p.y + CARD.height).toBeLessThanOrEqual(700);
  });

  it("goes beside a target as tall as the screen (the sidebar)", () => {
    const p = placeCard({ x: 0, y: 0, width: 232, height: 800 }, CARD, VIEW);
    expect(p.side).toBe("right");
    expect(p.pointAt).toBe("left");
    expect(p.x).toBe(246);
  });

  it("stays inside the viewport", () => {
    const p = placeCard({ x: 1200, y: 50, width: 60, height: 30 }, CARD, VIEW);
    expect(p.x + CARD.width).toBeLessThanOrEqual(VIEW.width - 12);
    expect(p.x).toBeGreaterThanOrEqual(12);
  });
});

describe("spotlightRect", () => {
  it("pads the target and clips to the viewport", () => {
    expect(spotlightRect({ x: 100, y: 100, width: 50, height: 20 }, VIEW)).toEqual({ x: 92, y: 92, width: 66, height: 36 });
    expect(spotlightRect({ x: 0, y: 0, width: 50, height: 20 }, VIEW)).toEqual({ x: 4, y: 4, width: 54, height: 24 });
  });
});
