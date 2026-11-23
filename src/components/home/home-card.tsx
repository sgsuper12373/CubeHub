import Link from "next/link";

import { Card } from "@/components/ui/card";
import type { CardId } from "@/lib/home/cards";
import { cn } from "@/lib/utils";

/**
 * Every Home card's frame: an h2 title row with an optional "See all" link,
 * the existing Card, and `data-tour="home-<id>"` for Cubby's Home tour.
 */
export function HomeCard({
  id,
  title,
  seeAll,
  className,
  children,
}: {
  id: CardId;
  title: string;
  seeAll?: { href: string; label?: string };
  className?: string;
  children: React.ReactNode;
}) {
  const headingId = `home-card-${id}`;
  return (
    <Card data-tour={`home-${id}`} aria-labelledby={headingId} role="region" className={cn("gap-3", className)}>
      <div className="flex items-center justify-between gap-2 px-4">
        <h2 id={headingId} className="text-sm font-semibold text-foreground">
          {title}
        </h2>
        {seeAll && (
          <Link href={seeAll.href} className="text-xs font-medium text-primary hover:underline">
            {seeAll.label ?? "See all"}
          </Link>
        )}
      </div>
      <div className="px-4">{children}</div>
    </Card>
  );
}

/** A card-shaped placeholder while a card's data loads. */
export function HomeCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("h-40 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10 motion-reduce:animate-none", className)}
    />
  );
}
