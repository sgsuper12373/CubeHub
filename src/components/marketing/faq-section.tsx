import { ChevronDown, HelpCircle } from "lucide-react";

import { SectionHeading } from "@/components/marketing/section-heading";
import { FAQ } from "@/content/faq";
import { cn } from "@/lib/utils";

const HALF = Math.ceil(FAQ.length / 2);
const FAQ_COLUMNS = [FAQ.slice(0, HALF), FAQ.slice(HALF)];

/** The FAQ as structured data, for search results (docs/landing-plan.md → SEO). */
export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
}

/**
 * FAQ (docs/landing-plan.md → section 8): native details/summary, so it opens
 * with the keyboard and without JavaScript, and the answers are in the HTML.
 */
export function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-20"
    >
      <SectionHeading id="faq-heading" eyebrow="FAQ" icon={HelpCircle} title="Questions cubers ask." align="center" />
      {/* Two columns from md: eight closed questions in one column were the page's longest plain list. */}
      <div className="grid md:grid-cols-2 md:gap-4">
        {FAQ_COLUMNS.map((column, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col divide-y divide-border border border-border bg-card md:rounded-3xl",
              // One card below md: the two halves join.
              i === 0 ? "rounded-t-3xl" : "-mt-px rounded-b-3xl md:mt-0",
            )}
          >
            {column.map(({ q, a }) => (
              <details key={q} className="group px-5 py-3 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md text-left font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                  <h3 className="text-base">{q}</h3>
                  <ChevronDown
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
                    aria-hidden
                  />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
