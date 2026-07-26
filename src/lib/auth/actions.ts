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

function getValidNext(formData: FormData): string {
  const next = String(formData.get("next") ?? "").trim();
  if (next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return DEFAULT_LANDING;
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

  const destination = getValidNext(formData);
  revalidatePath("/", "layout");
  redirect(destination);
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
  const destination = getValidNext(formData);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Email confirmation is ON: this link returns the user to the code
      // exchange route, which establishes the session.
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(destination)}`,
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

export type ProfileState = { error?: string; success?: boolean } | undefined;

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const username = String(formData.get("username") ?? "").trim();
  const displayNameRaw = String(formData.get("display_name") ?? "").trim();
  const displayName = displayNameRaw.length > 0 ? displayNameRaw : null;

  if (!username) {
    return { error: "Username is required." };
  }
  if (username.length < 3 || username.length > 24) {
    return { error: "Username must be between 3 and 24 characters." };
  }
  if (!/^[A-Za-z0-9_]+$/.test(username)) {
    return { error: "Username can only contain letters, numbers, and underscores." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update your profile." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username, display_name: displayName })
    .eq("id", user.id);

  if (error) {
    if (
      error.code === "23505" ||
      error.message.toLowerCase().includes("unique") ||
      error.message.includes("uq_profiles_username_lower")
    ) {
      return { error: "That username is already taken. Please choose another." };
    }
    return { error: error.message || "Failed to update profile." };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
