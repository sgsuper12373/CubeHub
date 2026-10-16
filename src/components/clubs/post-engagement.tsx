"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { ReportDialog } from "@/components/social/report-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment, deleteComment, reportClubContent, setReaction } from "@/lib/clubs/actions";
import type { ClubComment } from "@/lib/clubs/dal";
import {
  CLUB_REPORT_REASONS,
  COMMENT_MAX,
  COMMENTS_PREVIEW,
  REACTIONS,
  type ReactionCounts,
  type ReactionId,
} from "@/lib/clubs/posts";
import { timeAgo } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";
import { confirm } from "@/stores/confirm-store";
import { toast } from "@/stores/toast-store";

/** Reactions and comments under one post. */
export function PostEngagement({
  postId,
  slug,
  reactions,
  comments,
  isMember,
  viewerId,
  canModerate,
}: {
  postId: string;
  slug: string;
  reactions: ReactionCounts;
  comments: ClubComment[];
  /** Members react and comment; everyone else reads. */
  isMember: boolean;
  viewerId: string | null;
  canModerate: boolean;
}) {
  return (
    <div className="space-y-3 border-t border-border pt-3">
      <ReactionBar postId={postId} slug={slug} initial={reactions} isMember={isMember} />
      <Comments
        postId={postId}
        slug={slug}
        comments={comments}
        isMember={isMember}
        viewerId={viewerId}
        canModerate={canModerate}
      />
    </div>
  );
}

function ReactionBar({
  postId,
  slug,
  initial,
  isMember,
}: {
  postId: string;
  slug: string;
  initial: ReactionCounts;
  isMember: boolean;
}) {
  // Optimistic: the count moves at once and rolls back if the server refuses.
  const [counts, setCounts] = useState(initial);
  const [, startTransition] = useTransition();

  // Outsiders see only reactions that someone used.
  const shown = isMember ? REACTIONS : REACTIONS.filter((r) => counts[r.id].count > 0);
  if (shown.length === 0) return null;

  function toggle(id: ReactionId) {
    const before = counts;
    const on = !before[id].mine;
    setCounts({ ...before, [id]: { count: before[id].count + (on ? 1 : -1), mine: on } });
    startTransition(async () => {
      const res = await setReaction(postId, id, on, slug);
      if (!res.ok) {
        setCounts(before);
        toast({ kind: "error", message: res.error, durationMs: 4000 });
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Reactions">
      {shown.map((r) => {
        const { count, mine } = counts[r.id];
        return (
          <button
            key={r.id}
            type="button"
            disabled={!isMember}
            aria-pressed={isMember ? mine : undefined}
            aria-label={`${r.label}, ${count}`}
            onClick={() => toggle(r.id)}
            className={cn(
              "flex h-7 items-center gap-1 rounded-full border px-2.5 text-sm transition-colors disabled:cursor-default",
              mine ? "border-primary/50 bg-primary/10 text-foreground" : "border-border text-muted-foreground",
              isMember && !mine && "hover:bg-muted hover:text-foreground",
            )}
          >
            <span aria-hidden>{r.emoji}</span>
            {count > 0 && <span className="text-xs font-semibold tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Comments({
  postId,
  slug,
  comments,
  isMember,
  viewerId,
  canModerate,
}: {
  postId: string;
  slug: string;
  comments: ClubComment[];
  isMember: boolean;
  viewerId: string | null;
  canModerate: boolean;
}) {
  const [all, setAll] = useState(false);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [reporting, setReporting] = useState<ClubComment | null>(null);

  const shown = all ? comments : comments.slice(-COMMENTS_PREVIEW);
  const hidden = comments.length - shown.length;

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    startTransition(async () => {
      const res = await addComment(postId, text, slug);
      if (!res.ok) {
        toast({ kind: "error", message: res.error, durationMs: 5000 });
        return;
      }
      setText("");
    });
  }

  function remove(c: ClubComment) {
    startTransition(async () => {
      const ok = await confirm({ title: "Delete this comment?", confirmLabel: "Delete", destructive: true });
      if (!ok) return;
      const res = await deleteComment(c.id, slug);
      if (!res.ok) {
        toast({ kind: "error", message: res.error, durationMs: 4000 });
        return;
      }
    });
  }

  return (
    <section className="space-y-2.5" aria-label="Comments">
      {hidden > 0 && (
        <button type="button" onClick={() => setAll(true)} className="text-xs font-medium text-primary hover:underline">
          Show all {comments.length} comments
        </button>
      )}
      {shown.length > 0 && (
        <ul className="space-y-2.5">
          {shown.map((c) => {
            const name = c.author.displayName || c.author.username;
            const mine = viewerId === c.author.id;
            return (
              <li key={c.id} className="flex gap-2.5">
                <ProfileAvatar url={c.author.avatarUrl} name={name} size="xs" className="size-7 rounded-lg text-[10px]" />
                <div className="min-w-0 flex-1">
                  <div className="rounded-xl bg-muted/50 px-3 py-2">
                    {c.author.username ? (
                      <Link href={`/profile/${c.author.username}`} className="text-xs font-semibold text-foreground hover:underline">
                        {name}
                      </Link>
                    ) : (
                      <span className="text-xs font-semibold text-foreground">{name}</span>
                    )}
                    <p className="text-sm break-words whitespace-pre-line text-foreground">{c.body}</p>
                  </div>
                  <div className="mt-0.5 flex gap-3 px-1 text-[11px] text-muted-foreground">
                    <time dateTime={c.createdAt}>{timeAgo(c.createdAt)}</time>
                    {(mine || canModerate) && (
                      <button type="button" disabled={pending} onClick={() => remove(c)} className="hover:text-destructive">
                        Delete
                      </button>
                    )}
                    {viewerId && !mine && (
                      <button type="button" onClick={() => setReporting(c)} className="hover:text-foreground">
                        Report
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isMember && (
        <form onSubmit={send} className="flex items-end gap-2">
          <Textarea
            rows={1}
            value={text}
            maxLength={COMMENT_MAX}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter makes a new line.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Write a comment…"
            aria-label="Write a comment"
            disabled={pending}
            className="min-h-9 resize-none py-2"
          />
          <Button type="submit" size="sm" disabled={pending || !text.trim()}>
            Send
          </Button>
        </form>
      )}

      <ReportDialog
        open={reporting !== null}
        onOpenChange={(open) => !open && setReporting(null)}
        title="Report this comment"
        description="Reports are private and go to the CubeHub team, not the club."
        reasons={CLUB_REPORT_REASONS}
        onSubmit={(reason, note) => reportClubContent({ commentId: reporting!.id }, reason, note)}
      />
    </section>
  );
}
