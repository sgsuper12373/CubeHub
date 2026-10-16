"use client";

import { Menu } from "@base-ui/react/menu";
import { Box, ExternalLink, MoreHorizontal, Pencil, Pin, PinOff, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AlgPlayer } from "@/components/learn/alg-player";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Button } from "@/components/ui/button";
import { deletePost, setPostPinned } from "@/lib/clubs/actions";
import type { ClubPost } from "@/lib/clubs/dal";
import { editTimeLeft, parseVideoUrl } from "@/lib/clubs/posts";
import { timeAgo } from "@/lib/notifications/types";
import { confirm } from "@/stores/confirm-store";
import { toast } from "@/stores/toast-store";

import { PostComposer } from "./post-composer";

const ITEM = "flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 outline-none data-highlighted:bg-muted";
const DANGER_ITEM =
  "flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-destructive outline-none data-highlighted:bg-destructive/10";

export function PostCard({
  post,
  clubId,
  slug,
  viewerId,
  canModerate,
}: {
  post: ClubPost;
  clubId: string;
  slug: string;
  viewerId: string | null;
  /** The club's owner or an admin: may pin and delete any post. */
  canModerate: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const isAuthor = viewerId === post.author.id;
  // Read once per render; the server enforces the window anyway.
  const [canEdit] = useState(() => isAuthor && editTimeLeft(post.createdAt) > 0);
  const name = post.author.displayName || post.author.username;

  function run(action: () => Promise<{ ok: boolean; error?: string }>, done?: string) {
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        toast({ kind: "error", message: res.error ?? "Something went wrong.", durationMs: 5000 });
        return;
      }
      if (done) toast({ kind: "info", message: done, durationMs: 3000 });
      router.refresh();
    });
  }

  function onDelete() {
    startTransition(async () => {
      const ok = await confirm({
        title: "Delete this post?",
        body: isAuthor ? undefined : `It's ${name}'s post. Its comments and reactions go too.`,
        confirmLabel: "Delete",
        destructive: true,
      });
      if (ok) run(() => deletePost(post.id, slug), "Post deleted.");
    });
  }

  if (editing) {
    return (
      <li>
        <PostComposer
          clubId={clubId}
          slug={slug}
          edit={{
            postId: post.id,
            values: {
              kind: post.kind,
              body: post.body ?? "",
              alg: post.alg ?? "",
              puzzle: post.puzzle ?? "333",
              setup: post.setup ?? "",
              videoUrl: post.videoUrl ?? "",
            },
          }}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  const showMenu = canEdit || isAuthor || canModerate;

  return (
    <li className="space-y-3 rounded-2xl border border-border bg-card/60 p-4" aria-busy={pending || undefined}>
      <div className="flex items-start gap-3">
        {post.author.username ? (
          <Link href={`/profile/${post.author.username}`} className="flex min-w-0 flex-1 items-center gap-2.5">
            <ProfileAvatar url={post.author.avatarUrl} name={name} size="xs" />
            <Byline name={name} post={post} />
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <ProfileAvatar url={null} name={name} size="xs" />
            <Byline name={name} post={post} />
          </div>
        )}
        {post.pinnedAt && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            <Pin className="size-3" aria-hidden />
            Pinned
          </span>
        )}
        {showMenu && (
          <Menu.Root>
            <Menu.Trigger
              disabled={pending}
              render={<Button variant="ghost" size="icon-sm" aria-label="Post actions" className="-mt-1 -mr-1 shrink-0" />}
            >
              <MoreHorizontal />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner align="end" sideOffset={4} className="isolate z-50">
                <Menu.Popup className="min-w-40 rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden">
                  {canEdit && (
                    <Menu.Item className={ITEM} onClick={() => setEditing(true)}>
                      <Pencil className="size-4" aria-hidden />
                      Edit
                    </Menu.Item>
                  )}
                  {canModerate && (
                    <Menu.Item
                      className={ITEM}
                      onClick={() =>
                        run(
                          () => setPostPinned(post.id, !post.pinnedAt, slug),
                          post.pinnedAt ? "Unpinned." : "Pinned. Members were told.",
                        )
                      }
                    >
                      {post.pinnedAt ? <PinOff className="size-4" aria-hidden /> : <Pin className="size-4" aria-hidden />}
                      {post.pinnedAt ? "Unpin" : "Pin as announcement"}
                    </Menu.Item>
                  )}
                  {(isAuthor || canModerate) && (
                    <Menu.Item className={DANGER_ITEM} onClick={onDelete}>
                      <Trash2 className="size-4" aria-hidden />
                      Delete
                    </Menu.Item>
                  )}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        )}
      </div>

      {/* Plain text: line breaks kept, links not clickable (docs/clubs.md → Posts). */}
      {post.body && <p className="text-sm break-words whitespace-pre-line text-foreground">{post.body}</p>}
      {post.kind === "alg" && post.alg && <AlgBlock alg={post.alg} setup={post.setup} puzzle={post.puzzle ?? "333"} />}
      {post.kind === "video" && post.videoUrl && <VideoBlock url={post.videoUrl} />}
    </li>
  );
}

function Byline({ name, post }: { name: string; post: ClubPost }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
      <span className="block text-xs text-muted-foreground">
        <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
        {post.editedAt && <> · edited</>}
      </span>
    </span>
  );
}

/** The moves as text; the 3D player loads on tap (cubing is heavy). */
function AlgBlock({ alg, setup, puzzle }: { alg: string; setup: string | null; puzzle: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2 rounded-xl border border-border bg-background/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{puzzle === "222" ? "2x2" : "3x3"} algorithm</span>
        <Button size="xs" variant="outline" onClick={() => setShow((s) => !s)} aria-expanded={show}>
          <Box />
          {show ? "Hide cube" : "Show on cube"}
        </Button>
      </div>
      <p className="font-mono text-sm font-semibold break-words text-foreground select-all">{alg}</p>
      {setup && (
        <p className="text-xs text-muted-foreground">
          Setup: <span className="font-mono select-all">{setup}</span>
        </p>
      )}
      {show && (
        <div className="flex justify-center">
          <AlgPlayer moves={alg} setupMoves={setup} puzzle={puzzle} size={220} />
        </div>
      )}
    </div>
  );
}

/** YouTube: thumbnail, then the player on tap. Instagram: a link card. */
function VideoBlock({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const video = parseVideoUrl(url);

  if (!video || video.site === "instagram") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3 text-sm transition-colors hover:bg-muted/40"
      >
        <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0">
          <span className="block font-medium text-foreground">{video ? "Instagram video" : "Video link"}</span>
          <span className="block truncate text-xs text-muted-foreground">{url}</span>
        </span>
      </a>
    );
  }

  if (playing) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl border border-border bg-muted">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
          title="YouTube video"
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative block aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted"
      aria-label="Play YouTube video"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail; no next/image remote config for one host */}
      <img
        src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        className="size-full object-cover transition-opacity group-hover:opacity-90"
      />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-14 place-items-center rounded-full bg-background/80 text-foreground shadow-lg backdrop-blur-sm">
          <Play className="size-6 translate-x-0.5" aria-hidden />
        </span>
      </span>
    </button>
  );
}
