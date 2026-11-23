import { ROADMAP_COLUMNS, roadmapColumn, STATUS_LABEL, type RoadmapStatus } from "@/content/roadmap";
import { cn } from "@/lib/utils";

const CHIP: Record<RoadmapStatus, string> = {
  shipped: "bg-primary/15 text-primary",
  building: "bg-accent-2/15 text-accent-2",
  planned: "bg-muted text-muted-foreground",
};

/** Now / Next / Later. Shared by the landing page and /roadmap. */
export function RoadmapBoard({ headingLevel = 3 }: { headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {ROADMAP_COLUMNS.map((col) => (
        <section key={col.id} aria-labelledby={`roadmap-${col.id}`} className="reveal rounded-3xl border border-border bg-card p-5">
          <Heading id={`roadmap-${col.id}`} className="text-lg font-semibold text-foreground">
            {col.title}
          </Heading>
          <p className="text-xs text-muted-foreground">{col.lead}</p>
          <ul className="mt-4 flex flex-col gap-3">
            {roadmapColumn(col.id).map((item) => (
              <li key={item.title} className="rounded-2xl bg-muted/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", CHIP[item.status])}>
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
