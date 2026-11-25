"use client";

import { CompanionSettingsForm } from "@/components/cubby/companion-settings-form";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCompanionStore } from "@/stores/companion-store";
import { useOverlayLock } from "@/stores/overlay-store";

/** Cubby's settings from the dock (and, for guests, from Ctrl+K → "Cubby settings"). */
export function CompanionSettingsSheet() {
  const open = useCompanionStore((s) => s.settingsOpen);
  const name = useCompanionStore((s) => s.record.settings.name);
  useOverlayLock(open);
  return (
    <Sheet open={open} onOpenChange={(o) => useCompanionStore.getState().setSettingsOpen(o)}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{name} settings</SheetTitle>
          <SheetDescription>Saved straight away{" "}on this device, and to your account when you&apos;re signed in.</SheetDescription>
        </SheetHeader>
        <CompanionSettingsForm className="px-4 pb-6" />
      </SheetContent>
    </Sheet>
  );
}
