import { create } from "zustand";

/** Whether the command palette is open; the sidebar's search button and Ctrl/⌘+K set it. */
export const usePaletteStore = create<{ open: boolean; setOpen(open: boolean): void }>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
