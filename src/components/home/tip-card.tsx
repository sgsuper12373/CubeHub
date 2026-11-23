"use client";

import { X } from "lucide-react";
import { useSyncExternalStore } from "react";

import { CubeMark } from "@/components/layout/logo";
import { Card } from "@/components/ui/card";
import { localDayKey, tipForDay } from "@/lib/home/content";
import { dismissTipFor, subscribeDismissals, tipDismissedOnSnapshot } from "@/lib/home/dismissals";

const noop = () => () => {};

/**
 * Cubby's tip (docs/home-plan.md → card 7), v1: one line from a static pool,
 * a new one each day, dismissible for the day. The CH mark stands in for
 * Cubby's face until the companion's art exists.
 */
export function TipCard() {
  const today = useSyncExternalStore(noop, () => localDayKey(new Date()), () => null);
  const dismissedOn = useSyncExternalStore(subscribeDismissals, tipDismissedOnSnapshot, () => "");
  if (today === null || dismissedOn === today) return null;

  return (
    <Card data-tour="home-tip" role="region" aria-label="Cubby's tip" className="flex-row items-center gap-3 px-4 lg:col-span-2">
      <CubeMark className="size-8 shrink-0" />
      <p className="min-w-0 flex-1 text-sm text-foreground">
        <span className="sr-only">Cubby&apos;s tip: </span>
        {tipForDay(new Date())}
      </p>
      <button
        type="button"
        onClick={() => dismissTipFor(today)}
        aria-label="Hide today's tip"
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </Card>
  );
}
