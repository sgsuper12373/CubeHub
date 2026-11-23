import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { ChapterVisual } from "@/components/marketing/feature-chapters";
import { SiteFooter } from "@/components/marketing/cta-band";
import { buttonVariants } from "@/components/ui/button";
import { FEATURE_PAGES, type FeaturePageContent } from "@/content/features";
import { appHref } from "@/lib/marketing/links";
import { cn } from "@/lib/utils";

/**
 * The template every feature page shares (docs/landing-plan.md → SEO and
 * sharing): an h1, the landing chapter's visual in its finished state, a few
 * short sections, a link into the app, and the other features.
 */
export function FeaturePage({ page }: { page: FeaturePageContent }) {
  const others = FEATURE_PAGES.filter((p) => p.slug !== page.slug);
  return (
    <>
      <article className="mx-auto w-full max-w-6xl px-4 py-16 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-5">
            <p className="text-sm font-medium text-primary">{page.eyebrow}</p>
            <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">{page.title}</h1>
            <p className="text-lg text-pretty text-muted-foreground">{page.lead}</p>
            <Link
              href={appHref(page.cta.path)}
              className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full px-7 text-base font-semibold")}
            >
              {page.cta.label}
              <ArrowRight data-icon="inline-end" className="size-4" />
            </Link>
          </div>
          <ChapterVisual id={page.visual} />
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-2">
          {page.sections.map((s) => (
            <section key={s.title} className="rounded-3xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>

        <nav aria-label="More features" className="mt-20">
          <h2 className="text-sm font-semibold text-foreground">More in CuberHub</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {others.map((o) => (
              <li key={o.slug}>
                <Link
                  href={`/features/${o.slug}`}
                  className="inline-flex rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/50"
                >
                  {o.eyebrow}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
      <SiteFooter />
    </>
  );
}
