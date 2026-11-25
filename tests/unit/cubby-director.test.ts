import { describe, expect, it, vi } from "vitest";

import { emitCompanion, isCompanionEventName, onCompanion } from "@/lib/companion/bus";
import {
  decide,
  EMPTY_SESSION,
  GREETING_COOLDOWN_MS,
  isQuietPhase,
  parseSession,
  recordShown,
  STRETCH_AFTER_MS,
  trackSolving,
  type Candidate,
  type DirectorContext,
} from "@/lib/companion/director";
import { companionPageFor } from "@/lib/companion/pages";
import { DEFAULT_SETTINGS, normalizeName, parseCompanionSettings, prefersReducedMotion } from "@/lib/companion/settings";

const NOW = 1_800_000_000_000;

function ctx(over: Partial<DirectorContext> = {}): DirectorContext {
  return { phase: "idle", inInspection: false, settings: DEFAULT_SETTINGS, session: EMPTY_SESSION, lastOpenedAt: null, now: NOW, ...over };
}

const greeting: Candidate = { kind: "greeting", page: "timer" };
const pb: Candidate = { kind: "reaction", page: "timer", reaction: "pb", hasLine: true };
const wince: Candidate = { kind: "reaction", page: "timer", reaction: "penalty", hasLine: false };

describe("quiet rules", () => {
  it("the timer owns the screen from hold to stop, and in inspection", () => {
    for (const p of ["holding", "ready", "running", "inspecting"] as const) expect(isQuietPhase(p, false)).toBe(true);
    expect(isQuietPhase("idle", true)).toBe(true);
    expect(isQuietPhase("idle", false)).toBe(false);
    expect(isQuietPhase("stopped", false)).toBe(false);
  });

  it("drops greetings, tours, reactions and requests while the timer is busy", () => {
    for (const c of [greeting, pb, { kind: "tour", page: "timer", prompted: true } as Candidate, { kind: "requested", page: "timer" } as Candidate]) {
      expect(decide(c, ctx({ phase: "running" }))).toEqual({ show: false, reason: "timer-busy" });
      expect(decide(c, ctx({ inInspection: true })).show).toBe(false);
    }
  });

  it("lets the BLD animation run mid-solve, unless switched off", () => {
    expect(decide({ kind: "bld" }, ctx({ phase: "running" }))).toEqual({ show: true, bubble: false });
    expect(decide({ kind: "bld" }, ctx({ phase: "running", settings: { ...DEFAULT_SETTINGS, bldAnimation: false } })).show).toBe(false);
  });

  it("reactions play after the timer stops", () => {
    expect(decide(pb, ctx({ phase: "stopped" }))).toEqual({ show: true, bubble: true });
  });
});

describe("caps", () => {
  it("one unprompted bubble per page per session", () => {
    const first = decide(greeting, ctx());
    expect(first).toEqual({ show: true, bubble: true });
    const session = recordShown(EMPTY_SESSION, greeting, first);
    // A PB later on the same page still animates, without a line.
    expect(decide(pb, ctx({ session }))).toEqual({ show: true, bubble: false });
    // Another page has its own bubble.
    expect(decide({ ...pb, page: "learn" }, ctx({ session }))).toEqual({ show: true, bubble: true });
  });

  it("one greeting per page per session, none within 10 minutes of the last visit", () => {
    const session = recordShown(EMPTY_SESSION, greeting, { show: true, bubble: true });
    expect(decide(greeting, ctx({ session })).show).toBe(false);
    expect(decide(greeting, ctx({ lastOpenedAt: NOW - GREETING_COOLDOWN_MS + 1000 }))).toEqual({ show: false, reason: "recent-visit" });
    expect(decide(greeting, ctx({ lastOpenedAt: NOW - GREETING_COOLDOWN_MS - 1000 })).show).toBe(true);
  });

  it("prompted things don't use up the bubble", () => {
    const req: Candidate = { kind: "requested", page: "timer" };
    const session = recordShown(EMPTY_SESSION, req, decide(req, ctx()));
    expect(session).toEqual(EMPTY_SESSION);
  });

  it("a reaction without a line never uses the bubble", () => {
    const session = recordShown(EMPTY_SESSION, wince, decide(wince, ctx()));
    expect(session.bubbles.timer).toBeUndefined();
  });
});

