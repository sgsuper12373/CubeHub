import { create } from "zustand";

import type { PageContent, TourStep } from "@/lib/companion/content";
import type { CompanionPage } from "@/lib/companion/pages";
import { saveLocalRecord, type CompanionRecord } from "@/lib/companion/record";
import { DEFAULT_SETTINGS, type CompanionSettings } from "@/lib/companion/settings";
import { finishTour, markOffered, type TourKind } from "@/lib/companion/tours";

/**
 * Cubby's client state: what it remembers (settings, tour progress), where
 * it is (page and content), and what it's showing (one bubble or one tour,
 * never both). Only the companion's own components use it; the rest of the
 * app talks to Cubby through the bus (lib/companion/bus.ts).
 */

export interface Bubble {
  id: number;
  text: string;
  actions: { label: string; href: string }[];
  /** Auto-dismiss after this long once typed; null = stays until closed. */
  ttlMs: number | null;
}

export interface ActiveTour {
  page: CompanionPage;
  kind: TourKind;
  steps: TourStep[];
  index: number;
  prompted: boolean;
}

interface CompanionStore {
  hydrated: boolean;
  record: CompanionRecord;
  page: CompanionPage | null;
  content: PageContent | null;
  bubble: Bubble | null;
  tour: ActiveTour | null;
  settingsOpen: boolean;
  hydrate(record: CompanionRecord): void;
  updateSettings(patch: Partial<CompanionSettings>): void;
  resetTours(): void;
  setPage(page: CompanionPage | null, content: PageContent | null): void;
  say(bubble: Omit<Bubble, "id">): void;
  dismissBubble(id?: number): void;
  startTour(tour: Omit<ActiveTour, "index">): void;
  goToStep(index: number): void;
  endTour(how: "done" | "skipped"): void;
  markDockOpened(): void;
  setSettingsOpen(open: boolean): void;
}

/** How records are saved: localStorage for guests; the provider swaps in the account for members. */
let persist: (record: CompanionRecord) => void = saveLocalRecord;
export function setCompanionPersister(fn: (record: CompanionRecord) => void): void {
  persist = fn;
}

let nextBubbleId = 1;

export const useCompanionStore = create<CompanionStore>()((set, get) => {
  const save = (record: CompanionRecord) => {
    set({ record });
    persist(record);
  };
  return {
    hydrated: false,
    record: { settings: DEFAULT_SETTINGS, tours: {} },
    page: null,
    content: null,
    bubble: null,
    tour: null,
    settingsOpen: false,

    hydrate: (record) => set({ record, hydrated: true }),

    updateSettings: (patch) => {
      const { record } = get();
      save({ ...record, settings: { ...record.settings, ...patch } });
      if (patch.mode === "off") set({ bubble: null, tour: null });
    },

    resetTours: () => save({ ...get().record, tours: {} }),

    setPage: (page, content) => {
      const { tour } = get();
      // Leaving the page ends its tour; it was neither finished nor skipped.
      set({ page, content, bubble: null, tour: tour && tour.page === page ? tour : null });
    },

    say: (bubble) => {
      if (get().tour) return;
      set({ bubble: { ...bubble, id: nextBubbleId++ } });
    },

    dismissBubble: (id) => {
      const { bubble } = get();
      if (bubble && (id === undefined || bubble.id === id)) set({ bubble: null });
    },

    startTour: (tour) => set({ tour: { ...tour, index: 0 }, bubble: null }),

    goToStep: (index) => {
      const { tour } = get();
      if (tour) set({ tour: { ...tour, index } });
    },

    endTour: (how) => {
      const { tour, content, record } = get();
      if (!tour) return;
      set({ tour: null });
      if (content && content.page === tour.page) {
        save({ ...record, tours: { ...record.tours, [tour.page]: finishTour(content, record.tours[tour.page], how, tour.prompted) } });
      }
    },

    markDockOpened: () => {
      const { page, record } = get();
      if (!page) return;
      const before = record.tours[page];
      const after = markOffered(before);
      if (after !== before) save({ ...record, tours: { ...record.tours, [page]: after } });
    },

    setSettingsOpen: (open) => set({ settingsOpen: open }),
  };
});
