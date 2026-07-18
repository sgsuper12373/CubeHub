import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign-in error — CubeHub",
};

export default function AuthCodeErrorPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Couldn&apos;t complete sign-in
      </h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        The link may have expired or already been used. Please try signing in
        again.
      </p>
      <Link
        href="/login"
        className="mt-6 text-sm font-medium text-primary hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
