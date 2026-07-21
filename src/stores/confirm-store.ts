import { create } from "zustand";

/**
 * Imperative confirmation queue. Mirrors toast-store: any component or store
 * calls `await confirm({ ... })` and gets a boolean, without threading dialog
 * state through props. A single <ConfirmHost/> (mounted once at the root)
 * renders the pending request and resolves the promise on the user's choice.
 *
 * Only one confirmation is shown at a time; a second call while one is open
 * replaces it (the earlier promise resolves false — treated as a cancel).
 */

export interface ConfirmOptions {
  title: string;
  /** Optional supporting line under the title. */
  body?: string;
  /** Label for the confirming action. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Label for the cancelling action. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Styles the confirm button as destructive (red). Defaults to false. */
  destructive?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  id: string;
  resolve: (ok: boolean) => void;
}

interface ConfirmStore {
  pending: PendingConfirm | null;
  request(opts: ConfirmOptions): Promise<boolean>;
  /** Resolve the pending request and clear it. */
  settle(id: string, ok: boolean): void;
}

export const useConfirmStore = create<ConfirmStore>()((set, get) => ({
  pending: null,

  request: (opts) =>
    new Promise<boolean>((resolve) => {
      // A new request supersedes any open one (resolve the old as cancelled).
      const prev = get().pending;
      if (prev) prev.resolve(false);
      set({ pending: { ...opts, id: crypto.randomUUID(), resolve } });
    }),

  settle: (id, ok) => {
    const p = get().pending;
    if (!p || p.id !== id) return;
    p.resolve(ok);
    set({ pending: null });
  },
}));

/** Convenience helper so callers don't need to import the store. */
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().request(opts);
}
