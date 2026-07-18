"use client";

import { Check, Copy, Eye, EyeOff, Shuffle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { TimerPuzzle } from "@/lib/timer/types";
import { cn } from "@/lib/utils";

/**
 * The scramble line with its actions. Purely presentational — the container
 * decides when it is visible and what the callbacks do. Fixed min-height so
 * swapping between shimmer and scramble text never shifts the layout.
 */
export function ScrambleBar({
  alg,
  generating,
  puzzle,
  onNext,
  onCopy,
  onTogglePreview,
  previewOn,
}: {
  alg: string | null;
  generating: boolean;
  puzzle: TimerPuzzle;
  onNext: () => void;
  onCopy: () => void;
  onTogglePreview: () => void;
  previewOn: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  return (
    <div className="flex min-h-20 flex-col items-center justify-center gap-2 px-4 pt-6">
      {alg === null ? (
        <div
          className="h-6 w-64 max-w-full animate-pulse rounded-md bg-muted"
          aria-label="generating scramble"
        />
      ) : (
        <p className="max-w-2xl text-center font-mono text-base leading-relaxed text-foreground md:text-lg">
          {alg}
        </p>
      )}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`New ${puzzle === "222" ? "2x2" : "3x3"} scramble`}
          disabled={alg === null && generating}
          onClick={onNext}
        >
          <Shuffle />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Copy scramble"
          disabled={alg === null}
          onClick={() => {
            onCopy();
            setCopied(true);
            if (copyResetRef.current) clearTimeout(copyResetRef.current);
            copyResetRef.current = setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="text-timer-ready" /> : <Copy />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={previewOn ? "Hide scramble preview" : "Show scramble preview"}
          aria-pressed={previewOn}
          onClick={onTogglePreview}
          className={cn(previewOn && "text-timer-ready")}
        >
          {previewOn ? <Eye /> : <EyeOff />}
        </Button>
      </div>
    </div>
  );
}
