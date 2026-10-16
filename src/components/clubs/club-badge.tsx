import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-10 rounded-xl text-sm",
  md: "size-14 rounded-2xl text-lg",
  lg: "size-20 rounded-2xl text-2xl",
} as const;

// The chart series tokens: distinct hues in every theme, already tuned for
// contrast on the page background.
const HUES = ["--chart-1", "--chart-2", "--chart-3", "--primary", "--accent-2"] as const;

/** Same club, same colour: a small stable hash of the slug. */
function hueFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

/** No club pictures in v1 (docs/clubs.md): the first letters on a tinted tile. */
export function ClubBadge({
  name,
  slug,
  size = "sm",
  className,
}: {
  name: string;
  slug: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const hue = hueFor(slug);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center border font-bold", SIZES[size], className)}
      style={{
        color: `var(${hue})`,
        backgroundColor: `color-mix(in oklch, var(${hue}) 14%, transparent)`,
        borderColor: `color-mix(in oklch, var(${hue}) 35%, transparent)`,
      }}
    >
      {initials || "?"}
    </div>
  );
}
