"use client";

import { RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { CubeLoader } from "@/components/ui/cube-loader";
import { eventLabel } from "@/lib/timer/events";
import { formatResult } from "@/lib/timer/format";
import { RECENTLY_DELETED_DAYS } from "@/lib/timer/repo";
import type { Session, Solve, TimerPuzzle } from "@/lib/timer/types";
import { useOverlayLock } from "@/stores/overlay-store";
import { useSessionStore } from "@/stores/session-store";
import { toast } from "@/stores/toast-store";

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "5 minutes ago", "yesterday", "3 days ago". */
export function deletedAgo(iso: string, now: number = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "just now";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour");
  return relative.format(Math.round(seconds / 86400), "day");
}

/**
 * Soft-deleted solves from the last 30 days, for the current event: restore
 * them, or delete them for good. Deleting a solve or clearing a session only
 * ever soft-deletes, so this is where those land. Same hand-rolled modal as
 * <ShortcutsOverlay/>, mounted only while open.
 */
export function RecentlyDeleted({
  puzzle,
  sessions,
  onClose,
}: {
  puzzle: TimerPuzzle;
  sessions: Session[];
  onClose: () => void;
}) {
  useOverlayLock(true);
  const [solves, setSolves] = useState<Solve[] | null>(null);
  /** The row asking "delete forever?", if any. */
  const [confirming, setConfirming] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    useSessionStore
      .getState()
      .loadDeletedSolves()
      .then((rows) => {
        if (!cancelled) setSolves(rows);
      })
      .catch(() => {
        if (!cancelled) setSolves([]);
        toast({ kind: "error", message: "Couldn't load deleted solves", durationMs: 4000 });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sessionName = new Map(sessions.map((s) => [s.id, s.name]));

  const restore = async (ids: string[]) => {
    await useSessionStore.getState().restoreSolves(ids);
    setSolves((rows) => rows?.filter((s) => !ids.includes(s.id)) ?? null);
    toast({
      kind: "info",
      message: ids.length === 1 ? "Solve restored" : `${ids.length} solves restored`,
      durationMs: 2500,
    });
  };

  const purge = async (id: string) => {
    try {
      await useSessionStore.getState().purgeSolves([id]);
    } catch {
      toast({ kind: "error", message: "Couldn't delete — please try again", durationMs: 4000 });
      return;
    }
    setConfirming(null);
    setSolves((rows) => rows?.filter((s) => s.id !== id) ?? null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recently-deleted-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-3">
          <div>
            <h2 id="recently-deleted-title" className="text-base font-semibold">
              Recently deleted · {eventLabel(puzzle)}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Solves you deleted in the last {RECENTLY_DELETED_DAYS} days.
            </p>
          </div>
          <Button ref={closeRef} variant="ghost" size="icon-xs" aria-label="Close" onClick={onClose}>
            <X />
          </Button>
        </div>

        {solves === null ? (
          <div className="grid place-items-center py-12">
            <CubeLoader size={32} label="Loading deleted solves" />
          </div>
        ) : solves.length === 0 ? (
          <p className="px-5 pt-6 pb-10 text-center text-sm text-muted-foreground">
            Nothing deleted in the last {RECENTLY_DELETED_DAYS} days.
          </p>
        ) : (
          <>
            <ul className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto border-y border-border/60">
              {solves.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                        {formatResult(s.timeMs, s.penalty)}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {sessionName.get(s.sessionId) ?? "Session"} · deleted{" "}
                        {s.deletedAt ? deletedAgo(s.deletedAt) : ""}
                      </span>
                    </div>
                    <p className="truncate font-mono text-[0.7rem] text-muted-foreground/80">
                      {s.scramble}
                    </p>
                  </div>
                  {confirming === s.id ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="xs" variant="ghost" onClick={() => setConfirming(null)}>
                        Keep
                      </Button>
                      <Button size="xs" variant="destructive" onClick={() => void purge(s.id)}>
                        Delete forever
                      </Button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="xs"
                        variant="ghost"
                        aria-label={`Restore ${formatResult(s.timeMs, s.penalty)}`}
                        onClick={() => void restore([s.id])}
                      >
                        <RotateCcw />
                        Restore
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Delete ${formatResult(s.timeMs, s.penalty)} forever`}
                        onClick={() => setConfirming(s.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex justify-end p-4">
              <Button size="sm" variant="outline" onClick={() => void restore(solves.map((s) => s.id))}>
                <RotateCcw />
                Restore all ({solves.length})
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
