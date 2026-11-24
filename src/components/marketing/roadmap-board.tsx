import { ROADMAP_COLUMNS, roadmapColumn, STATUS_LABEL, type RoadmapStatus } from "@/content/roadmap";
import { cn } from "@/lib/utils";

const CHIP: Record<RoadmapStatus, string> = {
  shipped: "bg-primary/15 text-primary",
  building: "bg-accent-2/15 text-accent-2",
  planned: "bg-muted text-muted-foreground",
};

/**
 * Now / Next / Later. Shared by the landing page and /roadmap. `compact` (the
 * landing page) keeps each item to its title and status below lg, where three
 * narrow columns of details made the section the page's tallest; /roadmap
 * always shows the details.
 */
export function RoadmapBoard({ headingLevel = 3, compact = false }: { headingLevel?: 2 | 3; compact?: boolean }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {ROADMAP_COLUMNS.map((col) => (
        <section key={col.id} aria-labelledby={`roadmap-${col.id}`} className="reveal rounded-3xl border border-border bg-card p-5">
          <Heading id={`roadmap-${col.id}`} className="text-lg font-semibold text-foreground">
            {col.title}
          </Heading>
          <p className={cn("text-xs text-muted-foreground", compact && "hidden lg:block")}>{col.lead}</p>
          <ul className={cn("mt-4 flex flex-col", compact ? "gap-2 lg:gap-3" : "gap-3")}>
            {roadmapColumn(col.id).map((item) => (
              <li key={item.title} className={cn("rounded-2xl bg-muted/40", compact ? "px-3 py-2.5 lg:p-3" : "p-3")}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                      CHIP[item.status],
                      // Compact: the column title already says Shipped or Planned; only "Building" adds news.
                      compact && item.status !== "building" && "hidden lg:inline",
                    )}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
                <p className={cn("mt-1 text-xs leading-relaxed text-muted-foreground", compact && "hidden lg:block")}>
                  {item.detail}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
