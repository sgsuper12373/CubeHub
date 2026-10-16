/**
 * Raw brand colours for code that cannot read CSS variables: the favicon
 * canvas falls back to these if a token fails to resolve. They are Slate's
 * --background, --primary and --foreground. Components use the tokens.
 */
export const BRAND_FALLBACK = {
  background: "#0f172a",
  primary: "#00d4aa",
  foreground: "#f8fafc",
} as const;
