"use client";

import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { joinWaitlistFromForm, type WaitlistFormState } from "@/lib/waitlist/actions";
import type { WaitlistSource } from "@/lib/waitlist/validate";

/**
 * "Notify me" (docs/landing-plan.md → Roadmap and sign-up). A client island
 * so the page around it stays static; it posts to the `joinWaitlist` server
 * action. A new address and one already on the list both get "You're on the
 * list", so the form never says whether an email was there before.
 */
export function WaitlistForm({ source, className }: { source: WaitlistSource; className?: string }) {
  const [state, formAction, pending] = useActionState<WaitlistFormState, FormData>(joinWaitlistFromForm, null);
  const id = useId();
  const emailId = `${id}-email`;
  const noteId = `${id}-note`;
  const statusId = `${id}-status`;
  // A new submit clears the last error at once, not when the answer arrives.
  const failure = !pending && state?.ok === false ? state : null;
  const invalid = failure?.reason === "invalid";

  return (
    <div className={cn("flex w-full max-w-md flex-col gap-2", className)} data-testid="waitlist">
      {state?.ok ? (
        <p
          id={statusId}
          role="status"
          className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-foreground"
        >
          <Check className="size-4 text-primary" aria-hidden />
          {state.message} We&apos;ll email you when something ships.
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-2 sm:flex-row" noValidate>
          <label htmlFor={emailId} className="sr-only">
            Email address
          </label>
          <input type="hidden" name="source" value={source} />
          <Input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            required
            disabled={pending}
            aria-invalid={invalid || undefined}
            aria-describedby={failure ? `${statusId} ${noteId}` : noteId}
            className="h-11 rounded-full px-4 text-base"
          />
          <Button type="submit" size="lg" disabled={pending} className="h-11 shrink-0 rounded-full px-6 text-base font-semibold">
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {pending ? "Adding you…" : "Notify me"}
          </Button>
        </form>
      )}
      {failure ? (
        <p id={statusId} role="alert" className="text-sm font-medium text-destructive">
          {failure.error}
        </p>
      ) : null}
      <p id={noteId} className="text-xs text-muted-foreground">
        One email when something ships. No spam.{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          Privacy
        </Link>
      </p>
    </div>
  );
}
