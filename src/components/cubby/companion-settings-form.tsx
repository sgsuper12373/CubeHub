"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  COMPANION_MODES,
  DEFAULT_NAME,
  MOTION_LEVELS,
  NAME_MAX,
  normalizeName,
  REACTION_LEVELS,
  type CompanionSettings,
} from "@/lib/companion/settings";
import { cn } from "@/lib/utils";
import { useCompanionStore } from "@/stores/companion-store";

const MODE_LABEL: Record<CompanionSettings["mode"], string> = { on: "On", quiet: "Quiet", off: "Off" };
const MODE_HINT: Record<CompanionSettings["mode"], string> = {
  on: "Tours, greetings and reactions.",
  quiet: "Only what you ask for from the dock.",
  off: "Hidden everywhere.",
};
const REACTION_LABEL: Record<CompanionSettings["reactions"], string> = { all: "All", pb: "PBs only", off: "Off" };
const MOTION_LABEL: Record<CompanionSettings["motion"], string> = { system: "Follow system", full: "Full", reduced: "Reduced" };

/**
 * Cubby's settings (docs/cubby-cubing-companion.md → Settings), shared by the
 * dock's sheet and the Settings page. Changes save straight away.
 */
export function CompanionSettingsForm({ className }: { className?: string }) {
  const settings = useCompanionStore((s) => s.record.settings);
  const update = useCompanionStore((s) => s.updateSettings);
  const [draftName, setDraftName] = useState<string | null>(null);
  const [toursReset, setToursReset] = useState(false);
  const nameId = useId();
  const name = draftName ?? settings.name;

  const saveName = () => {
    if (draftName === null) return;
    update({ name: normalizeName(draftName) });
    setDraftName(null);
  };

  return (
    <div className={cn("space-y-5", className)}>
      <Choice
        legend="Companion"
        hint={MODE_HINT[settings.mode]}
        options={COMPANION_MODES.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
        value={settings.mode}
        onChange={(mode) => update({ mode })}
      />

      <div className="space-y-1.5">
        <label htmlFor={nameId} className="text-sm font-medium">
          Name
        </label>
        <div className="flex gap-2">
          <input
            id={nameId}
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setDraftName(e.currentTarget.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
            }}
            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            disabled={settings.name === DEFAULT_NAME && draftName === null}
            onClick={() => {
              setDraftName(null);
              update({ name: DEFAULT_NAME });
            }}
          >
            Reset
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Used in every tour and greeting. Up to {NAME_MAX} characters.</p>
      </div>

      <Toggle
        label="Tours on first visit"
        hint="Each page's tour starts the first time you open it."
        on={settings.autoTours}
        onChange={(autoTours) => update({ autoTours })}
      />

      <Choice
        legend="Reactions"
        hint="Animations after a solve: PBs, +2 and DNF, cases learned."
        options={REACTION_LEVELS.map((r) => ({ value: r, label: REACTION_LABEL[r] }))}
        value={settings.reactions}
        onChange={(reactions) => update({ reactions })}
      />

      <Toggle
        label="BLD solving animation"
        hint="During a 3x3 BLD solve, Cubby memorises and solves blindfolded in the corner."
        on={settings.bldAnimation}
        onChange={(bldAnimation) => update({ bldAnimation })}
      />

      <Choice
        legend="Motion"
        hint="Reduced turns animations into still poses."
        options={MOTION_LEVELS.map((m) => ({ value: m, label: MOTION_LABEL[m] }))}
        value={settings.motion}
        onChange={(motion) => update({ motion })}
      />

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Tours</p>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {toursReset ? "Done: each page's tour plays again on your next visit." : "Play every page's tour again."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            useCompanionStore.getState().resetTours();
            setToursReset(true);
          }}
        >
          Reset tours
        </Button>
      </div>
    </div>
  );
}

function Choice<T extends string>({
  legend,
  hint,
  options,
  value,
  onChange,
}: {
  legend: string;
  hint?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex rounded-lg border border-border bg-muted/30 p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex-1 cursor-pointer rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              value === o.value ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </fieldset>
  );
}

function Toggle({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (on: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <input id={id} type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.currentTarget.checked)} className="size-5 accent-primary" />
    </div>
  );
}
