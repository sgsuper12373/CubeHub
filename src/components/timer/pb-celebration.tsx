"use client";

import { Share2, Trophy, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { eventLabel } from "@/lib/timer/events";
import { formatMs } from "@/lib/timer/format";
import { RECORD_LABEL, type RecordHit } from "@/lib/timer/pb-detect";
import { drawShareCard, headlineHit, shareImage } from "@/lib/timer/share-card";
import type { TimerPuzzle } from "@/lib/timer/types";
import { readTokenRgb } from "@/lib/token-color";
import { toast } from "@/stores/toast-store";

/**
 * The all-time PB moment: confetti, the records beaten, and a share image.
 *
 * Deliberately not a modal. It sits above the timer without taking focus or
 * trapping keys, so Space still starts the next solve, and the timer screen
 * closes it as soon as that solve begins.
 */
export function PbCelebration({
  hits,
  puzzle,
  onClose,
}: {
  hits: RecordHit[];
  puzzle: TimerPuzzle;
  onClose: () => void;
}) {
  // Drawn as soon as the card opens, so tapping Share calls navigator.share
  // inside the tap itself. Safari refuses a share that starts after an await.
  const [image, setImage] = useState<Blob | null>(null);

  useEffect(() => {
    let cancelled = false;
    drawShareCard(hits, puzzle)
      .then((blob) => {
        if (!cancelled) setImage(blob);
      })
      .catch((err) => console.error("share card failed", err));
    return () => {
      cancelled = true;
    };
  }, [hits, puzzle]);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void import("canvas-confetti").then(({ default: confetti }) => {
      // canvas-confetti only reads hex, so resolve the sticker tokens first.
      const colors = ["u", "r", "f", "d", "l", "b"].map((f) =>
        `#${readTokenRgb(`sticker-${f}`).map((v) => v.toString(16).padStart(2, "0")).join("")}`,
      );
      void confetti({ particleCount: 140, spread: 80, origin: { y: 0.35 }, colors, disableForReducedMotion: true });
    });
  }, []);

  const head = headlineHit(hits);

  return (
    <div
      role="status"
      aria-live="polite"
      data-focus-hide
      className="pointer-events-auto fixed inset-x-4 top-20 z-40 mx-auto max-w-sm animate-in fade-in slide-in-from-top-4 rounded-2xl border border-timer-ready/30 bg-card/95 p-4 shadow-xl backdrop-blur-md duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-timer-ready/15 text-timer-ready">
          <Trophy className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wider text-timer-ready uppercase">
            New all-time PB · {eventLabel(puzzle)}
          </p>
          <ul className="mt-1 space-y-0.5">
            {hits.map((h) => (
              <li key={h.category} className="flex items-baseline gap-2">
                <span className="w-12 text-sm text-muted-foreground">{RECORD_LABEL[h.category]}</span>
                <span className="font-mono text-lg font-semibold text-foreground tabular-nums">
                  {formatMs(h.timeMs)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  −{formatMs(h.previousMs - h.timeMs)} (was {formatMs(h.previousMs)})
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Button variant="ghost" size="icon-xs" aria-label="Close" onClick={onClose}>
          <X />
        </Button>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button
          size="sm"
          disabled={!image}
          onClick={(e) => {
            // Blur so the next Space reaches the timer, not this button.
            e.currentTarget.blur();
            if (!image) return;
            const text = `New ${eventLabel(puzzle)} ${RECORD_LABEL[head.category]} PB: ${formatMs(head.timeMs)} on CubeHub`;
            void shareImage(image, text).then((result) => {
              if (result === "saved") {
                toast({ kind: "info", message: "Image saved and copied", durationMs: 3000 });
              }
            });
          }}
        >
          <Share2 />
          Share
        </Button>
      </div>
    </div>
  );
}
