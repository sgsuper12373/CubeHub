"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { acceptRequest, removeFollower, unblock, type ActionResult } from "@/lib/social/actions";
import { confirm } from "@/stores/confirm-store";
import { toast } from "@/stores/toast-store";

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function run(action: () => Promise<ActionResult>, ask?: Parameters<typeof confirm>[0]) {
    startTransition(async () => {
      if (ask && !(await confirm(ask))) return;
      const res = await action();
      if (!res.ok) toast({ kind: "error", message: res.error, durationMs: 4000 });
      router.refresh();
    });
  }
  return { pending, run };
}

/** Accept / Decline on an incoming follow request. */
export function RequestActions({ followerId }: { followerId: string }) {
  const { pending, run } = useAction();
  return (
    <>
      <Button size="xs" disabled={pending} onClick={() => run(() => acceptRequest(followerId))}>
        Accept
      </Button>
      <Button size="xs" variant="outline" disabled={pending} onClick={() => run(() => removeFollower(followerId))}>
        Decline
      </Button>
    </>
  );
}

/** "Remove" on your own followers list. */
export function RemoveFollowerButton({ followerId, name }: { followerId: string; name: string }) {
  const { pending, run } = useAction();
  return (
    <Button
      size="xs"
      variant="outline"
      disabled={pending}
      onClick={() =>
        run(() => removeFollower(followerId), {
          title: `Remove ${name} as a follower?`,
          body: "They aren't told. They can follow you again unless you block them.",
          confirmLabel: "Remove",
          destructive: true,
        })
      }
    >
      Remove
    </Button>
  );
}

export function UnblockButton({ targetId, name }: { targetId: string; name: string }) {
  const { pending, run } = useAction();
  return (
    <Button
      size="xs"
      variant="outline"
      disabled={pending}
      onClick={() =>
        run(() => unblock(targetId), {
          title: `Unblock ${name}?`,
          body: "You'll be able to see each other's profiles again. Follows removed by the block don't come back.",
          confirmLabel: "Unblock",
        })
      }
    >
      Unblock
    </Button>
  );
}
