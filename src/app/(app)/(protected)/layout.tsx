import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth/dal";

/**
 * Gate for routes that are meaningless without an account (/settings, and
 * later /profile/edit). Only use this when the *entire page* requires a
 * user — for pages that are public but contain gated rows, the gate belongs
 * in RLS instead. See `docs/access-control.md`.
 *
 * `getUser()` is memoized per render pass, so the parent `(app)` layout's
 * `getProfile()` call means this costs no extra round trip.
 */
export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!(await getUser())) {
    redirect("/login");
  }

  return <>{children}</>;
}
