"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";

import { Button } from "@/components/ui/button";
import { useConfirmStore } from "@/stores/confirm-store";

/**
 * Renders the single pending confirmation from confirm-store. Mounted once at
 * the root layout next to <Toaster/>. Uses Base UI's AlertDialog, so focus
 * trapping, Esc-to-cancel, backdrop and scroll-lock are handled for us — this
 * is a real modal, never the native window.confirm() (which would freeze the
 * browser-automation tooling).
 *
 * Driven imperatively: `open` follows whether a request is pending, and any
 * close reason (Esc, backdrop, Cancel) resolves the promise as `false`.
 */
export function ConfirmHost() {
  const pending = useConfirmStore((s) => s.pending);
  const settle = useConfirmStore((s) => s.settle);

  const open = pending !== null;

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        // Any programmatic/user close that isn't the Confirm button = cancel.
        if (!next && pending) settle(pending.id, false);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-150" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-xl outline-none data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 transition-all duration-150">
          {pending && (
            <>
              <AlertDialog.Title className="text-base font-semibold text-foreground">
                {pending.title}
              </AlertDialog.Title>
              {pending.body && (
                <AlertDialog.Description className="mt-1.5 text-sm text-muted-foreground">
                  {pending.body}
                </AlertDialog.Description>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => settle(pending.id, false)}
                >
                  {pending.cancelLabel ?? "Cancel"}
                </Button>
                <Button
                  variant={pending.destructive ? "destructive" : "default"}
                  size="sm"
                  autoFocus
                  onClick={() => settle(pending.id, true)}
                >
                  {pending.confirmLabel ?? "Confirm"}
                </Button>
              </div>
            </>
          )}
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
