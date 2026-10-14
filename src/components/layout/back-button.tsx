"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * "Back": to wherever the cuber came from, or `fallback` when the page was
 * opened directly (a shared link), where there's no in-app page to go back to.
 */
export function BackButton({ fallback, className }: { fallback: string; className?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => {
        const cameFromHere =
          window.history.length > 1 &&
          document.referrer !== "" &&
          new URL(document.referrer).origin === window.location.origin;
        if (cameFromHere) router.back();
        else router.push(fallback);
      }}
    >
      <ChevronLeft />
      Back
    </Button>
  );
}
