"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { HomeCard } from "@/components/home/home-card";
import { latestChanges } from "@/lib/home/content";
import { dismissChange, dismissedChangesSnapshot, parseDismissed, subscribeDismissals } from "@/lib/home/dismissals";

/** What's new (docs/home-plan.md → card 10): the latest one or two changelog items, each dismissible. */
export function WhatsNewCard() {
  const raw = useSyncExternalStore(subscribeDismissals, dismissedChangesSnapshot, () => "[]");
  const items = latestChanges(parseDismissed(raw));
  if (items.length === 0) return null;

  return (
    <HomeCard id="whatsnew" title="What's new">
      <ul className="flex flex-col gap-2">
        {items.map((e) => (
          <li key={e.id} className="relative rounded-lg bg-muted/40 py-2 pr-8 pl-3">
            <Link href={e.link} className="block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
              <p className="text-sm font-medium text-foreground">{e.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{e.line}</p>
            </Link>
            <button
              type="button"
              onClick={() => dismissChange(e.id)}
              aria-label={`Dismiss "${e.title}"`}
              className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </HomeCard>
  );
}
