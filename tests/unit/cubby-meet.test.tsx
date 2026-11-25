import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MeetCubby } from "@/components/marketing/meet-cubby";

describe("MeetCubby (landing step 10)", () => {
  it("shows three of Cubby's moments with the plan's captions", () => {
    render(<MeetCubby />);
    expect(screen.getByRole("heading", { level: 2, name: "Meet Cubby, your practice buddy." })).toBeTruthy();
    for (const caption of ["Shows you around every page", "Cheers every PB", "Later: coaches you with AI"]) expect(screen.getByText(caption)).toBeTruthy();
    // The art is decorative: the captions carry the meaning.
    expect(document.querySelectorAll("svg.cubby-art[aria-hidden='true']")).toHaveLength(3);
  });
});
