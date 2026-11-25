import type { Pose } from "@/lib/companion/svg-state";

/**
 * Placeholder until the v0 art lands (docs/companion-plan.md step 2): a
 * rounded cube that names its expression, so the renderer can be exercised.
 */
export function CubbyArt({ pose, size, className }: { pose: Pose; size: number; reduced?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className={className} data-expression={pose.expression}>
      <rect x="10" y="10" width="80" height="80" rx="16" className="fill-primary" />
    </svg>
  );
}
