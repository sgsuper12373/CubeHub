import { cn } from "@/lib/utils";

/**
 * The default entrance for cards and buttons (docs/landing-plan.md → Motion
 * system): fades up over 350 ms. `trigger="load"` plays on page load after
 * `delayMs`; `"view"` uses the page's scroll-driven `.reveal`. CSS only, so
 * nothing is hidden before it can animate, and reduced motion shows it at rest.
 */
export function FadeUp({
  trigger = "view",
  delayMs = 0,
  as: Component = "div",
  className,
  children,
}: {
  trigger?: "load" | "view";
  delayMs?: number;
  as?: "div" | "section" | "li" | "span";
  className?: string;
  children: React.ReactNode;
}) {
  if (trigger === "view") return <Component className={cn("reveal", className)}>{children}</Component>;
  return (
    <Component
      className={cn("fade-up-load", className)}
      style={{ "--reveal-delay": `${delayMs}ms` } as React.CSSProperties}
    >
      {children}
    </Component>
  );
}
