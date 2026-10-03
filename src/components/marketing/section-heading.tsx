import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The landing page's one heading pattern: an eyebrow chip, an H2 and a lead.
 *
 * Plain text on purpose. The old per-character GSAP headings put
 * `bg-clip-text text-transparent` on a parent of transformed spans, so the
 * gradient never painted and every section title rendered as blank space.
 * Motion now comes from the `.reveal` class (globals.css), which never hides
 * text where scroll-driven animations aren't supported.
 */
export function SectionHeading({
  eyebrow,
  icon: Icon,
  title,
  lead,
  align = "left",
  className,
}: {
  eyebrow: string;
  icon?: LucideIcon;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "reveal flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start",
        className,
      )}
    >
      <Eyebrow icon={Icon}>{eyebrow}</Eyebrow>
      <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
        {title}
      </h2>
      {lead && (
        <p className="max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
          {lead}
        </p>
      )}
    </div>
  );
}

export function Eyebrow({
  icon: Icon,
  children,
  className,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary",
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  );
}

/** "Soon" tag for surfaces that are still placeholders (Compete, Shop data). */
export function SoonTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full border border-border bg-surface-raised px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase",
        className,
      )}
    >
      Soon
    </span>
  );
}
