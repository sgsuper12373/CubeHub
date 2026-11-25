"use client";

import { CubbyArt } from "@/components/cubby/art/cubby-art";

/** Cubby's face for Home's tip card: a still, happy pose (no renderer, no state). */
export default function CubbyTipFace() {
  return (
    <CubbyArt
      pose={{ expression: "happy", arms: "rest", body: "still", look: null, blindfold: false, holdingCube: false, memo: false }}
      size={40}
      reduced
      className="shrink-0"
    />
  );
}
