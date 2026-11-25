import { createCubbyRenderer } from "@/components/cubby/create-renderer";
import type { CubbyRenderer } from "@/lib/companion/renderer";

/**
 * The app's one Cubby. The dock, the bubble and the tour card all draw it
 * (each through `renderer.View`), so a reaction plays everywhere at once.
 */
let instance: CubbyRenderer | null = null;

export function getCubbyRenderer(): CubbyRenderer {
  instance ??= createCubbyRenderer();
  return instance;
}
