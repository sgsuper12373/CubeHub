import { create } from "zustand";

import {
  DEFAULT_LAYOUT,
  loadLayout,
  type PanelCell,
  resetLayout,
  saveLayout,
} from "@/lib/timer/layout";

/**
 * The /timer panel arrangement, plus whether the layout editor is open.
 *
 * In a store rather than component state for two reasons: the saved layout can
 * be read after mount through an action instead of a setState-in-effect, and
 * `editing` needs to be visible to <TouchStage/> so dragging a panel can't
 * also start a solve.
 */
interface LayoutStore {
  cells: PanelCell[];
  editing: boolean;
  isZenMode: boolean;
  hydrated: boolean;
  hydrate(): void;
  setCells(cells: PanelCell[]): void;
  setEditing(editing: boolean): void;
  setZenMode(zen: boolean): void;
  reset(): void;
}

export const useLayoutStore = create<LayoutStore>()((set) => ({
  cells: DEFAULT_LAYOUT,
  editing: false,
  isZenMode: false,
  hydrated: false,

  hydrate: () => set({ cells: loadLayout(), hydrated: true }),

  setCells: (cells) => {
    set({ cells });
    saveLayout(cells);
  },

  setEditing: (editing) => set({ editing }),

  setZenMode: (isZenMode) => set({ isZenMode }),

  reset: () => {
    resetLayout();
    set({ cells: DEFAULT_LAYOUT });
  },
}));
