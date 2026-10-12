import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorView } from "@/components/layout/error-view";

describe("ErrorView", () => {
  it("retries, shows the digest, and never the message", () => {
    const retry = vi.fn();
    const error = Object.assign(new Error("secret db detail"), { digest: "abc123" });
    render(<ErrorView error={error} retry={retry} />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByText("Ref: abc123")).toBeTruthy();
    expect(screen.queryByText(/secret db detail/)).toBeNull();
  });

  it("has no reference line without a digest", () => {
    render(<ErrorView error={new Error("x")} retry={() => {}} />);
    expect(screen.queryByText(/^Ref:/)).toBeNull();
  });
});
