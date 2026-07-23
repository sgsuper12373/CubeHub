import { cn } from "@/lib/utils";

/**
 * The isometric cube mark: three visible faces of a cube, teal, with the two
 * side faces stepped down in opacity to read as a light source from the top.
 * Decorative — always paired with the wordmark, so it carries `aria-hidden`.
 */
export function CubeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("text-primary", className)}
      fill="none"
      aria-hidden
    >
      <path d="M12 2 21 7 12 12 3 7Z" fill="currentColor" opacity="0.95" />
      <path d="M3 7 12 12 12 22 3 17Z" fill="currentColor" opacity="0.5" />
      <path d="M21 7 12 12 12 22 21 17Z" fill="currentColor" opacity="0.72" />
    </svg>
  );
}

/**
 * The full CubeHub lockup — mark + wordmark. `Hub` picks up the teal accent so
 * the name always carries the brand colour even where the mark is omitted.
 */
export function Logo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight",
        className,
      )}
    >
      <CubeMark className={cn("size-5", markClassName)} />
      <span className="text-foreground">
        Cube<span className="text-primary">Hub</span>
      </span>
    </span>
  );
}
