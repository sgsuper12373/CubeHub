"use client";

import Link from "next/link";

import { CubeMark } from "@/components/layout/logo";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * The error boundary body for `error.tsx`. It never shows `error.message`: in
 * production a server error's message is a generic placeholder anyway, and a
 * client error's could leak details. The digest matches the server logs.
 */
export function ErrorView({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center"
    >
      <CubeMark title="CubeHub" className="size-20" />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
        <p className="text-muted-foreground">
          This page hit an error. Trying again usually fixes it.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="lg" onClick={() => retry()}>
          Try again
        </Button>
        <Link href="/" className={buttonVariants({ size: "lg", variant: "outline" })}>
          Home
        </Link>
      </div>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>
      )}
    </div>
  );
}
