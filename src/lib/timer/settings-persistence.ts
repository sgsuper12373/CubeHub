import type { TimerSettings } from "./types";
import { DEFAULT_TIMER_SETTINGS } from "./types";

/**
 * Dual-storage persistence for timer settings.
 *
 * DB-backed fields (authed users):
 *   inspection_type, hide_time_while_solving, show_scramble_preview, timer_trigger
 *   → saved via server action, loaded via getTimerSettings() in dal.ts
 *
 * Client-only fields (localStorage for everyone):
 *   holdMs, precision, voiceEnabled, previewDimension
 *   → never synced to the cloud; these are per-device preferences
 *
 * `previewDimension` is deliberately client-only. `show_scramble_preview`
 * stays the DB-backed master switch; a column for 2D-vs-3D would mean a
 * migration for a per-device display choice.
 */

const CLIENT_SETTINGS_KEY = "cubehub.settings.v1";

interface ClientOnlySettings {
  holdMs: number;
  precision: 2 | 3;
  voiceEnabled: boolean;
  previewDimension: "2D" | "3D";
}

const CLIENT_DEFAULTS: ClientOnlySettings = {
  holdMs: DEFAULT_TIMER_SETTINGS.holdMs,
  precision: DEFAULT_TIMER_SETTINGS.precision,
  voiceEnabled: DEFAULT_TIMER_SETTINGS.voiceEnabled,
  previewDimension: DEFAULT_TIMER_SETTINGS.previewDimension,
};

/** Read client-only settings from localStorage. */
export function loadClientSettings(): ClientOnlySettings {
  if (typeof window === "undefined") return CLIENT_DEFAULTS;
  try {
    const raw = localStorage.getItem(CLIENT_SETTINGS_KEY);
    if (!raw) return CLIENT_DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      holdMs:
        typeof parsed.holdMs === "number" &&
        parsed.holdMs >= 150 &&
        parsed.holdMs <= 550
          ? parsed.holdMs
          : CLIENT_DEFAULTS.holdMs,
      precision:
        parsed.precision === 2 || parsed.precision === 3
          ? parsed.precision
          : CLIENT_DEFAULTS.precision,
      voiceEnabled:
        typeof parsed.voiceEnabled === "boolean"
          ? parsed.voiceEnabled
          : CLIENT_DEFAULTS.voiceEnabled,
      previewDimension:
        parsed.previewDimension === "2D" || parsed.previewDimension === "3D"
          ? parsed.previewDimension
          : CLIENT_DEFAULTS.previewDimension,
    };
  } catch {
    return CLIENT_DEFAULTS;
  }
}

/** Save client-only settings to localStorage. */
export function saveClientSettings(partial: Partial<ClientOnlySettings>): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadClientSettings();
    const next = { ...current, ...partial };
    localStorage.setItem(CLIENT_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // Quota or private-mode failures
  }
}

/**
 * Persist DB-backed settings via server action. Only called for authed users.
 * Maps the client-side TimerSettings fields to the DB column names.
 */
export async function saveServerSettings(
  partial: Partial<
    Pick<
      TimerSettings,
      | "inspectionMode"
      | "hideTimeWhileSolving"
      | "showScramblePreview"
      | "trigger"
    >
  >,
): Promise<void> {
  const { updateTimerSettings } = await import("@/lib/actions/update-settings");
  await updateTimerSettings(partial);
}

/**
 * Save settings — routes to the right storage based on what changed.
 * Called from the quick-settings popover and the full settings page.
 */
export function saveSettings(
  partial: Partial<TimerSettings>,
  isAuthed: boolean,
): void {
  // Client-only fields → localStorage
  const clientFields: Partial<ClientOnlySettings> = {};
  if (partial.holdMs !== undefined) clientFields.holdMs = partial.holdMs;
  if (partial.precision !== undefined) clientFields.precision = partial.precision;
  if (partial.voiceEnabled !== undefined)
    clientFields.voiceEnabled = partial.voiceEnabled;
  if (partial.previewDimension !== undefined)
    clientFields.previewDimension = partial.previewDimension;
  if (Object.keys(clientFields).length > 0) saveClientSettings(clientFields);

  // DB-backed fields → server action (authed only)
  if (!isAuthed) return;
  const serverFields: Partial<
    Pick<
      TimerSettings,
      | "inspectionMode"
      | "hideTimeWhileSolving"
      | "showScramblePreview"
      | "trigger"
    >
  > = {};
  if (partial.inspectionMode !== undefined)
    serverFields.inspectionMode = partial.inspectionMode;
  if (partial.hideTimeWhileSolving !== undefined)
    serverFields.hideTimeWhileSolving = partial.hideTimeWhileSolving;
  if (partial.showScramblePreview !== undefined)
    serverFields.showScramblePreview = partial.showScramblePreview;
  if (partial.trigger !== undefined) serverFields.trigger = partial.trigger;
  if (Object.keys(serverFields).length > 0)
    void saveServerSettings(serverFields);
}
