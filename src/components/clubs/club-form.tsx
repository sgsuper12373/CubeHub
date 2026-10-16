"use client";

import { Globe, Lock } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClub, updateClubSettings, type ClubFormState } from "@/lib/clubs/actions";
import {
  CLUB_TAGS,
  CLUB_TYPES,
  DESCRIPTION_MAX,
  NAME_MAX,
  SLUG_MAX,
  slugify,
  TAGS_MAX,
  type ClubField,
} from "@/lib/clubs/types";
import { cn } from "@/lib/utils";

export interface ClubFormValues {
  name: string;
  slug: string;
  description: string;
  type: string;
  tags: string[];
  isPublic: boolean;
}

const EMPTY: ClubFormValues = { name: "", slug: "", description: "", type: "", tags: [], isPublic: true };

/**
 * Create (/clubs/new) and edit (manage → Settings). The address follows the
 * name until it's edited by hand. The server action validates again with the
 * same rules.
 */
export function ClubForm({
  mode,
  clubId,
  initial = EMPTY,
}: {
  mode: "create" | "edit";
  clubId?: string;
  initial?: ClubFormValues;
}) {
  const [state, formAction, pending] = useActionState<ClubFormState, FormData>(
    mode === "create" ? createClub : updateClubSettings,
    undefined,
  );
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [description, setDescription] = useState(initial.description);
  const [type, setType] = useState(initial.type);
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [isPublic, setIsPublic] = useState(initial.isPublic);

  const fieldError = (field: ClubField) => (state?.field === field ? state.error : undefined);

  function toggleTag(id: string) {
    setTags((cur) => (cur.includes(id) ? cur.filter((t) => t !== id) : cur.length < TAGS_MAX ? [...cur, id] : cur));
  }

  return (
    <form action={formAction} className="space-y-6">
      {clubId && <input type="hidden" name="club_id" value={clubId} />}
      {mode === "edit" && <input type="hidden" name="old_slug" value={initial.slug} />}

      <Field id="name" label="Name" hint={`${name.trim().length}/${NAME_MAX}`} error={fieldError("name")}>
        <Input
          id="name"
          name="name"
          required
          maxLength={NAME_MAX}
          value={name}
          placeholder="e.g. Pune Speedcubers"
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
        />
      </Field>

      <Field id="slug" label="Address" hint={`cubehub/clubs/${slug || "…"}`} error={fieldError("slug")}>
        <Input
          id="slug"
          name="slug"
          required
          maxLength={SLUG_MAX}
          value={slug}
          pattern="[a-z0-9\-]+"
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
          }}
        />
      </Field>

      <Field
        id="description"
        label="Description"
        hint={`${description.length}/${DESCRIPTION_MAX}`}
        error={fieldError("description")}
      >
        <Textarea
          id="description"
          name="description"
          rows={3}
          maxLength={DESCRIPTION_MAX}
          value={description}
          placeholder="Who it's for, when you meet, what you practise."
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Type</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CLUB_TYPES.map((t) => (
            <label
              key={t.id}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
                type === t.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name="type"
                value={t.id}
                checked={type === t.id}
                onChange={() => setType(t.id)}
                className="sr-only"
                required
              />
              {t.label}
            </label>
          ))}
        </div>
        {fieldError("type") && <ErrorLine>{fieldError("type")}</ErrorLine>}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="flex w-full items-baseline justify-between text-sm font-medium text-foreground">
          Tags
          <span className="text-xs font-normal text-muted-foreground">
            {tags.length}/{TAGS_MAX}
          </span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {CLUB_TAGS.map((t) => {
            const on = tags.includes(t.id);
            const full = !on && tags.length >= TAGS_MAX;
            return (
              <label
                key={t.id}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
                  on ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                  full && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  type="checkbox"
                  name="tags"
                  value={t.id}
                  checked={on}
                  disabled={full}
                  onChange={() => toggleTag(t.id)}
                  className="sr-only"
                />
                {t.label}
              </label>
            );
          })}
        </div>
        {fieldError("tags") && <ErrorLine>{fieldError("tags")}</ErrorLine>}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Who can join</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              { value: "public", icon: Globe, title: "Public", body: "Anyone can join at once." },
              {
                value: "private",
                icon: Lock,
                title: "Private",
                body: "Cubers ask to join and an admin approves. Members and posts stay hidden from everyone else.",
              },
            ] as const
          ).map((o) => {
            const on = (o.value === "public") === isPublic;
            return (
              <label
                key={o.value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
                  on ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40",
                )}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={o.value}
                  checked={on}
                  onChange={() => setIsPublic(o.value === "public")}
                  className="sr-only"
                />
                <o.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>
                  <span className="block text-sm font-medium text-foreground">{o.title}</span>
                  <span className="block text-xs text-muted-foreground">{o.body}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {state?.error && !state.field && <ErrorLine>{state.error}</ErrorLine>}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : mode === "create" ? "Create club" : "Save changes"}
      </Button>
    </form>
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
        {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <ErrorLine>{error}</ErrorLine>}
    </div>
  );
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-xs font-medium text-destructive">
      {children}
    </p>
  );
}
