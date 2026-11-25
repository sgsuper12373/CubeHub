"use server";

import { getUser } from "@/lib/auth/dal";
import { parseRecord } from "@/lib/companion/record";
import { createClient } from "@/lib/supabase/server";

/** The column's check allows 8 KB; stay well under it. */
const MAX_BYTES = 6000;

/**
 * Saves a signed-in cuber's Cubby record (settings and tour progress) to
 * `user_settings.companion` (migration 20261126000000_companion.sql, not yet
 * applied). Parsed first, so only known fields with valid values are stored.
 * Before the migration is applied this fails quietly and the browser's copy
 * is what counts.
 */
export async function saveCompanionRecord(raw: unknown): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Sign in to save Cubby's settings to your account." };
  const record = parseRecord(raw);
  if (JSON.stringify(record).length > MAX_BYTES) return { error: "Too much to save." };

  const supabase = await createClient();
  const { error } = await supabase.from("user_settings").update({ companion: record }).eq("user_id", user.id);
  if (error) {
    console.error("saveCompanionRecord failed (is 20261126000000_companion.sql applied?):", error.message);
    return { error: "Couldn't save Cubby's settings to your account." };
  }
  return {};
}
