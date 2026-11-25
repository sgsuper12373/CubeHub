import "server-only";

import { cache } from "react";

import { parseRecord, type CompanionRecord } from "@/lib/companion/record";
import { createClient } from "@/lib/supabase/server";

let warned = false;

/**
 * The signed-in cuber's Cubby record, or null when they have none yet (or
 * the `companion` column doesn't exist yet: the migration is applied by
 * hand, and Cubby must work before it is; logged once).
 */
export const getCompanionRecord = cache(async (userId: string): Promise<CompanionRecord | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_settings").select("companion").eq("user_id", userId).maybeSingle();
  if (error) {
    if (!warned) console.error("getCompanionRecord failed (is 20261126000000_companion.sql applied?):", error.message);
    warned = true;
    return null;
  }
  const raw = (data as { companion?: unknown } | null)?.companion ?? null;
  return raw === null ? null : parseRecord(raw);
});
