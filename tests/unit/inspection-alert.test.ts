import { afterEach, describe, expect, it, vi } from "vitest";

import { loadClientSettings, saveClientSettings } from "@/lib/timer/settings-persistence";

const KEY = "cubehub.settings.v1";

describe("inspection alert setting", () => {
  afterEach(() => localStorage.clear());

  it("defaults to voice", () => {
    expect(loadClientSettings().inspectionAlert).toBe("voice");
  });

  it("carries over the old voice on/off switch", () => {
    localStorage.setItem(KEY, JSON.stringify({ voiceEnabled: false }));
    expect(loadClientSettings().inspectionAlert).toBe("off");
    localStorage.setItem(KEY, JSON.stringify({ voiceEnabled: true }));
    expect(loadClientSettings().inspectionAlert).toBe("voice");
  });

  it("prefers the new field, ignores junk, and drops the old key on save", () => {
    localStorage.setItem(KEY, JSON.stringify({ voiceEnabled: true, inspectionAlert: "beep" }));
    expect(loadClientSettings().inspectionAlert).toBe("beep");
    localStorage.setItem(KEY, JSON.stringify({ inspectionAlert: "siren" }));
    expect(loadClientSettings().inspectionAlert).toBe("voice");

    localStorage.setItem(KEY, JSON.stringify({ voiceEnabled: false }));
    saveClientSettings({ holdMs: 400 });
    const stored = JSON.parse(localStorage.getItem(KEY)!);
    expect(stored).toMatchObject({ holdMs: 400, inspectionAlert: "off" });
    expect(stored).not.toHaveProperty("voiceEnabled");
  });
});

describe("beep", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  /** Just enough of AudioContext to count and time the tones. */
  function fakeAudio() {
    const starts: number[] = [];
    class FakeContext {
      state = "suspended";
      currentTime = 10;
      destination = {};
      resume() {
        this.state = "running";
        return Promise.resolve();
      }
      createOscillator() {
        return {
          type: "",
          frequency: { value: 0 },
          connect: (node: unknown) => node,
          start: (t: number) => starts.push(t),
          stop: () => {},
        };
      }
      createGain() {
        const param = { setValueAtTime: () => {}, linearRampToValueAtTime: () => {} };
        return { gain: param, connect: (node: unknown) => node };
      }
    }
    vi.stubGlobal("AudioContext", FakeContext);
    return starts;
  }

  it("stays silent until a tap or key unlocks audio", async () => {
    const starts = fakeAudio();
    const { beep } = await import("@/lib/timer/beep");
    beep(1);
    expect(starts).toEqual([]);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    await Promise.resolve();
    beep(1);
    expect(starts).toEqual([10]);
  });

  it("plays two spaced beeps for the last warning", async () => {
    const starts = fakeAudio();
    const { beep } = await import("@/lib/timer/beep");
    window.dispatchEvent(new Event("pointerdown"));
    await Promise.resolve();
    beep(2);
    expect(starts).toHaveLength(2);
    expect(starts[1] - starts[0]).toBeCloseTo(0.2);
  });
});
