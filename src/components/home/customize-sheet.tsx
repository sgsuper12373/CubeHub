"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { saveHomeLayout } from "@/lib/home/actions";
import { availableCards, CARDS, isCardOn, setCardOn, type HomeLayout, type Visitor } from "@/lib/home/cards";
import { writeLocalHomeLayout } from "@/lib/home/layout-storage";
import { cn } from "@/lib/utils";
import { useOverlayLock } from "@/stores/overlay-store";

/**
 * "Customize" (docs/home-plan.md → Customising Home): switch cards on and
 * off, or reset to the default. The greeting and quick start can't be hidden.
 * Guests save to this browser; signed-in cubers to their account.
 */
export function CustomizeSheet({
  visitor,
  layout,
  signedIn,
}: {
  visitor: Visitor;
  layout: HomeLayout | null;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<HomeLayout | null>(layout);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  useOverlayLock(open);

  function save(next: HomeLayout | null) {
    setDraft(next);
    setError(null);
    if (!signedIn) {
      writeLocalHomeLayout(next);
      return;
    }
    startTransition(async () => {
      const result = await saveHomeLayout(next);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(layout);
      }}
    >
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="gap-1.5 text-muted-foreground">
        <SlidersHorizontal className="size-3.5" />
        Customize
      </Button>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Customize Home</SheetTitle>
          <SheetDescription>Choose the cards you see. The greeting and quick start always stay.</SheetDescription>
        </SheetHeader>
        <ul className="flex flex-col gap-1 px-4">
          {availableCards(visitor).map((id) => {
            const on = isCardOn(visitor, draft, id);
            return (
              <li key={id}>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-muted">
                  {CARDS[id].title}
                  <input
                    type="checkbox"
                    role="switch"
                    checked={on}
                    disabled={pending}
                    onChange={(e) => save(setCardOn(visitor, draft, id, e.currentTarget.checked))}
                    className={cn(
                      "relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-muted transition-colors",
                      "after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-background after:shadow after:transition-transform",
                      "checked:bg-primary checked:after:translate-x-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      "motion-reduce:transition-none motion-reduce:after:transition-none",
                    )}
                  />
                </label>
              </li>
            );
          })}
        </ul>
        {error && (
          <p role="alert" className="px-6 text-xs text-destructive">
            {error}
          </p>
        )}
        <SheetFooter>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => save(null)}>
            Reset to default
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {signedIn ? "Saved to your account." : "Saved in this browser."}
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
