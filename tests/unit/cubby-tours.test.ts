import { beforeEach, describe, expect, it } from "vitest";

import type { PageContent } from "@/lib/companion/content";
import { parseRecord } from "@/lib/companion/record";
import {
  finishTour,
  hasUnseen,
  markOffered,
  nextAvailableStep,
  NO_PROGRESS,
  parseTours,
  stepsFor,
  tourKindFor,
} from "@/lib/companion/tours";
import { setCompanionPersister, useCompanionStore } from "@/stores/companion-store";

const content: PageContent = {
  page: "timer",
  tourVersion: 2,
  tour: [
    { id: "a", target: "timer-scramble", title: "A", body: "a", since: 1 },
    { id: "b", target: "timer-missing", title: "B", body: "b", since: 1 },
    { id: "c", target: null, title: "C", body: "c", since: 2 },
  ],
  greetings: [],
  reactions: {},
  tips: [],
};

describe("tour selection", () => {
  it("a first visit gets the full tour; a newer version gets only the new steps", () => {
    expect(tourKindFor(content, undefined)).toBe("full");
    expect(stepsFor(content, "full", undefined)).toHaveLength(3);
    const seenV1 = { seen: 1, skipped: false, offered: false };
    expect(tourKindFor(content, seenV1)).toBe("whatsNew");
    expect(stepsFor(content, "whatsNew", seenV1).map((s) => s.id)).toEqual(["c"]);
    expect(tourKindFor(content, { seen: 2, skipped: false, offered: false })).toBeNull();
  });

  it("finishing or skipping marks the version seen; a skip is offered once more", () => {
    const skipped = finishTour(content, undefined, "skipped");
    expect(skipped).toEqual({ seen: 2, skipped: true, offered: false });
    expect(hasUnseen(content, skipped)).toBe(true);
    const offered = markOffered(skipped);
    expect(hasUnseen(content, offered)).toBe(false);
    expect(hasUnseen(content, finishTour(content, undefined, "done"))).toBe(false);
    // A tour the cuber asked for and then skipped isn't offered again.
    expect(hasUnseen(content, finishTour(content, offered, "skipped", true))).toBe(false);
  });

  it("the dot shows for an unseen tour, never for a page without one", () => {
    expect(hasUnseen(content, undefined)).toBe(true);
    expect(hasUnseen(null, undefined)).toBe(false);
    expect(hasUnseen({ ...content, tour: [] }, undefined)).toBe(false);
  });

  it("skips steps whose target isn't on the page, both ways", () => {
    const has = (t: string) => t !== "timer-missing";
    expect(nextAvailableStep(content.tour, 1, has)).toBe(2);
    expect(nextAvailableStep(content.tour, 1, has, -1)).toBe(0);
    expect(nextAvailableStep(content.tour, 3, has)).toBe(-1);
  });

  it("parses progress defensively", () => {
    expect(parseTours({ timer: { seen: 2, skipped: true }, "Bad Page": { seen: 1 }, drill: "x", learn: { seen: -3 } })).toEqual({
      timer: { seen: 2, skipped: true, offered: false },
      learn: NO_PROGRESS,
    });
    expect(parseRecord({ settings: { mode: "quiet" }, tours: null }).settings.mode).toBe("quiet");
  });
});

describe("companion store", () => {
  let saved: unknown[] = [];
  beforeEach(() => {
    saved = [];
    setCompanionPersister((r) => saved.push(r));
    useCompanionStore.setState({ hydrated: true, record: parseRecord(null), page: "timer", content, bubble: null, tour: null });
  });

  it("a tour replaces the bubble, and no bubble interrupts a tour", () => {
    const s = useCompanionStore.getState();
    s.say({ text: "hi", actions: [], ttlMs: 4000 });
    expect(useCompanionStore.getState().bubble?.text).toBe("hi");
    s.startTour({ page: "timer", kind: "full", steps: content.tour, prompted: true });
    expect(useCompanionStore.getState().bubble).toBeNull();
    s.say({ text: "later", actions: [], ttlMs: 4000 });
    expect(useCompanionStore.getState().bubble).toBeNull();
  });

  it("ending a tour saves progress", () => {
    const s = useCompanionStore.getState();
    s.startTour({ page: "timer", kind: "full", steps: content.tour, prompted: false });
    s.endTour("skipped");
    expect(useCompanionStore.getState().record.tours.timer).toEqual({ seen: 2, skipped: true, offered: false });
    expect(saved).toHaveLength(1);
  });

  it("leaving the page drops its tour and bubble", () => {
    const s = useCompanionStore.getState();
    s.startTour({ page: "timer", kind: "full", steps: content.tour, prompted: false });
    s.setPage("learn", null);
    expect(useCompanionStore.getState().tour).toBeNull();
  });

  it("switching Cubby off clears what's on screen and saves", () => {
    const s = useCompanionStore.getState();
    s.say({ text: "hi", actions: [], ttlMs: 4000 });
    s.updateSettings({ mode: "off" });
    expect(useCompanionStore.getState().bubble).toBeNull();
    expect((saved[0] as { settings: { mode: string } }).settings.mode).toBe("off");
  });

  it("opening the dock marks a skipped tour as offered", () => {
    useCompanionStore.setState({ record: { ...parseRecord(null), tours: { timer: { seen: 2, skipped: true, offered: false } } } });
    useCompanionStore.getState().markDockOpened();
    expect(useCompanionStore.getState().record.tours.timer.offered).toBe(true);
  });
});
