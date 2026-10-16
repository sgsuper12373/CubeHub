"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPost, editPost, type PostResult } from "@/lib/clubs/actions";
import {
  ALG_MAX,
  CAPTION_MAX,
  POST_KINDS,
  SETUP_MAX,
  TEXT_MAX,
  validatePostInput,
  type PostField,
  type PostInput,
  type PostKind,
} from "@/lib/clubs/posts";
import { loadAlg } from "@/lib/cubing/runtime";
import { parseAlgWith } from "@/lib/playground/alg-input";
import { loadKPuzzle } from "@/lib/playground/solved";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast-store";

const EMPTY: PostInput = { kind: "text", body: "", alg: "", puzzle: "333", setup: "", videoUrl: "" };

/**
 * Checks an algorithm (and its setup) with cubing.js, which knows every move
 * on the puzzle; the table's pattern check is only a backstop.
 */
async function checkMoves(input: PostInput): Promise<{ field: PostField; error: string } | null> {
  if (input.kind !== "alg") return null;
  const puzzle = input.puzzle === "222" ? "222" : "333";
  const [{ Alg }, kpuzzle] = await Promise.all([loadAlg(), loadKPuzzle(puzzle)]);
  const alg = parseAlgWith(Alg, kpuzzle, input.alg);
  if (!alg.ok) return { field: "alg", error: alg.error };
  if (input.setup.trim()) {
    const setup = parseAlgWith(Alg, kpuzzle, input.setup);
    if (!setup.ok) return { field: "setup", error: setup.error };
  }
  return null;
}

/**
 * New post (members) or editing one (its author, within 15 minutes). Text,
 * an algorithm shown on the 3D cube, or a YouTube / Instagram link.
 */
export function PostComposer({
  clubId,
  slug,
  edit,
  onDone,
}: {
  clubId: string;
  slug: string;
  /** Editing: the post's id and current values; the kind is fixed. */
  edit?: { postId: string; values: PostInput };
  onDone?: () => void;
}) {
  const router = useRouter();
  const [input, setInput] = useState<PostInput>(edit?.values ?? EMPTY);
  const [error, setError] = useState<{ field?: PostField; error: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = pending || checking;

  const set = (patch: Partial<PostInput>) => {
    setInput((cur) => ({ ...cur, ...patch }));
    setError(null);
  };
  const fieldError = (f: PostField) => (error?.field === f ? error.error : undefined);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const local = validatePostInput(input);
    if (!local.ok) {
      setError(local);
      return;
    }
    setChecking(true);
    let bad: { field: PostField; error: string } | null = null;
    try {
      bad = await checkMoves(input);
    } catch (err) {
      // cubing failed to load: let the server's pattern check decide.
      console.error("alg check failed", err);
    } finally {
      setChecking(false);
    }
    if (bad) {
      setError(bad);
      return;
    }

    startTransition(async () => {
      const res: PostResult = edit ? await editPost(edit.postId, slug, input) : await createPost(clubId, slug, input);
      if (!res.ok) {
        setError(res);
        if (!res.field) toast({ kind: "error", message: res.error, durationMs: 5000 });
        return;
      }
      // Clear what was posted; the kind and puzzle stay for the next one.
      if (!edit) setInput((cur) => ({ ...EMPTY, kind: cur.kind, puzzle: cur.puzzle }));
      onDone?.();
      router.refresh();
    });
  }

  const bodyMax = input.kind === "text" ? TEXT_MAX : CAPTION_MAX;

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card/60 p-4" aria-label={edit ? "Edit post" : "New post"}>
      {/* Locked while posting, so a late reset can't wipe what was typed meanwhile. */}
      <fieldset disabled={busy} className="space-y-3">
      {!edit && (
        <div role="tablist" aria-label="Post type" className="flex w-max gap-1 rounded-lg border border-border bg-background/40 p-0.5 text-xs">
          {POST_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="tab"
              aria-selected={input.kind === k.id}
              onClick={() => set({ kind: k.id as PostKind })}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                input.kind === k.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}

      {input.kind === "alg" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="post-alg">Algorithm</Label>
              <Input
                id="post-alg"
                value={input.alg}
                maxLength={ALG_MAX}
                onChange={(e) => set({ alg: e.target.value })}
                placeholder="R U R' U R U2 R'"
                className="font-mono"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="flex gap-1 rounded-lg border border-border p-0.5 text-xs" role="radiogroup" aria-label="Puzzle">
              {(["333", "222"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={input.puzzle === p}
                  onClick={() => set({ puzzle: p })}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 font-medium",
                    input.puzzle === p ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p === "333" ? "3x3" : "2x2"}
                </button>
              ))}
            </div>
          </div>
          {fieldError("alg") && <ErrorLine>{fieldError("alg")}</ErrorLine>}
          <div className="space-y-1.5">
            <Label htmlFor="post-setup">
              Setup <span className="font-normal text-muted-foreground">(optional, the moves that make the case)</span>
            </Label>
            <Input
              id="post-setup"
              value={input.setup}
              maxLength={SETUP_MAX}
              onChange={(e) => set({ setup: e.target.value })}
              placeholder="Leave empty to show the case the algorithm solves"
              className="font-mono"
              autoComplete="off"
              spellCheck={false}
            />
            {fieldError("setup") && <ErrorLine>{fieldError("setup")}</ErrorLine>}
          </div>
        </div>
      )}

      {input.kind === "video" && (
        <div className="space-y-1.5">
          <Label htmlFor="post-video">Video link</Label>
          <Input
            id="post-video"
            type="url"
            inputMode="url"
            value={input.videoUrl}
            onChange={(e) => set({ videoUrl: e.target.value })}
            placeholder="https://youtu.be/… or https://www.instagram.com/reel/…"
            autoComplete="off"
          />
          {fieldError("videoUrl") && <ErrorLine>{fieldError("videoUrl")}</ErrorLine>}
        </div>
      )}

      <div className="space-y-1.5">
        {input.kind !== "text" && (
          <Label htmlFor="post-body">
            Caption <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
        )}
        <Textarea
          id="post-body"
          rows={input.kind === "text" ? 3 : 2}
          maxLength={bodyMax}
          value={input.body}
          onChange={(e) => set({ body: e.target.value })}
          placeholder={input.kind === "text" ? "Share news, a meetup, a question…" : "What should people look at?"}
          aria-label={input.kind === "text" ? "Post text" : undefined}
        />
        <div className="flex items-center justify-between gap-2">
          {fieldError("body") ? <ErrorLine>{fieldError("body")}</ErrorLine> : <span />}
          <span className="text-xs text-muted-foreground tabular-nums">
            {input.body.trim().length}/{bodyMax}
          </span>
        </div>
      </div>

      {error && !error.field && <ErrorLine>{error.error}</ErrorLine>}

      <div className="flex justify-end gap-2">
        {edit && (
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={busy}>
          {checking ? "Checking…" : pending ? "Posting…" : edit ? "Save" : "Post"}
        </Button>
      </div>
      </fieldset>
    </form>
  );
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-xs font-medium text-destructive">
      {children}
    </p>
  );
}
