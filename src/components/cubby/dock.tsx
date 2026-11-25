"use client";

import { useState } from "react";

import { sayTip, startPageTour } from "@/components/cubby/companion-actions";
import { getCubbyRenderer } from "@/components/cubby/renderer-instance";
import { useCubbyReducedMotion } from "@/components/cubby/use-cubby-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { hasUnseen, tourKindFor } from "@/lib/companion/tours";
import { cn } from "@/lib/utils";
import { useCompanionStore } from "@/stores/companion-store";
import { useOverlayLock } from "@/stores/overlay-store";

/**
 * Cubby's dock (docs/cubby-cubing-companion.md → The dock): the avatar in
 * the sidebar's slot on desktop, a floating button on phones (and on
 * desktop while the sidebar is hidden). Clicking opens the menu: Tour this
 * page, What's new, Tips, Mute. A small dot, never a count, marks something
 * unseen on this page. Focus mode hides it while solving (data-focus-hide).
 */

type Placement = "sidebar" | "rail" | "floating" | "floating-desktop";

export function CubbyDock({ placement }: { placement: Placement }) {
  const hydrated = useCompanionStore((s) => s.hydrated);
  const mode = useCompanionStore((s) => s.record.settings.mode);
  const name = useCompanionStore((s) => s.record.settings.name);
  const page = useCompanionStore((s) => s.page);
  const content = useCompanionStore((s) => s.content);
  const progress = useCompanionStore((s) => (s.page ? s.record.tours[s.page] : undefined));
  const touring = useCompanionStore((s) => s.tour !== null);
  const reduced = useCubbyReducedMotion();
  const [open, setOpen] = useState(false);
  useOverlayLock(open);

  if (!hydrated || mode === "off") return null;

  const View = getCubbyRenderer().View;
  const dot = !touring && hasUnseen(content, progress);
  const kind = content ? tourKindFor(content, progress) : null;
  const hasTour = (content?.tour.length ?? 0) > 0;
  const muted = mode === "quiet";
  const label = `${name}${dot ? " (something new)" : ""}`;

  const trigger = (
    <DropdownMenuTrigger
      data-cubby-dock-trigger
      aria-label={label}
      title={`${name} (?)`}
      className={cn(
        "relative flex items-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        placement === "sidebar" && "h-12 w-full gap-2.5 px-1.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        placement === "rail" && "h-12 w-full justify-center hover:bg-sidebar-accent",
        (placement === "floating" || placement === "floating-desktop") &&
          "size-14 justify-center rounded-2xl border border-border bg-card/90 shadow-lg backdrop-blur-md hover:bg-card",
      )}
    >
      <span className="relative flex shrink-0 items-end justify-center" aria-hidden>
        <View size={placement === "sidebar" ? 44 : 40} reduced={reduced} />
        {dot && <span data-testid="cubby-dot" className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-background" />}
      </span>
      {placement === "sidebar" && <span className="sidebar-label min-w-0 flex-1 truncate text-left">{name}</span>}
    </DropdownMenuTrigger>
  );

  return (
    <div
      data-cubby-dock={placement}
      data-focus-hide
      className={cn(
        placement === "floating" && "fixed right-3 bottom-[5.25rem] z-30 md:hidden",
        placement === "floating-desktop" && "fixed bottom-3 left-3 z-40 hidden md:block",
      )}
    >
      <DropdownMenu
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            useCompanionStore.getState().markDockOpened();
            getCubbyRenderer().fire("wave");
          }
        }}
      >
        {trigger}
        <DropdownMenuContent side={placement === "floating" ? "top" : "right"} align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{name}</DropdownMenuLabel>
            {hasTour && (
              <DropdownMenuItem onClick={() => startPageTour(true, "full")}>
                Tour this page
              </DropdownMenuItem>
            )}
            {kind === "whatsNew" && (
              <DropdownMenuItem onClick={() => startPageTour(true, "whatsNew")}>
                What&apos;s new here
              </DropdownMenuItem>
            )}
            {(content?.tips.length ?? 0) > 0 && <DropdownMenuItem onClick={() => sayTip()}>Give me a tip</DropdownMenuItem>}
            {!page && <DropdownMenuItem disabled>No tour on this page yet</DropdownMenuItem>}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => useCompanionStore.getState().updateSettings({ mode: muted ? "on" : "quiet" })}>
            {muted ? `Unmute ${name}` : `Mute ${name}`}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => useCompanionStore.getState().setSettingsOpen(true)}>Settings…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
