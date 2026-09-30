"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";

interface SaveCaseInput {
  id?: string;
  puzzle_type: string;
  subset: string;
  case_number?: number | string | null;
  name?: string | null;
  description?: string | null;
  setup_moves?: string | null;
  cube_state: string;
  thumbnail_url?: string | null;
}

interface SaveAlgInput {
  id?: string;
  case_id?: string;
  moves: string;
  is_main: boolean;
  label?: string | null;
}

export async function saveAlgorithmCase(data: SaveCaseInput) {
  await requireAdmin();
  const supabase = await createClient();
  
  if (data.id) {
    const { error } = await supabase.from("algorithm_cases").update({
      puzzle_type: data.puzzle_type,
      subset: data.subset,
      case_number: data.case_number ? Number(data.case_number) : null,
      name: data.name || null,
      description: data.description || null,
      setup_moves: data.setup_moves || null,
      cube_state: data.cube_state,
      thumbnail_url: data.thumbnail_url || null,
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
  } else {
    const { data: inserted, error } = await supabase.from("algorithm_cases").insert({
      puzzle_type: data.puzzle_type,
      subset: data.subset,
      case_number: data.case_number ? Number(data.case_number) : null,
      name: data.name || null,
      description: data.description || null,
      setup_moves: data.setup_moves || null,
      cube_state: data.cube_state,
      thumbnail_url: data.thumbnail_url || null,
    }).select().single();
    if (error) throw new Error(error.message);
    return inserted.id;
  }
  
  revalidatePath("/learn");
  revalidatePath("/master-access/algorithms");
  return data.id;
}

export async function deleteAlgorithmCase(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("algorithm_cases").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/learn");
  revalidatePath("/master-access/algorithms");
}

export async function saveAlgorithm(data: SaveAlgInput) {
  const profile = await requireAdmin();
  const supabase = await createClient();
  
  if (data.id) {
    const { error } = await supabase.from("algorithms").update({
      moves: data.moves,
      is_main: data.is_main,
      is_approved: true,
      label: data.label || null,
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("algorithms").insert({
      case_id: data.case_id,
      moves: data.moves,
      is_main: data.is_main,
      is_approved: true,
      label: data.label || null,
      submitted_by: profile.id,
    });
    if (error) throw new Error(error.message);
  }
  
  revalidatePath("/learn");
  revalidatePath("/master-access/algorithms");
}

export async function deleteAlgorithm(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("algorithms").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/learn");
  revalidatePath("/master-access/algorithms");
}
