import { ArrowRight, Code2, Heart, Trophy, Users } from "lucide-react";
import Link from "next/link";

import { RealStats } from "@/components/marketing/real-stats";
import { SectionHeading } from "@/components/marketing/section-heading";
import { COMMUNITY_LINKS, CONTRIBUTE_URL } from "@/content/community";
import { appHref } from "@/lib/marketing/links";

/**
 * "Built in India, for Indian cubers" (docs/landing-plan.md → section 6). It
 * leads with what's live (college clubs) and keeps one thing that's coming;
 * the rest (prices in ₹, the calendar) lives on the roadmap, not here twice.
 */
export function CommunitySection() {
  const links = COMMUNITY_LINKS.filter((l) => l.url);
  return (
    <section
      id="community"
      aria-labelledby="community-heading"
      className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-20"
    >
      <SectionHeading
        id="community-heading"
        eyebrow="Made here"
        icon={Heart}
        title="Built in India, for Indian cubers."
        lead="It starts from how cubing works here, beginning with your college club."
      />
      <RealStats />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="reveal flex flex-col rounded-3xl border border-primary/30 bg-card p-6 md:col-span-2">
          <div className="flex items-center justify-between">
            <Users className="size-6 text-primary" aria-hidden />
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">Live</span>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">College clubs</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Start your college&apos;s cubing club or join one: posts, algorithms and videos, invite links, and roles for
            the people who run it. Tournament rooms for running your own competition are next.
          </p>
          <Link
            href={appHref("/clubs")}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Start or join a club
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="reveal flex flex-col rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <Trophy className="size-6 text-primary" aria-hidden />
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Coming</span>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">India-first rankings</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">National and state leaderboards.</p>
          <Link href="/#roadmap" className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-primary hover:underline">
            More on the roadmap
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

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
