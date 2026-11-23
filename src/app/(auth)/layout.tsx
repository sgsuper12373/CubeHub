import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CubeMark } from "@/components/layout/logo";
import { getUser } from "@/lib/auth/dal";
import { APP_URL } from "@/lib/site-url";

/**
 * App pages resolve relative canonical and Open Graph URLs against the app
 * origin, not the marketing one the root layout sets (docs/app-shell-plan.md →
 * Robots and sitemaps). The same origin in single-host mode.
 */
export const metadata: Metadata = { metadataBase: new URL(APP_URL) };

/**
 * Sign-in / sign-up pages. Deliberately outside the `(app)` group so they
 * render without a navbar or bottom nav — a "Sign In" button above a login
 * form is noise. Supplies its own `main` since the root layout has none.
 */
export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Already signed in? No reason to show login/signup.
  if (await getUser()) {
    redirect("/home");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link href="/" aria-label="CuberHub home" className="mb-8">
        <CubeMark className="size-20" />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
