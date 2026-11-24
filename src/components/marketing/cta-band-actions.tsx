"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useViewer } from "@/components/marketing/use-viewer";
import { buttonVariants } from "@/components/ui/button";
import { appHref, SIGN_IN_HREF } from "@/lib/marketing/links";
import { cn } from "@/lib/utils";

/**
 * The CTA band's copy and buttons. Signed out (the default, and what the
 * static HTML shows): "Start timing free. No account needed." with signing in
 * as the secondary action. Signed in: pick up where you left off, and drill.
 * A client island so the landing page stays static; it's below the fold, so
 * the cookie's guess is fine until GET /api/viewer answers.
 */
export function CtaBandActions() {
  const { viewer, likelySignedIn } = useViewer();
  const signedIn = viewer?.signedIn ?? likelySignedIn ?? false;

  return (
    <>
      <p className="max-w-md text-base text-muted-foreground sm:text-lg">
        {signedIn
          ? "Pick up where you left off. Your times are synced across your devices."
          : "Start timing free. No account needed."}
      </p>
      <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link
          href={appHref("/timer")}
          className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full px-7 text-base font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90")}
        >
          {signedIn ? "Open the timer" : "Start timing free"}
          <ArrowRight data-icon="inline-end" className="size-4" />
        </Link>
        <Link
          href={signedIn ? appHref("/learn/333/drill") : SIGN_IN_HREF}
          className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 rounded-full px-7 text-base font-semibold")}
        >
          {signedIn ? "Drill your weakest cases" : "Sign in to sync across devices"}
        </Link>
      </div>
    </>
  );
}
