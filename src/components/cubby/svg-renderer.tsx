"use client";

import { useSyncExternalStore, type ComponentType } from "react";

import type { CubbyRenderer, CubbyViewProps } from "@/lib/companion/renderer";
import { SvgCubbyMachine } from "@/lib/companion/svg-machine";
import { poseOf } from "@/lib/companion/svg-state";
import { CubbyArt } from "@/components/cubby/art/cubby-art";

/**
 * v1's renderer: the state machine (`SvgCubbyMachine`) plus a view that draws
 * its current pose with the SVG parts in `art/`. Each instance gets its own
 * `View`, bound to it, so callers just render `<renderer.View size={56} />`.
 */
export class SvgCubbyRenderer extends SvgCubbyMachine implements CubbyRenderer {
  readonly View: ComponentType<CubbyViewProps>;

  constructor() {
    super();
    const View = (props: CubbyViewProps) => <SvgCubbyView machine={this} {...props} />;
    View.displayName = "SvgCubbyView";
    this.View = View;
  }
}

function SvgCubbyView({ machine, size, reduced, className }: CubbyViewProps & { machine: SvgCubbyMachine }) {
  const state = useSyncExternalStore(machine.subscribe, machine.getSnapshot, machine.getSnapshot);
  return <CubbyArt pose={poseOf(state)} size={size} reduced={reduced} className={className} />;
}
