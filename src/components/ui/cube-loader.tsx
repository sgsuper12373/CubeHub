import { cn } from "@/lib/utils";

/**
 * The branded loading animation (design brief C2): a wireframe cube tumbling
 * on multiple axes, its edges cycling white↔teal. Pure CSS — the `@keyframes`
 * (`cube-loader-tumble`, `cube-loader-facepulse`) live in globals.css, which
 * also slows/stills it under `prefers-reduced-motion`. No JS animation loop, so
 * it stays cheap enough to sit behind any lazy chunk or route transition.
 */

/** The six faces of a unit cube, each pushed out half an edge along its normal. */
const FACE_TRANSFORMS = [
  "translateZ(var(--half))",
  "rotateY(180deg) translateZ(var(--half))",
  "rotateY(90deg) translateZ(var(--half))",
  "rotateY(-90deg) translateZ(var(--half))",
  "rotateX(90deg) translateZ(var(--half))",
  "rotateX(-90deg) translateZ(var(--half))",
];

export function CubeLoader({
  size = 44,
  className,
  label = "Loading",
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center justify-center", className)}
      style={{ width: size, height: size, perspective: size * 4 }}
    >
      <div
        className="cube-loader__cube relative"
        style={{
          width: size,
          height: size,
          transformStyle: "preserve-3d",
          animation: "cube-loader-tumble 2.4s linear infinite",
          // Read by each face's translateZ.
          "--half": `${size / 2}px`,
        } as React.CSSProperties}
      >
        {FACE_TRANSFORMS.map((transform, i) => (
          <span
            key={i}
            className="cube-loader__face absolute rounded-[2px] border-2 bg-primary/5"
            style={{
              width: size,
              height: size,
              transform,
              animation: "cube-loader-facepulse 1.6s ease-in-out infinite",
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </div>
      <span className="sr-only">{label}…</span>
    </div>
  );
}
