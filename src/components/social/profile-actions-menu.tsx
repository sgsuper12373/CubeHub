"use client";

import { Menu } from "@base-ui/react/menu";
import { Ban, Flag, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { block, reportProfile } from "@/lib/social/actions";
import { confirm } from "@/stores/confirm-store";
import { toast } from "@/stores/toast-store";

import { ReportDialog } from "./report-dialog";

/** The ⋯ menu on someone else's profile: Block and Report. */
export function ProfileActionsMenu({ targetId, name }: { targetId: string; name: string }) {
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);
  const [, startTransition] = useTransition();

  function onBlock() {
    startTransition(async () => {
      const ok = await confirm({
        title: `Block ${name}?`,
        body: "You'll stop following each other, and neither of you will see the other's profile. They aren't told. You can unblock in Settings.",
        confirmLabel: "Block",
        destructive: true,
      });
      if (!ok) return;
      const res = await block(targetId);
      if (!res.ok) {
        toast({ kind: "error", message: res.error, durationMs: 4000 });
        return;
      }
      toast({ kind: "info", message: `${name} is blocked`, durationMs: 3000 });
      router.push("/people");
    });
  }

  return (
    <>
      <Menu.Root>
        <Menu.Trigger render={<Button variant="outline" size="icon-sm" aria-label="More actions" />}>
          <MoreHorizontal />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={4} className="isolate z-50">
            <Menu.Popup className="min-w-40 rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden">
              <Menu.Item
                onClick={() => setReportOpen(true)}
                className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 outline-none data-highlighted:bg-muted"
              >
                <Flag className="size-4" aria-hidden />
                Report
              </Menu.Item>
              <Menu.Item
                onClick={onBlock}
                className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-destructive outline-none data-highlighted:bg-destructive/10"
              >
                <Ban className="size-4" aria-hidden />
                Block
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        title={`Report ${name}`}
        description={`Reports are private. ${name} isn't told who sent one.`}
        onSubmit={(reason, note) => reportProfile(targetId, reason, note)}
      />
    </>
  );
}
