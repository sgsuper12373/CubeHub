import { THEMES } from "./index";
import { LEGACY_THEME_VALUES, SYSTEM_THEMES, THEME_COOKIE } from "./preference";

const modes = Object.fromEntries(THEMES.map((t) => [t.id, t.mode]));
// Cookie values that name a concrete theme, mapped to its id. Anything else
// (no cookie, "system", junk) parses to "system" and follows the OS.
const explicit: Record<string, string> = {
  ...Object.fromEntries(THEMES.map((t) => [t.id, t.id])),
  ...LEGACY_THEME_VALUES,
};

/**
 * Inline <head> script that runs before first paint. The server renders the
 * default theme for everyone (the root layout doesn't read cookies, so pages
 * can be static), and this applies the `cubehub-theme` cookie: an explicit or
 * legacy theme as is, "system" (including no cookie, the default) by
 * `prefers-color-scheme`. Kept as a string built from the registry so theme
 * ids and modes can't drift from src/themes. `color-scheme` comes from the
 * generated [data-theme] CSS, so it isn't set here.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=([^;]*)/),e=${JSON.stringify(explicit)},s=${JSON.stringify(SYSTEM_THEMES)},o=${JSON.stringify(modes)},id=m&&e.hasOwnProperty(m[1])?e[m[1]]:s[matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"],r=document.documentElement;r.setAttribute("data-theme",id);r.classList.toggle("dark",o[id]==="dark")}catch(e){}})()`;
