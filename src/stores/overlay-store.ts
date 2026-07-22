import { useEffect } from "react";
import { create } from "zustand";

/**
 * How many modal-ish surfaces are currently open.
 *
 * <TouchStage/> listens on `window`, so without this an open dialog still
 * lets Space reach the timer — you would activate the focused button *and*
 * start a solve behind the overlay, recording a bogus time. A counter rather
 * than a boolean so overlapping overlays can't close the gate early.
 */
interface OverlayStore {
  openCount: number;
  push(): void;
  pop(): void;
}

export const useOverlayStore = create<OverlayStore>()((set) => ({
  openCount: 0,
  push: () => set((s) => ({ openCount: s.openCount + 1 })),
  pop: () => set((s) => ({ openCount: Math.max(0, s.openCount - 1) })),
}));

/** Register an overlay as open for as long as `open` stays true. */
export function useOverlayLock(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    const { push, pop } = useOverlayStore.getState();
    push();
    return pop;
  }, [open]);
}

/** True while any overlay is open. Read imperatively from event handlers. */
export function isOverlayOpen(): boolean {
  return useOverlayStore.getState().openCount > 0;
}
