"use server";

import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

import { clientIp, createRateLimiter, normaliseEmail, normaliseSource } from "./validate";

export type WaitlistFailure = "invalid" | "rate-limited" | "error";
export type WaitlistResult = { ok: true; message: string } | { ok: false; reason: WaitlistFailure; error: string };
/** The form's state: nothing submitted yet, or the last result. */
export type WaitlistFormState = WaitlistResult | null;

/** Five sign-ups per IP per ten minutes. */
const allow = createRateLimiter(5, 10 * 60_000);

/**
 * Adds an email to the roadmap waitlist through the security-definer
 * `join_waitlist()` function (supabase/migrations/20261124000100_waitlist.sql),
 * so the anon key can add an address but never read the list.
 *
 * A duplicate says the same as a new sign-up ("You're on the list"), so the
 * form never reveals whether an address was already there.
 */
export async function joinWaitlist(input: { email: unknown; source?: unknown }): Promise<WaitlistResult> {
  const email = normaliseEmail(input.email);
  if (!email) return { ok: false, reason: "invalid", error: "Enter a valid email address." };

  const ip = clientIp(await headers());
  if (!allow(ip)) {
    return { ok: false, reason: "rate-limited", error: "Too many sign-ups from here. Try again in a few minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_waitlist", { p_email: email, p_source: normaliseSource(input.source) });
  if (error) {
    console.error("join_waitlist failed:", error.message);
    return { ok: false, reason: "error", error: "Couldn't sign you up just now. Try again in a moment." };
  }
  return { ok: true, message: "You're on the list." };
}

/** `joinWaitlist` in the shape `useActionState` wants (the "Notify me" form). */
export async function joinWaitlistFromForm(_prev: WaitlistFormState, formData: FormData): Promise<WaitlistFormState> {
  return joinWaitlist({ email: formData.get("email"), source: formData.get("source") });
}
