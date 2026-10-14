"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { Ban, Flag, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { block, reportProfile } from "@/lib/social/actions";
import { REPORT_NOTE_MAX, REPORT_REASONS, type ReportReason } from "@/lib/social/types";
import { confirm } from "@/stores/confirm-store";
import { toast } from "@/stores/toast-store";

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
      router.push("/friends");
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
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetId={targetId} name={name} />
    </>
  );
}

function ReportDialog({
  open,
  onOpenChange,
  targetId,
  name,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
  name: string;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    startTransition(async () => {
      const res = await reportProfile(targetId, reason, note);
      if (!res.ok) {
        toast({ kind: "error", message: res.error, durationMs: 4000 });
        return;
      }
      toast({ kind: "info", message: "Thanks. We'll take a look.", durationMs: 3000 });
      setReason(null);
      setNote("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl outline-none transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <Dialog.Title className="text-base font-semibold text-foreground">Report {name}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Reports are private. {name} isn&apos;t told who sent one.
          </Dialog.Description>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <fieldset className="space-y-1.5">
              <legend className="sr-only">Reason</legend>
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm has-checked:border-primary has-checked:bg-primary/5"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-primary"
                  />
                  {r.label}
                </label>
              ))}
            </fieldset>
            <div className="space-y-1.5">
              <Label htmlFor="report-note">Anything else? (optional)</Label>
              <Textarea
                id="report-note"
                value={note}
                maxLength={REPORT_NOTE_MAX}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Dialog.Close render={<Button type="button" variant="ghost" size="sm" />}>Cancel</Dialog.Close>
              <Button type="submit" size="sm" disabled={!reason || pending}>
                Send report
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
