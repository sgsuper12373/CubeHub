"use client";

import { Eye, Play, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * "Try an algorithm": type or paste one, then
 * - Set up case: the cube shows the case this alg solves, for you to solve;
 * - Show me: set up the case, then play the alg on it;
 * - Apply: do the alg on the cube as it is now.
 *
 * Parsing and the cube changes live in the screen, which has the puzzle model.
 */
export function AlgPanel({
  value,
  onChange,
  error,
  disabled,
  onSetupCase,
  onShowMe,
  onApply,
}: {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  disabled: boolean;
  onSetupCase: () => void;
  onShowMe: () => void;
  onApply: () => void;
}) {
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSetupCase();
      }}
    >
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="R U R' U' R' F R2 U' R' U' R U R' F'"
        aria-label="Algorithm"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "playground-alg-error" : undefined}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        className="font-mono"
      />
      {error && (
        <p id="playground-alg-error" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Button type="submit" size="sm" disabled={disabled}>
          <Target /> Set up case
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onShowMe}>
          <Eye /> Show me
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onApply}>
          <Play /> Apply
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Set up case shows the cube this algorithm solves, yellow on top. Solve it to check yourself.
      </p>
    </form>
  );
}
