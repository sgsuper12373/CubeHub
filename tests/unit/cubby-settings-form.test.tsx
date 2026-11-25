import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { CompanionSettingsForm } from "@/components/cubby/companion-settings-form";
import { parseRecord, type CompanionRecord } from "@/lib/companion/record";
import { setCompanionPersister, useCompanionStore } from "@/stores/companion-store";

let saved: CompanionRecord[] = [];

beforeEach(() => {
  saved = [];
  setCompanionPersister((r) => saved.push(r));
  useCompanionStore.setState({
    hydrated: true,
    record: { ...parseRecord(null), tours: { timer: { seen: 1, skipped: false, offered: false } } },
    page: null,
    content: null,
    bubble: null,
    tour: null,
  });
});

describe("CompanionSettingsForm", () => {
  it("switches the mode and saves at once", () => {
    render(<CompanionSettingsForm />);
    fireEvent.click(screen.getByRole("radio", { name: "Quiet" }));
    expect(useCompanionStore.getState().record.settings.mode).toBe("quiet");
    expect(saved.at(-1)?.settings.mode).toBe("quiet");
    expect(screen.getByText("Only what you ask for from the dock.")).toBeTruthy();
  });

  it("renames on Enter, cleaned up, and resets to Cubby", () => {
    render(<CompanionSettingsForm />);
    const input = screen.getByLabelText("Name");
    fireEvent.change(input, { target: { value: "  Kubo   the  cube " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(useCompanionStore.getState().record.settings.name).toBe("Kubo the cube");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(useCompanionStore.getState().record.settings.name).toBe("Cubby");
  });

  it("an empty name falls back to Cubby", () => {
    render(<CompanionSettingsForm />);
    const input = screen.getByLabelText("Name");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);
    expect(useCompanionStore.getState().record.settings.name).toBe("Cubby");
  });

  it("sets reactions, motion and auto tours", () => {
    render(<CompanionSettingsForm />);
    fireEvent.click(screen.getByRole("radio", { name: "PBs only" }));
    fireEvent.click(screen.getByRole("radio", { name: "Reduced" }));
    fireEvent.click(screen.getByRole("switch", { name: "Tours on first visit" }));
    expect(useCompanionStore.getState().record.settings).toMatchObject({ reactions: "pb", motion: "reduced", autoTours: false });
  });

  it("resets tours", () => {
    render(<CompanionSettingsForm />);
    fireEvent.click(screen.getByRole("button", { name: "Reset tours" }));
    expect(useCompanionStore.getState().record.tours).toEqual({});
    expect(screen.getByText(/plays again/)).toBeTruthy();
  });
});
