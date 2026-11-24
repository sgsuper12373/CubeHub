import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WaitlistForm } from "@/components/marketing/waitlist-form";
import { joinWaitlistFromForm } from "@/lib/waitlist/actions";

vi.mock("@/lib/waitlist/actions", () => ({ joinWaitlistFromForm: vi.fn() }));
const action = vi.mocked(joinWaitlistFromForm);

async function submit(email: string) {
  render(<WaitlistForm source="landing-roadmap" />);
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: email } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Notify me" }));
  });
}

describe("WaitlistForm", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows the promise line and a privacy link before anything is sent", () => {
    render(<WaitlistForm source="landing-roadmap" />);
    expect(screen.getByText(/One email when something ships\. No spam\./)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Privacy" }).getAttribute("href")).toBe("/privacy");
  });

  it("sends the email and its source, then replaces the form with the success line", async () => {
    action.mockResolvedValue({ ok: true, message: "You're on the list." });
    await submit("cuber@example.in");
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("You're on the list."));
    const data = action.mock.calls[0][1];
    expect(data.get("email")).toBe("cuber@example.in");
    expect(data.get("source")).toBe("landing-roadmap");
    expect(screen.queryByRole("button", { name: "Notify me" })).toBeNull();
  });

  it("marks the field invalid on a bad address and keeps the form", async () => {
    action.mockResolvedValue({ ok: false, reason: "invalid", error: "Enter a valid email address." });
    await submit("nope");
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Enter a valid email address."));
    expect(screen.getByLabelText("Email address").getAttribute("aria-invalid")).toBe("true");
  });

  it("shows the rate-limit and failure messages without marking the field", async () => {
    action.mockResolvedValue({ ok: false, reason: "rate-limited", error: "Too many sign-ups from here. Try again in a few minutes." });
    await submit("cuber@example.in");
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Too many sign-ups"));
    expect(screen.getByLabelText("Email address").getAttribute("aria-invalid")).toBeNull();
  });
});
