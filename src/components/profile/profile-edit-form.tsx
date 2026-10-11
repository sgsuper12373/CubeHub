"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveProfileDetails, type ProfileEditState } from "@/lib/profile/actions";
import type { EditableProfile } from "@/lib/profile/dal";
import { BIO_MAX, countryFlag, countryOptions, DISPLAY_NAME_MAX } from "@/lib/profile/validate";
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
            hint="Optional, e.g. 2019SING01"
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

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Privacy</h2>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card/60 p-4">
            <input
              type="checkbox"
              name="is_public"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mt-0.5 size-4 accent-primary"
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium text-foreground">Public profile</span>
              <span className="block text-xs text-muted-foreground">
                {isPublic
                  ? "Anyone can see your stats and personal bests."
                  : "Others see only your name and photo. You still see everything."}
              </span>
            </span>
          </label>
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
