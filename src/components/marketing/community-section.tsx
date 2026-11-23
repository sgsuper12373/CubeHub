import { Code2, Heart, IndianRupee, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SectionHeading } from "@/components/marketing/section-heading";
import { COMMUNITY_LINKS, CONTRIBUTE_URL } from "@/content/community";

const POINTS: { icon: LucideIcon; title: string; body: string; coming?: boolean }[] = [
  { icon: IndianRupee, title: "Prices in ₹", body: "Cube picks for your level and budget, from sellers who ship in India.", coming: true },
  { icon: Users, title: "College clubs", body: "Start your college's club today; tournament rooms for running your own competition are next." },
  { icon: Trophy, title: "India-first rankings", body: "National and state leaderboards, and a calendar of competitions across India.", coming: true },
];

/** "Built in India, for Indian cubers" (docs/landing-plan.md → section 6). */
export function CommunitySection() {
  const links = COMMUNITY_LINKS.filter((l) => l.url);
  return (
    <section
      id="community"
      aria-labelledby="community-heading"
      className="mx-auto flex min-h-[100svh] w-full max-w-6xl scroll-mt-16 flex-col justify-center gap-12 px-4 py-20"
    >
      <SectionHeading
        id="community-heading"
        eyebrow="Made here"
        icon={Heart}
        title="Built in India, for Indian cubers."
        lead="Not a localised Western product: prices, clubs and rankings that start from how cubing works here."
      />
      <ul className="grid gap-4 md:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, body, coming }) => (
          <li key={title} className="reveal rounded-3xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <Icon className="size-6 text-primary" aria-hidden />
              {coming && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Coming</span>
              )}
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>

      {links.length > 0 && (
        <ul className="flex flex-wrap gap-3" aria-label="CuberHub on social media">
          {links.map((l) => (
            <li key={l.name}>
              <a
                href={l.url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/50"
              >
                {l.name}
                {l.followers !== null && (
                  <span className="text-muted-foreground">{l.followers.toLocaleString("en-IN")}</span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="reveal flex flex-col gap-3 rounded-3xl border border-dashed border-primary/40 bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Code2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <p className="text-sm text-foreground">
            <span className="font-semibold">CuberHub is built by a student at IIT Palakkad.</span>{" "}
            <span className="text-muted-foreground">Designers, cubers and developers welcome.</span>
          </p>
        </div>
        {CONTRIBUTE_URL && (
          <a href={CONTRIBUTE_URL} className="shrink-0 text-sm font-semibold text-primary hover:underline">
            Contribute
          </a>
        )}
      </div>
    </section>
  );
}
