"use client";

import { ChevronDown, ChevronUp, GripVertical, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { saveHomeLayout } from "@/lib/home/actions";
import {
  availableCards,
  CARDS,
  homeCards,
  isCardOn,
  moveCard,
  setCardOn,
  type CardId,
  type HomeLayout,
  type Visitor,
} from "@/lib/home/cards";
import { trackHomeCustomize } from "@/lib/home/analytics";
import { writeLocalHomeLayout } from "@/lib/home/layout-storage";
import { cn } from "@/lib/utils";
import { useOverlayLock } from "@/stores/overlay-store";

/**
 * "Customize" (docs/home-plan.md → Customising Home): switch cards on and
 * off, put them in your own order, or reset to the default. The greeting and
 * quick start can't be hidden. Guests save to this browser; signed-in cubers
 * to their account.
 *
 * Order: drag a card by its handle (mouse), or use its up/down buttons
 * (keyboard and touch, where native drag and drop doesn't work). Cards move
 * within their own column.
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
  const [dragging, setDragging] = useState<CardId | null>(null);
  useOverlayLock(open);

  const customizable = new Set(availableCards(visitor));
  const { main, rail } = homeCards(visitor, draft, { welcomeDone: true });
  const shownMain = main.filter((id) => customizable.has(id));
  const shownRail = rail.filter((id) => customizable.has(id));
  const hiddenIds = availableCards(visitor).filter((id) => !isCardOn(visitor, draft, id));

  function save(next: HomeLayout | null) {
    setDraft(next);
    trackHomeCustomize(next);
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
          <SheetDescription>Choose the cards you see and their order. The greeting and quick start always stay.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
          {(["main", "rail"] as const).map((col) => {
            const ids = (col === "main" ? shownMain : shownRail);
            if (ids.length === 0) return null;
            return (
              <section key={col} aria-label={col === "main" ? "Main column" : "Side column"}>
                <h3 className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                  {col === "main" ? "Main column" : "Side column (wide screens)"}
                </h3>
                <ul className="flex flex-col gap-1">
                  {ids.map((id, i) => (
                    <li
                      key={id}
                      draggable={!pending}
                      onDragStart={(e) => {
                        setDragging(id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", id);
                      }}
                      onDragEnd={() => setDragging(null)}
                      onDragOver={(e) => {
                        if (dragging && dragging !== id && CARDS[dragging].column === col) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragging && dragging !== id) save(moveCard(visitor, draft, dragging, { before: id }));
                        setDragging(null);
                      }}
                      className={cn(
                        "flex items-center gap-1 rounded-lg py-1 pr-2 pl-1 text-sm text-foreground hover:bg-muted",
                        dragging === id && "opacity-50",
                      )}
                    >
                      <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{CARDS[id].title}</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={pending || i === 0}
                        aria-label={`Move ${CARDS[id].title} up`}
                        onClick={() => save(moveCard(visitor, draft, id, "up"))}
                      >
                        <ChevronUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={pending || i === ids.length - 1}
                        aria-label={`Move ${CARDS[id].title} down`}
                        onClick={() => save(moveCard(visitor, draft, id, "down"))}
                      >
                        <ChevronDown />
                      </Button>
                      <Switch id={id} on disabled={pending} onChange={(on) => save(setCardOn(visitor, draft, id, on))} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {hiddenIds.length > 0 && (
            <section aria-label="Switched off">
              <h3 className="px-2 pb-1 text-xs font-medium text-muted-foreground">Switched off</h3>
              <ul className="flex flex-col gap-1">
                {hiddenIds.map((id) => (
                  <li key={id} className="flex items-center gap-1 rounded-lg py-1 pr-2 pl-7 text-sm text-foreground hover:bg-muted">
                    <span className="min-w-0 flex-1 truncate">{CARDS[id].title}</span>
                    <Switch id={id} on={false} disabled={pending} onChange={(on) => save(setCardOn(visitor, draft, id, on))} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
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

/** The on/off switch for one card; its accessible name is the card's title. */
function Switch({ id, on, disabled, onChange }: { id: CardId; on: boolean; disabled: boolean; onChange: (on: boolean) => void }) {
  return (
    <input
      type="checkbox"
      role="switch"
      aria-label={CARDS[id].title}
      checked={on}
      disabled={disabled}
      onChange={(e) => onChange(e.currentTarget.checked)}
      className={cn(
        "relative ml-1 h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-muted transition-colors",
        "after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-background after:shadow after:transition-transform",
        "checked:bg-primary checked:after:translate-x-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        "motion-reduce:transition-none motion-reduce:after:transition-none",
      )}
    />
  );
}
