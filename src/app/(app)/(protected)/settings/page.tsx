import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getTimerSettings } from "@/lib/auth/dal";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata: Metadata = {
  title: "Settings — CubeHub",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const initialSettings = await getTimerSettings();

  return (
    <div className="flex flex-1 flex-col items-center p-6 md:p-12">
      <SettingsForm initialSettings={initialSettings} userId={user.id} />
    </div>
  );
}
