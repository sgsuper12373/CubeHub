import { readFileSync } from "node:fs";

import { render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const motionState = vi.hoisted(() => ({ reduced: false }));
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => motionState.reduced };
});

import { CountUp } from "@/components/marketing/motion/count-up";
import { FadeUp } from "@/components/marketing/motion/fade-up";
import { FloatingField } from "@/components/marketing/motion/floating-field";
import { PinnedChapter } from "@/components/marketing/motion/pinned-chapter";
import { RevealText } from "@/components/marketing/motion/reveal-text";

beforeAll(() => {
  // A desktop window: matchMedia says lg and up.
  window.matchMedia ??= ((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  // jsdom has no IntersectionObserver; the components only need it to exist.
  globalThis.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = "";
    thresholds = [];
  } as unknown as typeof IntersectionObserver;
});

beforeEach(() => {
  motionState.reduced = false;
});

const css = readFileSync("src/app/globals.css", "utf8");

describe("RevealText", () => {
  it("puts the whole string in the HTML once for assistive tech, pieces hidden", () => {
    render(<RevealText as="h1" text="Every part of cubing. One hub." trigger="load" />);
    const heading = screen.getByRole("heading", { level: 1, name: "Every part of cubing. One hub." });
    expect(heading.textContent).toBe("Every part of cubing. One hub.");
    const pieces = heading.querySelectorAll(".reveal-piece");
    expect(pieces).toHaveLength(6);
    pieces.forEach((p) => expect(p.getAttribute("aria-hidden")).toBe("true"));
  });

  it("staggers by word or by letter", () => {
    const { container } = render(<RevealText text="R U" by="letter" staggerMs={30} delayMs={100} />);
    const pieces = [...container.querySelectorAll<HTMLElement>(".reveal-piece")];
    expect(pieces.map((p) => p.textContent)).toEqual(["R", "U"]);
    expect(pieces.map((p) => p.style.getPropertyValue("--reveal-delay"))).toEqual(["100ms", "130ms"]);
  });

  it("only animates without a reduced-motion preference, so reduced motion sees the text at rest", () => {
    // Every rule that animates the pieces sits inside a no-preference block.
    const block = css.slice(css.indexOf("Landing text reveal"), css.indexOf("Floating field (components"));
    const rules = block.split("@media (prefers-reduced-motion: no-preference)");
    expect(rules[0]).not.toMatch(/animation:/);
    expect(rules.length).toBeGreaterThan(1);
  });
});

describe("FadeUp", () => {
  it("uses the scroll-driven reveal in view, a load fade otherwise", () => {
    const { container, rerender } = render(<FadeUp>hi</FadeUp>);
    expect(container.firstElementChild?.className).toContain("reveal");
    rerender(<FadeUp trigger="load" delayMs={200}>hi</FadeUp>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("fade-up-load");
    expect(el.style.getPropertyValue("--reveal-delay")).toBe("200ms");
  });
});

describe("CountUp", () => {
  it("renders the final number from the start", () => {
    render(<CountUp value={1234} />);
    expect(screen.getByLabelText("1,234").textContent).toBe("1,234");
  });

  it("with reduced motion, stays on the final number", () => {
    motionState.reduced = true;
    render(<CountUp value={21} />);
    expect(screen.getByLabelText("21").textContent).toBe("21");
  });
});

describe("FloatingField", () => {
  it("is decorative: hidden from assistive tech and from the pointer", () => {
    const { container } = render(<FloatingField />);
    const field = container.firstElementChild as HTMLElement;
    expect(field.getAttribute("aria-hidden")).toBe("true");
    expect(field.className).toContain("pointer-events-none");
    expect(field.querySelectorAll(".floating-piece").length).toBeGreaterThanOrEqual(8);
  });

  it("drift is off for reduced motion (CSS) and pauses when hidden", () => {
    const block = css.slice(css.indexOf("Floating field (components"));
    expect(block.indexOf("@media (prefers-reduced-motion: no-preference)")).toBeLessThan(block.indexOf(".floating-piece {"));
    expect(block).toContain('[data-floating-field="paused"] .floating-piece');
  });
});

describe("PinnedChapter", () => {
  it("pins from lg up when motion is allowed", () => {
    const { container } = render(<PinnedChapter visual={() => <div>visual</div>}>text</PinnedChapter>);
    const section = container.querySelector("section")!;
    expect(section.dataset.pinned).toBe("on");
    expect(section.innerHTML).toContain("lg:sticky");
  });

  it("is a plain section with the finished visual for reduced motion", () => {
    motionState.reduced = true;
    let seen = -1;
    const { container } = render(
      <PinnedChapter
        visual={(p) => {
          seen = p.get();
          return <div>visual</div>;
        }}
      >
        text
      </PinnedChapter>,
    );
    const section = container.querySelector("section")!;
    expect(section.dataset.pinned).toBe("off");
    expect(section.innerHTML).not.toContain("lg:sticky");
    expect(seen).toBe(1);
  });
});
