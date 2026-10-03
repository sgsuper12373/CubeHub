import Markdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";

/**
 * Renders a tutorial step's `content_md`. react-markdown never renders raw
 * HTML, so community-submitted content can't inject markup. Elements are
 * styled here with theme tokens; there is no typography plugin.
 *
 * `remark-breaks` keeps single line breaks, which the content relies on
 * (e.g. an algorithm on one line and its explanation on the next).
 */
const components: Components = {
  h2: ({ children }) => (
    <h2 className="mt-6 text-lg font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-muted-foreground first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="mt-2 first:mt-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-primary/70">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-2 list-decimal space-y-1 pl-5 marker:font-semibold marker:text-primary/70">
      {children}
    </ol>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  code: ({ children }) => (
    <code className="rounded border border-border/50 bg-background/50 px-1.5 py-0.5 font-mono text-[0.9em]">
      {children}
    </code>
  ),
  a: ({ children, href }) => (
    <a href={href} className="font-medium text-primary underline underline-offset-2">
      {children}
    </a>
  ),
};

export function StepMarkdown({
  content,
  title,
}: {
  content: string;
  /** The card's own title. A leading `## …` heading repeating it is dropped. */
  title?: string;
}) {
  let source = content.trim();
  const lead = source.match(/^##\s+(.+)\n*/);
  if (lead && title && lead[1].toLowerCase().includes(title.toLowerCase())) {
    source = source.slice(lead[0].length);
  }

  return (
    <div className="text-sm leading-relaxed text-foreground/90 sm:text-base">
      <Markdown components={components} remarkPlugins={[remarkBreaks]}>
        {source}
      </Markdown>
    </div>
  );
}
