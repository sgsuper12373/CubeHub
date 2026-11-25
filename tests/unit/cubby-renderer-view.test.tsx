import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createCubbyRenderer } from "@/components/cubby/create-renderer";

describe("createCubbyRenderer", () => {
  it("gives an SVG renderer whose View follows its inputs", () => {
    const r = createCubbyRenderer();
    expect(r.kind).toBe("svg");
    const { container } = render(<r.View size={56} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("data-expression")).toBe("idle");
    act(() => r.setInput("isTalking", true));
    expect(container.querySelector("svg")!.getAttribute("data-expression")).toBe("talking");
    r.destroy();
  });
});
