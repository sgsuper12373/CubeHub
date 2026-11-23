"use client";

import { BookOpen, Play, Target } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { buttonVariants } from "@/components/ui/button";
import { continueButtonLabel, drillButtonLabel } from "@/lib/home/cards";
import { eventLabel, loadLastEvent } from "@/lib/timer/events";
import { isOverlayOpen } from "@/stores/overlay-store";
import { cn } from "@/lib/utils";

const noop = () => () => {};

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Home's quick-start row (docs/home-plan.md → Greeting and quick start): the
 * timer with the last-used puzzle, the drill, the Learn series to continue.
 * Enter starts the primary button when nothing is focused that takes text.
 * Never Space: Space belongs to the timer.
 */
export function QuickStart({
  due = 0,
  continueSeries = null,
}: {
  due?: number;
  continueSeries?: { name: string; href: string } | null;
}) {
  const router = useRouter();
  // The timer remembers the last event per device (lib/timer/events.ts).
  const puzzle = useSyncExternalStore(noop, loadLastEvent, () => "333");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (isTyping(e.target) || isOverlayOpen()) return;
      // A focused link or button already handles its own Enter.
      if (e.target instanceof HTMLElement && e.target.closest("a, button, [role=button]")) return;
      e.preventDefault();
      router.push("/timer");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="flex flex-wrap gap-2" data-tour="home-quick-start">
      <Link href="/timer" className={cn(buttonVariants({ size: "lg" }), "h-11 gap-2 px-4 text-sm")}>
        <Play className="size-4" />
        Start {eventLabel(puzzle)} session
        <kbd className="ml-1 hidden rounded border border-primary-foreground/30 px-1 font-sans text-[10px] opacity-80 sm:inline">
          Enter
        </kbd>
      </Link>
      <Link
        href="/learn/333/drill"
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 gap-2 px-4 text-sm")}
      >
        <Target className="size-4" />
        {drillButtonLabel(due)}
      </Link>
      <Link
        href={continueSeries?.href ?? "/learn"}
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 gap-2 px-4 text-sm")}
      >
        <BookOpen className="size-4" />
        {continueButtonLabel(continueSeries?.name ?? null)}
      </Link>
    </div>
  );
}
