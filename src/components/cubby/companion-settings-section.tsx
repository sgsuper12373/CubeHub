"use client";

import { CompanionSettingsForm } from "@/components/cubby/companion-settings-form";
import { useCompanionStore } from "@/stores/companion-store";

/** The Cubby section of /settings (members), behind the companion flag. */
export default function CompanionSettingsSection() {
  const hydrated = useCompanionStore((s) => s.hydrated);
  const name = useCompanionStore((s) => s.record.settings.name);
  return (
    <section id="cubby" aria-labelledby="cubby-title" className="-mt-12 mb-16 w-full max-w-2xl space-y-4">
      <h2 id="cubby-title" className="text-xl font-semibold tracking-tight">
        {name}, your companion
      </h2>
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        {hydrated ? <CompanionSettingsForm /> : <p className="text-sm text-muted-foreground">Loading…</p>}
      </div>
    </section>
  );
}
