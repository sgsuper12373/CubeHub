"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { InspectionMode, TimerSettings } from "@/lib/timer/types";

/**
 * Server Action: persist DB-backed timer settings to user_settings.
 *
 * Maps client-side TimerSettings field names → DB column names:
 *   inspectionMode → inspection_type + custom_inspection_secs
 *   hideTimeWhileSolving → hide_time_while_solving
 *   showScramblePreview → show_scramble_preview
 *   trigger → timer_trigger
 *
 * Validates all inputs before writing. Only callable by authed users
 * (RLS policy: settings_all requires auth.uid() = user_id).
 */
export async function updateTimerSettings(
  partial: Partial<
    Pick<
      TimerSettings,
      | "inspectionMode"
      | "hideTimeWhileSolving"
      | "showScramblePreview"
      | "trigger"
    >
  >,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Build the update payload, mapping client fields to DB columns
  const update: Record<string, unknown> = {};

  if (partial.inspectionMode !== undefined) {
    const mode = partial.inspectionMode;
    if (!["off", "8s", "15s"].includes(mode))
      return { error: "Invalid inspection mode" };
    update.inspection_type = mapInspectionToDb(mode);
    update.custom_inspection_secs = mode === "8s" ? 8 : 15;
  }

  if (partial.hideTimeWhileSolving !== undefined) {
    if (typeof partial.hideTimeWhileSolving !== "boolean")
      return { error: "Invalid hide_time_while_solving" };
    update.hide_time_while_solving = partial.hideTimeWhileSolving;
  }

  if (partial.showScramblePreview !== undefined) {
    if (typeof partial.showScramblePreview !== "boolean")
      return { error: "Invalid show_scramble_preview" };
    update.show_scramble_preview = partial.showScramblePreview;
  }

  if (partial.trigger !== undefined) {
    if (!["spacebar", "touch"].includes(partial.trigger))
      return { error: "Invalid trigger" };
    update.timer_trigger = partial.trigger;
  }

  if (Object.keys(update).length === 0) return {};

  const { error } = await supabase
    .from("user_settings")
    .update(update)
    .eq("user_id", user.id);

  if (error) {
    console.error("updateTimerSettings failed:", error);
    return { error: error.message };
  }

  // Revalidate /timer so the server shell picks up new values
  revalidatePath("/timer");
  return {};
}

function mapInspectionToDb(
  mode: InspectionMode,
): "none" | "wca_15s" | "custom" {
  switch (mode) {
    case "off":
      return "none";
    case "8s":
      return "custom";
    case "15s":
      return "wca_15s";
  }
}
