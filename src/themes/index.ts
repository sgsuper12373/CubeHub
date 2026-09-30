import { base } from "./base";
import { paper } from "./paper";
import { slate } from "./slate";

export { base } from "./base";
export type { ThemeDefinition, TokenName, Tokens } from "./types";

/** Every user-selectable theme. The first entry is the default. */
export const THEMES = [slate, paper] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME_ID: ThemeId = slate.id;

/** The base plus a theme's overrides: every token's value for that theme. */
export function resolveTokens(theme: (typeof THEMES)[number]) {
  return { ...base.tokens, ...theme.tokens };
}
