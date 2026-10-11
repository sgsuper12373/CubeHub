import { THEMES } from "./index";
import { LEGACY_THEME_VALUES, SYSTEM_THEMES, THEME_COOKIE } from "./preference";

const modes = Object.fromEntries(THEMES.map((t) => [t.id, t.mode]));
// Cookie values that name a concrete theme. Anything else (no cookie,
// "system", junk) parses to "system" and is resolved here.
const explicit = [...THEMES.map((t) => t.id), ...Object.keys(LEGACY_THEME_VALUES)];

/**
 * Inline <head> script that runs before first paint. The server already
 * renders `data-theme` and `.dark` from the cookie, so this only acts when the
 * preference is "system" (including no cookie, the default): it reads `prefers-color-scheme` and applies the
 * matching theme. Kept as a string built from the registry so theme ids and
 * modes can't drift from src/themes. `color-scheme` comes from the generated
 * [data-theme] CSS, so it isn't set here.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=([^;]*)/);if(m&&${JSON.stringify(explicit)}.indexOf(m[1])>=0)return;var s=${JSON.stringify(SYSTEM_THEMES)},o=${JSON.stringify(modes)},id=s[matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"],r=document.documentElement;r.setAttribute("data-theme",id);r.classList.toggle("dark",o[id]==="dark")}catch(e){}})()`;
