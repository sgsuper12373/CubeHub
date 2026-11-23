import { ChevronDown, HelpCircle } from "lucide-react";

import { SectionHeading } from "@/components/marketing/section-heading";
import { FAQ } from "@/content/faq";

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
      className="mx-auto flex w-full max-w-3xl scroll-mt-16 flex-col gap-10 px-4 py-24"
    >
      <SectionHeading id="faq-heading" eyebrow="FAQ" icon={HelpCircle} title="Questions cubers ask." align="center" />
      <div className="flex flex-col divide-y divide-border rounded-3xl border border-border bg-card">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md text-left font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
              <h3 className="text-base">{q}</h3>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