describe("settings", () => {
  it("Off silences everything, including requests", () => {
    const off = { ...DEFAULT_SETTINGS, mode: "off" as const };
    for (const c of [greeting, pb, { kind: "requested", page: null } as Candidate, { kind: "bld" } as Candidate]) expect(decide(c, ctx({ settings: off })).show).toBe(false);
  });

  it("Quiet allows only what was asked for", () => {
    const quiet = { ...DEFAULT_SETTINGS, mode: "quiet" as const };
    expect(decide(greeting, ctx({ settings: quiet })).show).toBe(false);
    expect(decide(pb, ctx({ settings: quiet })).show).toBe(false);
    expect(decide({ kind: "tour", page: "timer", prompted: false }, ctx({ settings: quiet })).show).toBe(false);
    expect(decide({ kind: "tour", page: "timer", prompted: true }, ctx({ settings: quiet })).show).toBe(true);
    expect(decide({ kind: "requested", page: "timer" }, ctx({ settings: quiet })).show).toBe(true);
  });

  it("auto tours can be switched off; a tour from the dock still runs", () => {
    const s = { ...DEFAULT_SETTINGS, autoTours: false };
    expect(decide({ kind: "tour", page: "timer", prompted: false }, ctx({ settings: s })).show).toBe(false);
    expect(decide({ kind: "tour", page: "timer", prompted: true }, ctx({ settings: s })).show).toBe(true);
  });

  it("reactions: all, PBs only, or off", () => {
    const pbOnly = { ...DEFAULT_SETTINGS, reactions: "pb" as const };
    expect(decide(pb, ctx({ settings: pbOnly })).show).toBe(true);
    expect(decide(wince, ctx({ settings: pbOnly })).show).toBe(false);
    expect(decide(pb, ctx({ settings: { ...DEFAULT_SETTINGS, reactions: "off" } })).show).toBe(false);
  });

  it("parses field by field, falling back per field", () => {
    expect(parseCompanionSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseCompanionSettings({ mode: "quiet", reactions: "loud", name: "  Rubi  ", motion: "reduced" })).toEqual({
      ...DEFAULT_SETTINGS,
      mode: "quiet",
      name: "Rubi",
      motion: "reduced",
    });
  });

  it("normalises names", () => {
    expect(normalizeName("")).toBe("Cubby");
    expect(normalizeName("   ")).toBe("Cubby");
    expect(normalizeName(42)).toBe("Cubby");
    expect(normalizeName("Kubo\u0007 the  cube")).toBe("Kubo the cube");
    expect(normalizeName("x".repeat(40))).toHaveLength(20);
    expect(normalizeName("क्यूबी")).toBe("क्यूबी");
  });

  it("motion follows the setting, else the system", () => {
    expect(prefersReducedMotion(DEFAULT_SETTINGS, true)).toBe(true);
    expect(prefersReducedMotion({ ...DEFAULT_SETTINGS, motion: "full" }, true)).toBe(false);
    expect(prefersReducedMotion({ ...DEFAULT_SETTINGS, motion: "reduced" }, false)).toBe(true);
  });
});

describe("session memory", () => {
  it("parses defensively", () => {
    expect(parseSession("nope")).toEqual(EMPTY_SESSION);
    expect(parseSession({ bubbles: { timer: 1, bad: "x", neg: -1 }, greeted: ["timer", 3] })).toEqual({ bubbles: { timer: 1 }, greeted: ["timer"] });
  });
});

describe("the stretch reminder", () => {
  const MIN = 60_000;
  it("fires once a day after 60 minutes of solving without a 10-minute gap", () => {
    let s = trackSolving(null, NOW, "2026-11-26");
    expect(s.remind).toBe(false);
    for (let t = 8; t <= 64; t += 8) {
      s = trackSolving(s.stretch, NOW + t * MIN, "2026-11-26");
      if (NOW + t * MIN - NOW >= STRETCH_AFTER_MS) break;
      expect(s.remind).toBe(false);
    }
    expect(s.remind).toBe(true);
    expect(trackSolving(s.stretch, NOW + 70 * MIN, "2026-11-26").remind).toBe(false);
  });

  it("a long gap starts a new stretch", () => {
    let s = trackSolving(null, NOW, "d");
    s = trackSolving(s.stretch, NOW + 50 * MIN, "d");
    expect(s.stretch.startedAt).toBe(NOW + 50 * MIN);
  });
});

describe("pages", () => {
  it("maps pathnames to content pages", () => {
    expect(companionPageFor("/timer")).toBe("timer");
    expect(companionPageFor("/timer/")).toBe("timer");
    expect(companionPageFor("/learn")).toBe("learn");
    expect(companionPageFor("/learn/333/pll")).toBe("learn-series");
    expect(companionPageFor("/learn/333/drill")).toBe("drill");
    expect(companionPageFor("/learn/333")).toBeNull();
    expect(companionPageFor("/playground")).toBe("playground");
    expect(companionPageFor("/stats")).toBeNull();
  });
});

describe("the bus", () => {
  it("delivers typed events and unsubscribes", () => {
    const got = vi.fn();
    const off = onCompanion("pb", got);
    emitCompanion("pb", { time: "12.84", delta: "0.60", label: "single" });
    off();
    emitCompanion("pb", { time: "1", delta: null, label: "single" });
    expect(got).toHaveBeenCalledTimes(1);
    expect(got).toHaveBeenCalledWith({ time: "12.84", delta: "0.60", label: "single" });
  });

  it("a failing listener never breaks the emitter", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const off = onCompanion("error", () => {
      throw new Error("boom");
    });
    expect(() => emitCompanion("error", { message: "x" })).not.toThrow();
    off();
    err.mockRestore();
  });

  it("knows its event names", () => {
    expect(isCompanionEventName("timer:started")).toBe(true);
    expect(isCompanionEventName("timer:exploded")).toBe(false);
  });
});
