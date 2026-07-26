import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { UsernameOnboarding } from "@/components/auth/username-onboarding";

vi.mock("@/lib/auth/actions", () => ({
  updateProfile: vi.fn(),
}));

describe("UsernameOnboarding Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("does not render modal if profile is null or username is already customized", () => {
    const customProfile = {
      username: "speedcuber_pro",
      display_name: "Speed Cuber",
      avatar_url: null,
    };

    render(<UsernameOnboarding profile={customProfile} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText("Choose your CubeHub handle")).toBeNull();
  });

  it("renders modal automatically when profile handle matches default pattern user_<12 hex>", () => {
    const defaultProfile = {
      username: "user_0123456789ab",
      display_name: null,
      avatar_url: null,
    };

    render(<UsernameOnboarding profile={defaultProfile} />);

    // Fast-forward past the 600ms transition delay
    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByText("Choose your CubeHub handle")).toBeDefined();
    expect(screen.getByPlaceholderText("speedcuber_in")).toBeDefined();
  });

  it("closes modal and saves to sessionStorage when 'Skip for now' is clicked", () => {
    const defaultProfile = {
      username: "user_abcdef012345",
      display_name: null,
      avatar_url: null,
    };

    render(<UsernameOnboarding profile={defaultProfile} />);
    act(() => {
      vi.advanceTimersByTime(700);
    });

    const skipButton = screen.getByText("Skip for now");
    expect(skipButton).toBeDefined();

    act(() => {
      fireEvent.click(skipButton);
    });

    expect(sessionStorage.getItem("cubehub_skip_username_onboarding")).toBe("true");
    expect(screen.queryByText("Choose your CubeHub handle")).toBeNull();
  });
});
