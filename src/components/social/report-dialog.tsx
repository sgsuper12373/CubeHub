"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_NOTE_MAX, REPORT_REASONS, type ReportReason } from "@/lib/social/types";
import { toast } from "@/stores/toast-store";

/**
 * Pick a reason, add an optional note, send. Shared by profile, club, post
 * and comment reports; the caller supplies the wording and the action.
 */
export function ReportDialog({
  open,
  onOpenChange,
  title,
  description,
  reasons = REPORT_REASONS,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Same values, wording that fits what's reported. */
  reasons?: readonly { value: ReportReason; label: string }[];
  onSubmit: (reason: ReportReason, note: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    startTransition(async () => {
      const res = await onSubmit(reason, note);
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
          <Dialog.Title className="text-base font-semibold text-foreground">{title}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <fieldset className="space-y-1.5">
              <legend className="sr-only">Reason</legend>
              {reasons.map((r) => (
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
