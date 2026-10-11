import { cn } from "@/lib/utils";

const SIZES = {
  md: "size-16 rounded-2xl text-xl",
  lg: "size-20 rounded-2xl text-2xl",
} as const;

/** The avatar image, or the first two letters of the name on a tinted tile. */
export function ProfileAvatar({
  url,
  name,
  size = "lg",
  className,
}: {
  url: string | null;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border border-primary/30 bg-primary/10 font-bold text-primary",
        SIZES[size],
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        name.slice(0, 2).toUpperCase()
      )}
    </div>
  );
}
