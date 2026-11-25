import type { BrowVariant } from "@/components/cubby/art/manifest";
import { EYE_LEFT, EYE_RIGHT } from "@/components/cubby/art/geometry";

/** Outer and inner end heights above the eye centre, per variant (left brow; the right mirrors it). */
const SHAPE: Record<BrowVariant, { outer: number; inner: number }> = {
  neutral: { outer: 13.5, inner: 13.5 },
  raised: { outer: 16, inner: 17 },
  worried: { outer: 12.5, inner: 17 },
  focused: { outer: 15.5, inner: 11.5 },
  relaxed: { outer: 11.5, inner: 11.5 },
};

export function Brows({ variant }: { variant: BrowVariant }) {
  const { outer, inner } = SHAPE[variant];
  const l = EYE_LEFT;
  const r = EYE_RIGHT;
  return (
    <g className="cubby-ink-line" strokeWidth={2.8}>
      <path d={`M${l.x - 6} ${l.y - outer} L${l.x + 5} ${l.y - inner}`} />
      <path d={`M${r.x - 5} ${r.y - inner} L${r.x + 6} ${r.y - outer}`} />
    </g>
  );
}
