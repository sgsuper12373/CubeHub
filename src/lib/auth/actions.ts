"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string } | undefined;

const DEFAULT_LANDING = "/timer";

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: "Enter both your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(DEFAULT_LANDING);
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: "Enter both your email and password." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Email confirmation is ON: this link returns the user to the code
      // exchange route, which establishes the session.
      emailRedirectTo: `${origin}/auth/callback?next=${DEFAULT_LANDING}`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // When confirmation is required for an email that already exists, Supabase
  // returns a decoy user with no identities instead of an error (to avoid
  // leaking which emails are registered). Surface a neutral message.
  if (data.user && data.user.identities?.length === 0) {
    return {
      error: "An account with this email already exists. Try logging in.",
    };
  }

  redirect(`/signup/check-email?email=${encodeURIComponent(email)}`);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
