"use client";

import { useState } from "react";
import Link from "next/link";
import { LogIn, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Dismissible pill shown after 3+ local (logged-out) solves.
 * Encourages sign-in to persist data across devices.
 * Non-blocking — never covers the timer.
 */
export function SignInNudge({
  solveCount,
  onDismiss,
}: {
  solveCount: number;
  onDismiss: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || solveCount < 3) return null;

  return (
    <div
      className={cn(
        "mx-auto flex max-w-sm items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2",
        "animate-in fade-in slide-in-from-bottom-2 duration-300",
      )}
    >
      <LogIn className="size-4 shrink-0 text-primary" />
      <span className="text-sm text-foreground">
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
        {" "}to keep {solveCount === 1 ? "this solve" : `these ${solveCount} solves`}
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        className="ml-auto rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => {
          setDismissed(true);
          onDismiss();
        }}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
