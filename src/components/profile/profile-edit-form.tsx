"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveProfileDetails, type ProfileEditState } from "@/lib/profile/actions";
import type { EditableProfile } from "@/lib/profile/dal";
import { METHODS } from "@/lib/profile/level";
import {
  BIO_MAX,
  countryFlag,
  countryOptions,
  CUBE_NAME_MAX,
  DISPLAY_NAME_MAX,
  LEARNING_NOW_MAX,
} from "@/lib/profile/validate";
import { TIMER_EVENTS } from "@/lib/timer/events";
import { cn } from "@/lib/utils";

import { AvatarUploader } from "./avatar-uploader";

/**
 * /profile/edit. The avatar saves on its own as soon as a photo is chosen;
 * everything else saves together with the button, through the server action
 * (which validates again with the same rules as the form).
 */
export function ProfileEditForm({ profile }: { profile: EditableProfile }) {
  const [state, formAction, pending] = useActionState<ProfileEditState, FormData>(
    saveProfileDetails,
    undefined,
  );
  const [bio, setBio] = useState(profile.bio ?? "");
  const [isPublic, setIsPublic] = useState(profile.isPublic);
  const [showActivity, setShowActivity] = useState(profile.showActivity);
  const [showLearning, setShowLearning] = useState(profile.showLearning);
  const countries = useMemo(() => countryOptions(), []);
  const fieldError = (field: NonNullable<ProfileEditState>["field"]) =>
    state?.field === field ? state?.error : undefined;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Photo</h2>
        <AvatarUploader
          userId={profile.id}
          name={profile.displayName || profile.username}
          initialUrl={profile.avatarUrl}
        />
      </section>

      <form action={formAction} className="space-y-6">
        <Field
          id="username"
          label="Username"
          hint="Your profile link: /profile/username"
          error={fieldError("username")}
        >
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 font-mono text-sm text-muted-foreground">
              @
            </span>
            <Input
              id="username"
              name="username"
              defaultValue={profile.username}
              required
              minLength={3}
              maxLength={24}
              pattern="[A-Za-z0-9_]+"
              autoCapitalize="none"
              spellCheck={false}
              className="pl-7 font-mono"
              aria-invalid={!!fieldError("username")}
            />
          </div>
        </Field>

        <Field id="display_name" label="Display name" error={fieldError("displayName")}>
          <Input
            id="display_name"
            name="display_name"
            defaultValue={profile.displayName ?? ""}
            maxLength={DISPLAY_NAME_MAX}
            placeholder={profile.username}
            aria-invalid={!!fieldError("displayName")}
          />
        </Field>

        <Field
          id="bio"
          label="Bio"
          hint={`${bio.length}/${BIO_MAX}`}
          error={fieldError("bio")}
        >
          <Textarea
            id="bio"
            name="bio"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={BIO_MAX}
            placeholder="Main event, goals, favourite cube…"
            aria-invalid={!!fieldError("bio")}
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="country" label="Country" error={fieldError("country")}>
            <select
              id="country"
              name="country"
              defaultValue={profile.country}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {countryFlag(c.code)} {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="wca_id"
            label="WCA ID"
            hint="Optional. Only you see it until WCA IDs can be verified."
            error={fieldError("wcaId")}
          >
            <Input
              id="wca_id"
              name="wca_id"
              defaultValue={profile.wcaId ?? ""}
              maxLength={10}
              autoCapitalize="characters"
              spellCheck={false}
              className="font-mono uppercase"
              aria-invalid={!!fieldError("wcaId")}
            />
          </Field>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">How I cube</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field id="main_method" label="Method" error={fieldError("mainMethod")}>
              <select
                id="main_method"
                name="main_method"
                defaultValue={profile.mainMethod ?? ""}
                className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Not set</option>
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="learning_now" label="Learning now" hint="Optional" error={fieldError("learningNow")}>
              <Input
                id="learning_now"
                name="learning_now"
                defaultValue={profile.learningNow ?? ""}
                maxLength={LEARNING_NOW_MAX}
                placeholder="e.g. full OLL"
                aria-invalid={!!fieldError("learningNow")}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">My setup</h2>
            <p className="text-xs text-muted-foreground">
              Your main cube for each event. Leave an event empty to hide it.
            </p>
          </div>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {TIMER_EVENTS.map((e) => (
              <div key={e.id} className="flex items-center gap-3">
                <Label htmlFor={`cube_${e.id}`} className="w-20 shrink-0 text-muted-foreground">
                  {e.label}
                </Label>
                <Input
                  id={`cube_${e.id}`}
                  name={`cube_${e.id}`}
                  defaultValue={profile.setups[e.id] ?? ""}
                  maxLength={CUBE_NAME_MAX}
                  placeholder={e.id === "333" ? "e.g. GAN 12 Maglev" : "Main cube"}
                />
              </div>
            ))}
          </div>
          {state?.field === "setups" && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {state.error}
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Privacy</h2>
          <Toggle
            name="is_public"
            checked={isPublic}
            onChange={setIsPublic}
            title="Public profile"
            hint={
              isPublic
                ? "Anyone can see your stats and personal bests."
                : "Others see only your name and photo. You still see everything."
            }
          />
          <Toggle
            name="show_activity"
            checked={showActivity}
            onChange={setShowActivity}
            disabled={!isPublic}
            title="Show my practice activity"
            hint="The calendar of days you practised, and your streaks."
          />
          <Toggle
            name="show_learning"
            checked={showLearning}
            onChange={setShowLearning}
            disabled={!isPublic}
            title="Show my learning progress"
            hint="Which algorithm sets you've learned, from Learn."
          />
        </section>

        {state?.error && !state.field && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {state.error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" render={<Link href="/profile" />} nativeButton={false}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/**
 * A labelled checkbox. When disabled (a private profile hides everything
 * anyway) the box stays submitted with its value, so turning the profile
 * public again restores the previous choices.
 */
function Toggle({
  name,
  checked,
  onChange,
  disabled = false,
  title,
  hint,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border bg-card/60 p-4",
        disabled ? "opacity-60" : "cursor-pointer",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 size-4 accent-primary"
      />
      {/* Disabled inputs aren't submitted, so the value travels in a hidden one. */}
      {checked && <input type="hidden" name={name} value="on" />}
      <span className="space-y-0.5">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && (
        <p role="alert" className={cn("text-xs font-medium text-destructive")}>
          {error}
        </p>
      )}
    </div>
  );
}
