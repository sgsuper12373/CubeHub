import { HIPS } from "@/components/cubby/art/geometry";

/** Two short legs with rounded feet. */
export function Legs() {
  return (
    <g>
      {HIPS.map((h, i) => (
        <g key={h.x}>
          <path d={`M${h.x} ${h.y} L${h.x} ${h.y + 13}`} className="cubby-limb" strokeWidth={5.5} />
          <ellipse cx={h.x + (i === 0 ? -2 : 2)} cy={h.y + 16} rx={6.5} ry={3.4} className="cubby-hand" />
        </g>
      ))}
    </g>
  );
}
