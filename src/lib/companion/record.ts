import { parseCompanionSettings, type CompanionSettings } from "@/lib/companion/settings";
import { parseTours, type ToursRecord } from "@/lib/companion/tours";

/**
 * Everything Cubby remembers for one cuber: settings and tour progress.
 * Guests keep it in localStorage (`cubehub.companion.v1`); members in
 * `user_settings.companion` (migration 20261126000000). Same shape in both,
 * so a guest's record copies straight up on sign-in.
 */
export interface CompanionRecord {
  settings: CompanionSettings;
  tours: ToursRecord;
}

export const LOCAL_KEY = "cubehub.companion.v1";

export function parseRecord(raw: unknown): CompanionRecord {
  const v = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return { settings: parseCompanionSettings(v.settings), tours: parseTours(v.tours) };
}

export function loadLocalRecord(): CompanionRecord | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? parseRecord(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveLocalRecord(record: CompanionRecord): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(record));
  } catch {
    // Storage full or blocked: settings last for this page view only.
  }
}
