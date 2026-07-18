import Link from "next/link";
import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth/dal";

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Already signed in? No reason to show login/signup.
  if (await getUser()) {
    redirect("/timer");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-2xl font-semibold tracking-tight text-foreground"
      >
        CubeHub
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
