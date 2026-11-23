import { SiteFooter } from "@/components/marketing/cta-band";

/** A plain text page on the marketing site: one h1, readable measure, the footer. */
export function ProsePage({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <article className="mx-auto w-full max-w-3xl px-4 py-16 md:py-24">
        {eyebrow && <p className="text-sm font-medium text-primary">{eyebrow}</p>}
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">{title}</h1>
        {lead && <p className="mt-5 text-lg text-pretty text-muted-foreground">{lead}</p>}
        <div className="mt-10 flex flex-col gap-8 text-base leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a:hover]:underline [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
          {children}
        </div>
      </article>
      <SiteFooter />
    </>
  );
}
