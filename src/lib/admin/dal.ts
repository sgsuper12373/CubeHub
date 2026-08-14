import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/dal";

export const getAllAlgorithmCases = cache(async () => {
  await requireAdmin();
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("algorithm_cases")
    .select("*, algorithms(*)")
    .order("puzzle_type")
    .order("subset")
    .order("case_number");
    
  if (error) {
    console.error("Failed to fetch cases:", error);
    return [];
  }
  
  return data;
});
