import Link from "next/link";
import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth/dal";

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
    redirect("/timer");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-2xl font-semibold tracking-tight text-foreground"
      >
        CubeHub
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
