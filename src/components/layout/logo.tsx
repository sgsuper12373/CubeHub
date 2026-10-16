import { cn } from "@/lib/utils";

/**
 * CubeHub "CH" mark: an isometric wireframe cube with a 3D C wrapped around
 * its left corner and an H standing on its right face.
 *
 * Colours come from theme tokens, so the mark recolours with the theme:
 *   --logo-c     C, wireframe, nodes, glow  (default --primary)
 *   --logo-h     H and the small cube       (default --foreground)
 *   --logo-wire  wireframe                  (default: same as --logo-c)
 * Face shading is derived with color-mix() in src/app/globals.css ("CubeHub
 * brand mark + wordmark"). See docs/brand.md.
 * Set data-logo="classic" on any ancestor for the original blue/orange look.
 */
export function CubeMark({
  className,
  glow = true,
  title,
}: {
  className?: string;
  /** Soft glow; only applied in dark themes (see logo.css). */
  glow?: boolean;
  /** Give the mark an accessible name when it appears without the wordmark. */
  title?: string;
}) {
  return (
    <svg
      viewBox="-85.6 -104.8 171.1 202.2"
      className={cn("chm", glow && "chm--glow", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <g className="chm-wire">
        <path d="M0.00 -85.80 L76.56 -41.60 L76.56 44.20 L0.00 88.40 L-76.56 44.20 L-76.56 -41.60Z" />
        <path className="chm-inner" d="M-76.56 -41.60 L0.00 2.60 L76.56 -41.60 M0.00 2.60 L0.00 88.40" />
      </g>
      <g className="chm-nodes">
        <circle cx="0.00" cy="-85.80" r="3" />
        <circle cx="76.56" cy="-41.60" r="3" />
        <circle cx="76.56" cy="44.20" r="3" />
        <circle cx="0.00" cy="88.40" r="3" />
        <circle cx="-76.56" cy="44.20" r="3" />
        <circle cx="-76.56" cy="-41.60" r="3" />
        <circle cx="0.00" cy="2.60" r="3" />
      </g>
      <g className="chm-letters">
        <path className="chm-c chm-px" d="M-31.07 -34.84 L11.71 -59.54 L11.71 -40.82 L-31.07 -16.12Z" />
        <path className="chm-c chm-py" d="M-47.28 -44.20 L-31.07 -34.84 L-31.07 -16.12 L-47.28 -25.48Z" />
        <path className="chm-c chm-top" d="M-4.50 -68.90 L11.71 -59.54 L-31.07 -34.84 L-47.28 -44.20Z" />
        <path className="chm-c chm-px" d="M11.93 -40.69 L28.15 -50.05 L28.15 -31.33 L11.93 -21.97Z" />
        <path className="chm-c chm-py" d="M-4.50 -50.18 L11.93 -40.69 L11.93 -21.97 L-4.50 -31.46Z" />
        <path className="chm-c chm-top" d="M11.71 -59.54 L28.15 -50.05 L11.93 -40.69 L-4.50 -50.18Z" />
        <path className="chm-c chm-px" d="M-24.77 37.18 L-9.01 28.08 L-9.01 46.80 L-24.77 55.90Z" />
        <path className="chm-c chm-py" d="M-46.83 24.44 L-24.77 37.18 L-24.77 55.90 L-46.83 43.16Z" />
        <path className="chm-c chm-top" d="M-31.07 15.34 L-9.01 28.08 L-24.77 37.18 L-46.83 24.44Z" />
        <path className="chm-h chm-px" d="M49.54 -20.80 L65.30 -29.90 L65.30 33.80 L49.54 42.90Z" />
        <path className="chm-h chm-py" d="M33.77 -29.90 L49.54 -20.80 L49.54 42.90 L33.77 33.80Z" />
        <path className="chm-h chm-top" d="M49.54 -39.00 L65.30 -29.90 L49.54 -20.80 L33.77 -29.90Z" />
        <path className="chm-c chm-px" d="M-46.83 -25.74 L-31.07 -34.84 L-31.07 34.06 L-46.83 43.16Z" />
        <path className="chm-c chm-py" d="M-63.05 -35.10 L-46.83 -25.74 L-46.83 43.16 L-63.05 33.80Z" />
        <path className="chm-c chm-top" d="M-47.28 -44.20 L-31.07 -34.84 L-46.83 -25.74 L-63.05 -35.10Z" />
        <path className="chm-h chm-px" d="M27.02 16.38 L49.54 3.38 L49.54 18.98 L27.02 31.98Z" />
        <path className="chm-h chm-py" d="M11.26 7.28 L27.02 16.38 L27.02 31.98 L11.26 22.88Z" />
        <path className="chm-h chm-top" d="M33.77 -5.72 L49.54 3.38 L27.02 16.38 L11.26 7.28Z" />
        <path className="chm-h chm-px" d="M34.90 -46.15 L48.86 -54.21 L48.86 -38.09 L34.90 -30.03Z" />
        <path className="chm-h chm-py" d="M20.94 -54.21 L34.90 -46.15 L34.90 -30.03 L20.94 -38.09Z" />
        <path className="chm-h chm-top" d="M34.90 -62.27 L48.86 -54.21 L34.90 -46.15 L20.94 -54.21Z" />
        <path className="chm-h chm-px" d="M11.26 1.30 L27.02 -7.80 L27.02 55.90 L11.26 65.00Z" />
        <path className="chm-h chm-py" d="M-4.50 -7.80 L11.26 1.30 L11.26 65.00 L-4.50 55.90Z" />
        <path className="chm-h chm-top" d="M11.26 -16.90 L27.02 -7.80 L11.26 1.30 L-4.50 -7.80Z" />
        <path className="chm-c chm-px" d="M-24.77 -13.00 L-9.01 -22.10 L-9.01 -3.38 L-24.77 5.72Z" />
        <path className="chm-c chm-py" d="M-46.83 -25.74 L-24.77 -13.00 L-24.77 5.72 L-46.83 -7.02Z" />
        <path className="chm-c chm-top" d="M-31.07 -34.84 L-9.01 -22.10 L-24.77 -13.00 L-46.83 -25.74Z" />
      </g>
    </svg>
  );
}

/** Navbar lockup: mark + live-text wordmark. */
export function Logo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CubeMark className={cn("size-8", markClassName)} />
      <span className="chm-wordmark text-lg">
        cube<span className="chm-wordmark-hub">hub</span>
      </span>
    </span>
  );
}

/**
 * Hero lockup for the landing page: large mark, wordmark and the tagline.
 * Text is live (selectable, sharp, themed), set in the brand font.
 * `as="h1"` makes it the page heading; everything inside is phrasing content
 * (the text wrapper is a span, laid out by .chm-lockup-text) so that's valid.
 */
export function BrandLockup({
  className,
  tagline = "The unified cubing platform",
  stacked = false,
  as: Tag = "div",
}: {
  className?: string;
  tagline?: string | null;
  /** Mark above the text (narrow screens) instead of beside it. */
  stacked?: boolean;
  as?: "div" | "h1";
}) {
  return (
    <Tag
      className={cn(
        "chm-lockup",
        stacked && "chm-lockup--stacked",
        className,
      )}
    >
      <CubeMark className="chm-lockup-mark" />
      <span className="chm-lockup-text">
        <span className="chm-wordmark chm-lockup-word">
          cube<span className="chm-wordmark-hub">hub</span>
        </span>
        {tagline ? <span className="chm-tagline">{tagline}</span> : null}
      </span>
    </Tag>
  );
}
