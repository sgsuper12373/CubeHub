import { create } from "zustand";

import {
  DEFAULT_BACKGROUND_OPTIONS,
  sanitizeOptions,
  type BackgroundOptions,
} from "@/lib/timer-background/options";
import { BackgroundImageError, prepareImage } from "@/lib/timer-background/prepare-image";
import type { LuminanceRange } from "@/lib/timer-background/scrim";
import {
  clearBackground,
  loadBackground,
  loadOptions,
  saveBackground,
  saveOptions,
} from "@/lib/timer-background/storage";

/**
 * The /timer background image and its display options. Local-first: the
 * image is kept in IndexedDB and the options in localStorage, on this device
 * only (see src/lib/timer-background/storage.ts).
 */
interface TimerBackgroundStore {
  /** Object URL of the stored image, or null when none is set. */
  url: string | null;
  range: LuminanceRange | null;
  options: BackgroundOptions;
  /** True once init() has read what's stored. */
  loaded: boolean;
  busy: boolean;
  error: string | null;
  init(): Promise<void>;
  setImage(file: File): Promise<void>;
  removeImage(): Promise<void>;
  setOptions(partial: Partial<BackgroundOptions>): void;
  resetOptions(): void;
}

let initStarted = false;

export const useTimerBackgroundStore = create<TimerBackgroundStore>()((set, get) => ({
  url: null,
  range: null,
  options: DEFAULT_BACKGROUND_OPTIONS,
  loaded: false,
  busy: false,
  error: null,

  async init() {
    if (initStarted) return;
    initStarted = true;
    const options = loadOptions();
    const stored = await loadBackground();
    set({
      options,
      url: stored ? URL.createObjectURL(stored.blob) : null,
      range: stored?.range ?? null,
      loaded: true,
    });
  },

  async setImage(file) {
    set({ busy: true, error: null });
    try {
      const prepared = await prepareImage(file);
      await saveBackground(prepared);
      const previous = get().url;
      set({ url: URL.createObjectURL(prepared.blob), range: prepared.range, busy: false });
      if (previous) URL.revokeObjectURL(previous);
    } catch (e) {
      set({
        busy: false,
        error:
          e instanceof BackgroundImageError
            ? e.message
            : "Couldn't save the image on this device. It may be out of storage space.",
      });
    }
  },

  async removeImage() {
    await clearBackground();
    const previous = get().url;
    set({ url: null, range: null, error: null });
    if (previous) URL.revokeObjectURL(previous);
  },

  setOptions(partial) {
    const options = sanitizeOptions({ ...get().options, ...partial });
    set({ options });
    saveOptions(options);
  },

  resetOptions() {
    set({ options: DEFAULT_BACKGROUND_OPTIONS });
    saveOptions(DEFAULT_BACKGROUND_OPTIONS);
  },
}));
