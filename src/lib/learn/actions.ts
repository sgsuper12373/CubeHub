"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";

export async function toggleAlgorithmBookmark(algorithmId: string, learned: boolean) {
  const user = await getUser();
  if (!user) {
    throw new Error("Must be logged in to track progress");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("user_algorithm_bookmarks")
    .upsert(
      {
        user_id: user.id,
        algorithm_id: algorithmId,
        learned,
      },
      { onConflict: "user_id, algorithm_id" }
    );

  if (error) {
    console.error("Failed to toggle bookmark:", error);
    throw new Error("Failed to update progress");
  }

  revalidatePath("/learn", "layout");
}

export async function toggleTutorialStepProgress(stepId: string, completed: boolean) {
  const user = await getUser();
  if (!user) {
    throw new Error("Must be logged in to track progress");
  }

  const supabase = await createClient();

  if (completed) {
    const { error } = await supabase
      .from("user_tutorial_progress")
      .upsert(
        {
          user_id: user.id,
          step_id: stepId,
        },
        { onConflict: "user_id, step_id" }
      );

    if (error) {
      console.error("Failed to save progress:", error);
      throw new Error("Failed to update progress");
    }
  } else {
    const { error } = await supabase
      .from("user_tutorial_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("step_id", stepId);

    if (error) {
      console.error("Failed to delete progress:", error);
      throw new Error("Failed to update progress");
    }
  }

  revalidatePath("/learn", "layout");
}
