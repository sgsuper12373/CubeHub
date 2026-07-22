import { create } from "zustand";

/**
 * Non-blocking toast queue. Fires from stores (PB, undo, sync complete,
 * penalty confirmations), never from components. The <Toaster/> renderer
 * handles auto-dismiss; actions (e.g. "Undo") are optional callbacks.
 */

export type ToastKind = "info" | "pb" | "undo" | "error";

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  durationMs: number;
  action?: { label: string; onAction: () => void };
}

interface ToastStore {
  toasts: Toast[];
  toast(t: Omit<Toast, "id">): string;
  dismiss(id: string): void;
}

export const useToastStore = create<ToastStore>()((set, get) => ({
  toasts: [],

  toast: (t) => {
    const id = crypto.randomUUID();
    set({ toasts: [...get().toasts, { ...t, id }] });
    return id;
  },

  dismiss: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

/** Convenience helper so callers don't need to import the store. */
export function toast(t: Omit<Toast, "id">): string {
  return useToastStore.getState().toast(t);
}
