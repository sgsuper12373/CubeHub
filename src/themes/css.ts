import { TOKEN_NAMES, type BaseTheme, type ThemeDefinition, type Tokens } from "./types";

const HEADER = `/* GENERATED FILE — do not edit.
   Source: src/themes/*.ts. Regenerate with \`npx vitest run -u\`
   (tests/unit/themes-css.test.ts fails while this file is stale). */
`;

// A theme id becomes a CSS selector and a value becomes a declaration, so
// refuse anything that could break out of either.
const ID_RE = /^[a-z][a-z0-9-]*$/;
const UNSAFE_VALUE_RE = /[;{}<>]|\/\*/;

function declarations(tokens: Partial<Tokens>, mode: BaseTheme["mode"]): string {
  const lines: string[] = [];
  for (const name of TOKEN_NAMES) {
    const value = tokens[name];
    if (value === undefined) continue;
    if (UNSAFE_VALUE_RE.test(value)) {
      throw new Error(`Unsafe value for --${name}: ${JSON.stringify(value)}`);
    }
    lines.push(`  --${name}: ${value};`);
  }
  lines.push(`  color-scheme: ${mode};`);
  return lines.join("\n");
}

/**
 * Emit the base on `:root`, then one `[data-theme]` block per theme. `:root`
 * and `[data-theme]` on <html> have equal specificity, so the base must come
 * first for the themes to win.
 */
export function themesToCss(
  baseTheme: BaseTheme,
  themes: readonly ThemeDefinition[],
): string {
  const blocks = [`:root {\n${declarations(baseTheme.tokens, baseTheme.mode)}\n}`];
  const seen = new Set<string>();
  for (const theme of themes) {
    if (!ID_RE.test(theme.id)) throw new Error(`Invalid theme id: ${theme.id}`);
    if (seen.has(theme.id)) throw new Error(`Duplicate theme id: ${theme.id}`);
    seen.add(theme.id);
    blocks.push(
      `/* ${theme.name} */\n[data-theme="${theme.id}"] {\n${declarations(theme.tokens, theme.mode)}\n}`,
    );
  }
  return `${HEADER}\n${blocks.join("\n\n")}\n`;
}
