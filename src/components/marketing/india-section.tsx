import { CalendarDays, IndianRupee, MapPin, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SectionHeading, SoonTag } from "@/components/marketing/section-heading";
import { cn } from "@/lib/utils";

const POINTS: {
  icon: LucideIcon;
  title: string;
  body: string;
  tone: "primary" | "accent-2" | "warning";
  soon?: boolean;
}[] = [
  {
    icon: IndianRupee,
    title: "Prices in ₹",
    body: "Recommendations from sellers who actually ship here, with real rupee prices instead of converted MSRPs.",
    tone: "primary",
  },
  {
    icon: Trophy,
    title: "Rankings that matter",
    body: "National and state leaderboards, so you're measured against the cubers you meet at local comps.",
    tone: "accent-2",
    soon: true,
  },
  {
    icon: CalendarDays,
    title: "The regional calendar",
    body: "Upcoming WCA competitions and community meets across India, in one list you can plan around.",
    tone: "warning",
    soon: true,
  },
];

// Literal class names so Tailwind can see them.
const TONE = {
  primary: "bg-primary/10 text-primary ring-primary/20",
  "accent-2": "bg-accent-2/10 text-accent-2 ring-accent-2/20",
  warning: "bg-warning/10 text-warning ring-warning/20",
} as const;

export function IndiaSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 md:py-28">
      <SectionHeading
        eyebrow="Made in India, for India"
        icon={MapPin}
        title="Built natively for cubers in India"
        lead="Most cubing sites price in dollars and rank you against the globe. This one starts at home."
      />

      <ul role="list" className="mt-12 grid gap-4 md:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, body, tone, soon }) => (
          <li key={title} className="reveal flex flex-col rounded-3xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <span className={cn("flex size-11 items-center justify-center rounded-xl ring-1", TONE[tone])}>
                <Icon className="size-5" aria-hidden />
              </span>
              {soon && <SoonTag />}
            </div>
            <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
