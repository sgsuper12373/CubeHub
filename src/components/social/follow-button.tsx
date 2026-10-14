"use client";

import { Check, Clock, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { follow, unfollow } from "@/lib/social/actions";
import type { FollowButtonState } from "@/lib/social/types";
import { confirm } from "@/stores/confirm-store";
import { toast } from "@/stores/toast-store";

const LABEL: Record<Exclude<FollowButtonState, "hidden">, string> = {
  "sign-in": "Follow",
  follow: "Follow",
  "follow-back": "Follow back",
  requested: "Requested",
  following: "Following",
};

/**
 * Follow / Follow back / Requested / Following. Optimistic: the label changes
 * at once and rolls back if the server refuses (blocked, rate limited).
 */
export function FollowButton({
  targetId,
  name,
  initial,
  isPrivate,
  size = "sm",
}: {
  targetId: string;
  name: string;
  initial: FollowButtonState;
  isPrivate: boolean;
  size?: "sm" | "xs";
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [pending, startTransition] = useTransition();

  if (state === "hidden") return null;
  if (state === "sign-in") {
    return (
      <Link href="/login" className={buttonVariants({ size })}>
        <UserPlus />
        Follow
      </Link>
    );
  }

  const active = state === "following" || state === "requested";

  function onClick() {
    const before = state;
    if (before === "following" || before === "requested") {
      startTransition(async () => {
        const ok = await confirm({
          title: before === "requested" ? `Cancel your request to ${name}?` : `Unfollow ${name}?`,
          body:
            before === "following" && isPrivate
              ? "Their profile is private, so you'll need to request again to see it."
              : undefined,
          confirmLabel: before === "requested" ? "Cancel request" : "Unfollow",
          cancelLabel: "Keep",
          destructive: true,
        });
        if (!ok) return;
        setState("follow");
        const res = await unfollow(targetId);
        if (!res.ok) {
          setState(before);
          toast({ kind: "error", message: res.error, durationMs: 4000 });
        }
        router.refresh();
      });
      return;
    }

    startTransition(async () => {
      setState(isPrivate ? "requested" : "following");
      const res = await follow(targetId);
      if (!res.ok) {
        setState(before);
        toast({ kind: "error", message: res.error, durationMs: 4000 });
        return;
      }
      setState(res.value === "pending" ? "requested" : "following");
      router.refresh();
    });
  }

  return (
    <Button
      size={size}
      variant={active ? "outline" : "default"}
      onClick={onClick}
      disabled={pending}
      aria-pressed={active}
    >
      {state === "following" ? <Check /> : state === "requested" ? <Clock /> : <UserPlus />}
      {LABEL[state]}
    </Button>
  );
}
