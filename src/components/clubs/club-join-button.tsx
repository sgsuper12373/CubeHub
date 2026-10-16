"use client";

import { Check, Clock, LogOut, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cancelJoinRequest, joinClub, leaveClub, requestToJoin } from "@/lib/clubs/actions";
import { REQUEST_MESSAGE_MAX, type Membership } from "@/lib/clubs/types";
import { confirm } from "@/stores/confirm-store";
import { toast } from "@/stores/toast-store";

// Joining is how a cuber agrees to share this (docs/clubs.md → Joining).
const SHARE_NOTE = "Members see how many solves you do each week (not your times).";

/** Join / Request to join / Requested / Leave, for the club header. */
export function ClubJoinButton({
  clubId,
  slug,
  name,
  isPublic,
  membership,
}: {
  clubId: string;
  slug: string;
  name: string;
  isPublic: boolean;
  membership: Membership;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState("");

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, done?: string) {
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        toast({ kind: "error", message: res.error, durationMs: 5000 });
        return;
      }
      if (done) toast({ kind: "info", message: done, durationMs: 3000 });
      setAsking(false);
      router.refresh();
    });
  }

  if (membership.kind === "signed-out") {
    return (
      <Link href={`/login?next=${encodeURIComponent(`/clubs/${slug}`)}`} className={buttonVariants({ size: "sm" })}>
        <UserPlus />
        {isPublic ? "Join" : "Request to join"}
      </Link>
    );
  }

  if (membership.kind === "member") {
    if (membership.role === "owner") return null;
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const ok = await confirm({
              title: `Leave ${name}?`,
              body: isPublic ? undefined : "It's private, so you'll need to ask again to come back.",
              confirmLabel: "Leave",
              cancelLabel: "Stay",
              destructive: true,
            });
            if (ok) run(() => leaveClub(clubId, slug), `You left ${name}.`);
          })
        }
      >
        <LogOut />
        Leave
      </Button>
    );
  }

  if (membership.kind === "requested") {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const ok = await confirm({
              title: `Cancel your request to join ${name}?`,
              confirmLabel: "Cancel request",
              cancelLabel: "Keep",
              destructive: true,
            });
            if (ok) run(() => cancelJoinRequest(clubId, slug));
          })
        }
      >
        <Clock />
        Requested
      </Button>
    );
  }

  if (isPublic) {
    return (
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const ok = await confirm({ title: `Join ${name}?`, body: SHARE_NOTE, confirmLabel: "Join" });
            if (ok) run(() => joinClub(clubId, slug), `Welcome to ${name}!`);
          })
        }
      >
        <Check />
        Join
      </Button>
    );
  }

  if (!asking) {
    return (
      <Button size="sm" onClick={() => setAsking(true)}>
        <UserPlus />
        Request to join
      </Button>
    );
  }

  return (
    <form
      className="w-full space-y-2 sm:w-80"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => requestToJoin(clubId, slug, message), "Request sent. An admin will review it.");
      }}
    >
      <Textarea
        rows={2}
        maxLength={REQUEST_MESSAGE_MAX}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Add a message (optional)"
        aria-label="Message to the club's admins"
        autoFocus
      />
      <p className="text-xs text-muted-foreground">{SHARE_NOTE}</p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Send request
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAsking(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
