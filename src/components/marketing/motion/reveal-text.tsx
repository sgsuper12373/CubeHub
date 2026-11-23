import { cn } from "@/lib/utils";

type Tag = "h1" | "h2" | "h3" | "p" | "span";

/**
 * Text that reveals word by word (or letter by letter): each piece fades in
 * and rises 10 px, 35 ms after the one before (docs/landing-plan.md → Motion
 * system).
 *
 * Pure CSS (globals.css → "Landing text reveal"), like the page's `.reveal`
 * sections: no JavaScript, so the full text is in the HTML, readable with
 * scripts off, and never left blank on a slow device. `trigger="load"` plays
 * once on page load (the hero); `"view"` is scroll-driven where the browser
 * supports `animation-timeline`, and simply shown where it doesn't. Reduced
 * motion shows it at rest.
 *
 * Screen readers get the plain string once: the wrapper carries it as
 * `aria-label`, the pieces are `aria-hidden`.
 */
export function RevealText({
  text,
  as: Component = "span",
  by = "word",
  trigger = "view",
  delayMs = 0,
  staggerMs = 35,
  className,
}: {
  text: string;
  as?: Tag;
  by?: "word" | "letter";
  trigger?: "load" | "view";
  delayMs?: number;
  staggerMs?: number;
  className?: string;
}) {
  const pieces = by === "word" ? text.split(/(\s+)/) : Array.from(text);
  let index = 0;
  return (
    <Component aria-label={text} data-reveal-text={trigger} className={cn("reveal-text", className)}>
      {pieces.map((piece, i) => {
        if (/^\s+$/.test(piece)) return piece;
        const style = { "--reveal-delay": `${delayMs + index++ * staggerMs}ms` } as React.CSSProperties;
        return (
          <span key={i} aria-hidden className="reveal-piece" style={style}>
            {piece}
          </span>
        );
      })}
    </Component>
  );
}
