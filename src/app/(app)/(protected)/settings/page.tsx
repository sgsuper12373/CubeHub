import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getProfile, getTimerSettings } from "@/lib/auth/dal";
import { SettingsForm } from "@/components/settings/settings-form";
import { EmptyState, PersonList, PersonRow } from "@/components/social/person-row";
import { UnblockButton } from "@/components/social/row-actions";
import { getMyBlocks } from "@/lib/social/dal";

export const metadata: Metadata = {
  title: "Settings — CubeHub",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings");
  }

  const [initialSettings, profile, blocks] = await Promise.all([
    getTimerSettings(),
    getProfile(),
    getMyBlocks(),
  ]);

  return (
    <div className="flex flex-1 flex-col items-center p-6 md:p-12">
      <SettingsForm initialSettings={initialSettings} profile={profile} />

      <section aria-labelledby="blocked-title" className="-mt-12 w-full max-w-2xl space-y-3 pb-24">
        <h2 id="blocked-title" className="text-lg font-bold tracking-tight text-foreground">
          Blocked accounts
        </h2>
        {blocks.length === 0 ? (
          <EmptyState title="You haven't blocked anyone">
            Block someone from the ⋯ menu on their profile.
          </EmptyState>
        ) : (
          <PersonList>
            {blocks.map((p) => (
              <PersonRow key={p.id} person={p} linked={false}>
                <UnblockButton targetId={p.id} name={p.displayName || p.username} />
              </PersonRow>
            ))}
          </PersonList>
        )}
      </section>
    </div>
  );
}
