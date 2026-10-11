import { redirect } from "next/navigation";

import { getProfile } from "@/lib/auth/dal";

/**
 * "My profile": the nav's Profile tab. Sends a signed-in cuber to their own
 * public page and anyone else to sign in first (the login page honours
 * `next`, so they land back here and then on their profile).
 */
export default async function MyProfilePage() {
  const profile = await getProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent("/profile")}`);
  redirect(`/profile/${encodeURIComponent(profile.username)}`);
}
