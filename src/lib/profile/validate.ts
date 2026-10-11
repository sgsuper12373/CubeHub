import { eventLabel, TIMER_EVENTS, type TimerEventId } from "@/lib/timer/events";

import { isMethod, type MethodValue } from "./level";

/**
 * Validation for profile edits. Pure, so it runs the same in the form (for
 * instant feedback) and in the server action (which is what actually guards
 * the database), and is unit-tested.
 */

export const DISPLAY_NAME_MAX = 60;
export const BIO_MAX = 500;

/** Paths under /profile that a username would otherwise shadow. */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set(["edit", "settings", "me", "new"]);

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase());
}

/** WCA IDs look like 2019SING01: year, four letters, two digits. */
export const WCA_ID_PATTERN = /^\d{4}[A-Z]{4}\d{2}$/;

// ISO 3166-1 alpha-2. Names come from Intl.DisplayNames, so this is just codes.
const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR " +
  "BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ " +
  "EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW " +
  "GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY " +
  "KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV " +
  "MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY " +
  "QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG " +
  "TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

const COUNTRY_SET: ReadonlySet<string> = new Set(COUNTRY_CODES);

export function isCountryCode(code: string): boolean {
  return COUNTRY_SET.has(code);
}

let regionNames: Intl.DisplayNames | null = null;

export function countryName(code: string): string {
  regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
  return regionNames.of(code) ?? code;
}

/** Every country for a select: India first, then the rest by name. */
export function countryOptions(): { code: string; name: string }[] {
  const rest = COUNTRY_CODES.filter((c) => c !== "IN")
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [{ code: "IN", name: countryName("IN") }, ...rest];
}

/** 🇮🇳 from "IN": two regional-indicator letters. */
export function countryFlag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export type ProfileInput = {
  displayName: string;
  bio: string;
  country: string;
  wcaId: string;
  isPublic: boolean;
  showActivity: boolean;
  showLearning: boolean;
  mainMethod: string;
  learningNow: string;
};

export type ProfileUpdate = {
  display_name: string | null;
  bio: string | null;
  country: string;
  wca_id: string | null;
  is_public: boolean;
  show_activity: boolean;
  show_learning: boolean;
  main_method: MethodValue | null;
  learning_now: string | null;
};

/** Trim, normalise and check the edit form; returns the row update or the first error. */
export function validateProfileInput(
  input: ProfileInput,
): { ok: true; update: ProfileUpdate } | { ok: false; field: keyof ProfileInput; error: string } {
  const displayName = input.displayName.trim().replace(/\s+/g, " ");
  if (displayName.length > DISPLAY_NAME_MAX) {
    return { ok: false, field: "displayName", error: `Keep your name under ${DISPLAY_NAME_MAX} characters.` };
  }

  // Keep line breaks the cuber typed, but no more than one blank line in a row.
  const bio = input.bio.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (bio.length > BIO_MAX) {
    return { ok: false, field: "bio", error: `Keep your bio under ${BIO_MAX} characters.` };
  }

  const country = input.country.trim().toUpperCase();
  if (!isCountryCode(country)) {
    return { ok: false, field: "country", error: "Choose a country from the list." };
  }

  const wcaId = input.wcaId.trim().toUpperCase();
  if (wcaId && !WCA_ID_PATTERN.test(wcaId)) {
    return { ok: false, field: "wcaId", error: "A WCA ID looks like 2019SING01." };
  }

  const mainMethod = input.mainMethod.trim();
  if (mainMethod && !isMethod(mainMethod)) {
    return { ok: false, field: "mainMethod", error: "Choose a method from the list." };
  }

  const learningNow = input.learningNow.trim().replace(/\s+/g, " ");
  if (learningNow.length > LEARNING_NOW_MAX) {
    return { ok: false, field: "learningNow", error: `Keep it under ${LEARNING_NOW_MAX} characters.` };
  }

  return {
    ok: true,
    update: {
      display_name: displayName || null,
      bio: bio || null,
      country,
      wca_id: wcaId || null,
      is_public: input.isPublic,
      show_activity: input.showActivity,
      show_learning: input.showLearning,
      main_method: mainMethod ? (mainMethod as MethodValue) : null,
      learning_now: learningNow || null,
    },
  };
}

export const LEARNING_NOW_MAX = 80;
export const CUBE_NAME_MAX = 80;

/**
 * Main cubes from the edit form, one per timer event: names to save, and
 * events whose name was cleared (their row is deleted).
 */
export function validateSetups(
  names: Partial<Record<TimerEventId, string>>,
): { ok: true; save: { puzzle_type: TimerEventId; cube_name: string }[]; cleared: TimerEventId[] } | { ok: false; error: string } {
  const save: { puzzle_type: TimerEventId; cube_name: string }[] = [];
  const cleared: TimerEventId[] = [];
  for (const { id } of TIMER_EVENTS) {
    const name = (names[id] ?? "").trim().replace(/\s+/g, " ");
    if (name.length > CUBE_NAME_MAX) {
      return { ok: false, error: `Keep the ${eventLabel(id)} cube name under ${CUBE_NAME_MAX} characters.` };
    }
    if (name) save.push({ puzzle_type: id, cube_name: name });
    else cleared.push(id);
  }
  return { ok: true, save, cleared };
}

/**
 * The only avatar URLs the app will save: a file in the caller's own folder
 * of the public `avatars` bucket. Anything else (another user's file, an
 * outside image) is refused, so a profile can't hotlink arbitrary content.
 */
export function isOwnAvatarUrl(url: string, supabaseUrl: string, userId: string): boolean {
  const prefix = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/avatars/${userId}/`;
  if (!url.startsWith(prefix)) return false;
  return /^[\w.-]+\.(webp|png|jpe?g)$/.test(url.slice(prefix.length));
}
