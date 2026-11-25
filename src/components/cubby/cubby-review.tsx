"use client";

import { useEffect, useState } from "react";

import { CubbyArt } from "@/components/cubby/art/cubby-art";
import { createCubbyRenderer } from "@/components/cubby/create-renderer";
import { Button } from "@/components/ui/button";
import { BLD_PHASES, DIRECTIONS, MOODS, TRIGGERS, type CubbyRenderer } from "@/lib/companion/renderer";
import { EXPRESSIONS, type Pose } from "@/lib/companion/svg-state";

function still(expression: Pose["expression"]): Pose {
  return { expression, arms: "rest", body: "still", look: null, blindfold: false, holdingCube: false, memo: false };
}

/** The /dev/cubby review board: every expression at both sizes, then a live renderer with every input and trigger. */
export function CubbyReview() {
  const [renderer] = useState<CubbyRenderer>(() => createCubbyRenderer());
  const [reduced, setReduced] = useState(false);
  const [inputs, setInputs] = useState({ mood: "idle", isTalking: false, isThinking: false, pointAt: "none", bldPhase: "off" });
  useEffect(() => () => renderer.destroy(), [renderer]);

  const View = renderer.View;
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10 text-foreground">
      <header>
        <h1 className="text-2xl font-semibold">Cubby v0 review</h1>
        <p className="text-sm text-muted-foreground">Placeholder art behind the manifest. Switch the theme to check the stickers.</p>
      </header>

      <section aria-labelledby="expr">
        <h2 id="expr" className="mb-4 text-lg font-semibold">Expressions</h2>
        <ul className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {EXPRESSIONS.map((e) => (
            <li key={e} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4">
              <div className="flex items-end gap-4">
                <CubbyArt pose={still(e)} size={140} reduced={reduced} />
                <CubbyArt pose={still(e)} size={56} reduced={reduced} />
              </div>
              <span className="text-sm font-medium">{e}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="live" className="grid gap-6 md:grid-cols-[auto_1fr]">
        <div className="flex items-end gap-6 rounded-xl border border-border bg-card p-6">
          <View size={160} reduced={reduced} />
          <View size={56} reduced={reduced} />
        </div>
        <div className="flex flex-col gap-4">
          <h2 id="live" className="text-lg font-semibold">Live renderer</h2>
          <div className="flex flex-wrap gap-2">
            {TRIGGERS.map((t) => (
              <Button key={t} size="sm" variant="outline" onClick={() => renderer.fire(t)}>
                fire {t}
              </Button>
            ))}
          </div>
          <Choice label="mood" options={MOODS} value={inputs.mood} onChange={(v) => { setInputs({ ...inputs, mood: v }); renderer.setInput("mood", v as (typeof MOODS)[number]); }} />
          <Choice label="pointAt" options={["none", ...DIRECTIONS]} value={inputs.pointAt} onChange={(v) => { setInputs({ ...inputs, pointAt: v }); renderer.setInput("pointAt", v === "none" ? null : (v as (typeof DIRECTIONS)[number])); }} />
          <Choice label="bldPhase" options={BLD_PHASES} value={inputs.bldPhase} onChange={(v) => { setInputs({ ...inputs, bldPhase: v }); renderer.setInput("bldPhase", v as (typeof BLD_PHASES)[number]); }} />
          <div className="flex flex-wrap gap-4 text-sm">
            <Toggle label="isTalking" on={inputs.isTalking} onChange={(on) => { setInputs({ ...inputs, isTalking: on }); renderer.setInput("isTalking", on); }} />
            <Toggle label="isThinking" on={inputs.isThinking} onChange={(on) => { setInputs({ ...inputs, isThinking: on }); renderer.setInput("isThinking", on); }} />
            <Toggle label="reduced motion" on={reduced} onChange={setReduced} />
          </div>
        </div>
      </section>
    </main>
  );
}

function Choice({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset className="flex flex-wrap items-center gap-2 text-sm">
      <legend className="sr-only">{label}</legend>
      <span className="w-20 text-muted-foreground" aria-hidden>{label}</span>
      {options.map((o) => (
        <Button key={o} size="sm" variant={o === value ? "default" : "outline"} aria-pressed={o === value} onClick={() => onChange(o)}>
          {o}
        </Button>
      ))}
    </fieldset>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.currentTarget.checked)} />
      {label}
    </label>
  );
}
