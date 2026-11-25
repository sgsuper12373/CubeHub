import { render } from "@testing-library/react";
import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CubbyArt } from "@/components/cubby/art/cubby-art";
import { BROW_VARIANTS, EXPRESSION_PARTS, EYE_VARIANTS, MOUTH_VARIANTS } from "@/components/cubby/art/manifest";
import { DEFAULT_INPUTS, TRIGGERS } from "@/lib/companion/renderer";
import { EXPRESSIONS, poseOf, type Pose } from "@/lib/companion/svg-state";

const still = (expression: Pose["expression"]): Pose => ({ expression, arms: "rest", body: "still", look: null, blindfold: false, holdingCube: false, memo: false });

describe("the art manifest", () => {
  it("maps every expression to part variants that exist", () => {
    for (const e of EXPRESSIONS) {
      const parts = EXPRESSION_PARTS[e];
      expect(EYE_VARIANTS).toContain(parts.eyes);
      expect(BROW_VARIANTS).toContain(parts.brows);
      expect(MOUTH_VARIANTS).toContain(parts.mouth);
    }
  });

  it("keeps each part in its own file", () => {
    const files = readdirSync("src/components/cubby/art");
    for (const f of ["body.tsx", "eyes.tsx", "brows.tsx", "mouth.tsx", "arms.tsx", "legs.tsx", "manifest.ts"]) expect(files).toContain(f);
  });
});

describe("CubbyArt", () => {
  it("draws every expression, hidden from assistive tech", () => {
    for (const e of EXPRESSIONS) {
      const { container, unmount } = render(<CubbyArt pose={still(e)} size={56} reduced />);
      const svg = container.querySelector("svg")!;
      expect(svg.getAttribute("aria-hidden")).toBe("true");
      expect(svg.getAttribute("data-expression")).toBe(e);
      unmount();
    }
  });

  it("draws every trigger and BLD phase", () => {
    const poses = [
      ...TRIGGERS.map((t) => poseOf({ inputs: DEFAULT_INPUTS, oneShot: { trigger: t, id: 1 } })),
      poseOf({ inputs: { ...DEFAULT_INPUTS, bldPhase: "memo" }, oneShot: null }),
      poseOf({ inputs: { ...DEFAULT_INPUTS, bldPhase: "execute" }, oneShot: null }),
      poseOf({ inputs: { ...DEFAULT_INPUTS, pointAt: "left" }, oneShot: null }),
    ];
    for (const p of poses) {
      const { container, unmount } = render(<CubbyArt pose={p} size={140} reduced />);
      expect(container.querySelector("svg")!.getAttribute("data-arms")).toBe(p.arms);
      unmount();
    }
  });

  it("sizes to the requested height", () => {
    const { container } = render(<CubbyArt pose={still("idle")} size={56} reduced />);
    expect(container.querySelector("svg")!.getAttribute("height")).toBe("56");
  });
});
