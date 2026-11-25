import { BODY_OUTLINE, FRONT_STICKERS, SIDE_STICKERS, TOP_STICKERS } from "@/components/cubby/art/geometry";

/**
 * The cube: plastic underneath, then the stickers of the three visible faces.
 * Colours are classes (globals.css → Cubby), driven by theme tokens, so Cubby
 * re-stickers itself with the theme like the CH mark.
 */
export function Body() {
  return (
    <g>
      <path d={BODY_OUTLINE} className="cubby-plastic" strokeLinejoin="round" />
      <g className="cubby-top">
        {TOP_STICKERS.map((d) => (
          <path key={d} d={d} strokeLinejoin="round" />
        ))}
      </g>
      <g className="cubby-side">
        {SIDE_STICKERS.map((d) => (
          <path key={d} d={d} strokeLinejoin="round" />
        ))}
      </g>
      <g className="cubby-front">
        {FRONT_STICKERS.map((d) => (
          <path key={d} d={d} strokeLinejoin="round" />
        ))}
      </g>
    </g>
  );
}
