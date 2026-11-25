import type { CubbyRenderer } from "@/lib/companion/renderer";
import { SvgCubbyRenderer } from "@/components/cubby/svg-renderer";

/**
 * Which renderer draws Cubby: the one config line the spec asks for. A
 * RiveCubbyRenderer (same input names, a .riv file) slots in here without
 * touching any caller.
 */
export type RendererKind = "svg";

export function createCubbyRenderer(kind: RendererKind = "svg"): CubbyRenderer {
  switch (kind) {
    case "svg":
      return new SvgCubbyRenderer();
  }
}
