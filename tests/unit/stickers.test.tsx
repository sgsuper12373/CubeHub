import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FaceletViewer } from "@/components/learn/facelet-viewer";
import { STICKER_FILL, stickerFill } from "@/lib/stickers";
import { base } from "@/themes";

describe("sticker tokens", () => {
  it("maps every face (and masked) to its --sticker-* token", () => {
    expect(stickerFill("U")).toBe("var(--sticker-u)");
    expect(stickerFill("X")).toBe("var(--sticker-masked)");
    expect(stickerFill("?")).toBe("var(--sticker-masked)");
    expect(stickerFill(undefined)).toBe("var(--sticker-masked)");
  });

  it("keeps the yellow-top, green-front defaults (R orange, L red)", () => {
    expect(base.tokens["sticker-u"]).toBe("#eab308");
    expect(base.tokens["sticker-f"]).toBe("#22c55e");
    expect(base.tokens["sticker-r"]).toBe("#f97316");
    expect(base.tokens["sticker-l"]).toBe("#ef4444");
  });

  it("covers every facelet character the painter offers", () => {
    expect(Object.keys(STICKER_FILL).sort()).toEqual(["B", "D", "F", "L", "R", "U", "X"]);
  });
});

describe("FaceletViewer", () => {
  it("fills stickers from tokens, not hex", () => {
    const solved = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
    const { container } = render(<FaceletViewer cubeState={solved} />);
    const shapes = [...container.querySelectorAll("svg rect, svg path")] as SVGElement[];

    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{6}/i);
    // Centre of U (rect at 40,40) is a U sticker with the shared outline.
    const centre = container.querySelector('rect[x="40"][y="40"]') as SVGElement;
    expect(centre.style.fill).toBe("var(--sticker-u)");
    expect(centre.style.stroke).toBe("var(--sticker-outline)");
    // Top row of the R strip is R's own colour.
    expect(shapes.some((s) => s.style.fill === "var(--sticker-r)")).toBe(true);
  });

  it("renders missing facelets as masked", () => {
    const { container } = render(<FaceletViewer cubeState="" />);
    const centre = container.querySelector('rect[x="40"][y="40"]') as SVGElement;
    expect(centre.style.fill).toBe("var(--sticker-masked)");
  });
});
