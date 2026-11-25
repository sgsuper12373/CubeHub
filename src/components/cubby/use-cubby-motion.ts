"use client";

import { useReducedMotion } from "motion/react";

import { prefersReducedMotion } from "@/lib/companion/settings";
import { useCompanionStore } from "@/stores/companion-store";

/** Whether Cubby should hold still: the Motion setting, else the system preference. */
export function useCubbyReducedMotion(): boolean {
  const settings = useCompanionStore((s) => s.record.settings);
  const system = useReducedMotion() ?? false;
  return prefersReducedMotion(settings, system);
}
