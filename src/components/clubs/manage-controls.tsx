"use client";

import { Menu } from "@base-ui/react/menu";
import { Ban, Crown, MoreHorizontal, Shield, ShieldOff, Trash2, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteClub,
  removeClubMember,
  respondToJoinRequest,
  setClubMemberRole,
  transferClubOwnership,
  unbanClubMember,
  type ActionResult,
} from "@/lib/clubs/actions";
import type { ClubRole } from "@/lib/clubs/types";
import { confirm } from "@/stores/confirm-store";
import { toast } from "@/stores/toast-store";

/** Runs a club action: toast on failure (or success text), then refresh the page. */
function useClubAction() {
  const [pending, startTransition] = useTransition();
  function run(action: () => Promise<ActionResult>, done?: string) {
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        toast({ kind: "error", message: res.error, durationMs: 5000 });
        return;
      }
      if (done) toast({ kind: "info", message: done, durationMs: 3000 });
    });
  }
  return { pending, run, startTransition };
}

export function RequestButtons({ requestId, slug, name }: { requestId: string; slug: string; name: string }) {
  const { pending, run } = useClubAction();
  return (
    <>
      <Button size="sm" disabled={pending} onClick={() => run(() => respondToJoinRequest(requestId, true, slug), `${name} is in.`)}>
        Approve
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => respondToJoinRequest(requestId, false, slug))}>
        Decline
      </Button>
    </>
  );
}

const ITEM =
  "flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 outline-none data-highlighted:bg-muted";
const DANGER_ITEM =
  "flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-destructive outline-none data-highlighted:bg-destructive/10";

/**
 * The ⋯ menu on a member row. The owner can change roles, hand over the club,
 * and remove or ban anyone; admins can remove or ban members only. The RPCs
 * enforce the same rules.
 */
export function MemberMenu({
  clubId,
  slug,
  clubName,
  userId,
  name,
  theirRole,
  myRole,
}: {
  clubId: string;
  slug: string;
  clubName: string;
  userId: string;
  name: string;
  theirRole: ClubRole;
  myRole: ClubRole;
}) {
  const { pending, run, startTransition } = useClubAction();
  const isOwner = myRole === "owner";
  const canRemove = theirRole !== "owner" && (isOwner || theirRole === "member");
  if (!isOwner && !canRemove) return null;

  function removeOrBan(ban: boolean) {
    startTransition(async () => {
      const ok = await confirm({
        title: ban ? `Ban ${name}?` : `Remove ${name}?`,
        body: ban
          ? "They're removed and can't rejoin, by request or invite link, until an admin unbans them."
          : "They can join again later.",
        confirmLabel: ban ? "Ban" : "Remove",
        destructive: true,
      });
      if (ok) run(() => removeClubMember(clubId, userId, ban, slug), ban ? `${name} is banned.` : `${name} was removed.`);
    });
  }

  function transfer() {
    startTransition(async () => {
      const ok = await confirm({
        title: `Make ${name} the owner of ${clubName}?`,
        body: "You'll become an admin. Only the new owner can change roles, edit settings or delete the club.",
        confirmLabel: "Transfer",
        destructive: true,
      });
      if (ok) run(() => transferClubOwnership(clubId, userId, slug), `${name} owns ${clubName} now.`);
    });
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={pending}
        render={<Button variant="ghost" size="icon-sm" aria-label={`Manage ${name}`} />}
      >
        <MoreHorizontal />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={4} className="isolate z-50">
          <Menu.Popup className="min-w-44 rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden">
            {isOwner && theirRole === "member" && (
              <Menu.Item className={ITEM} onClick={() => run(() => setClubMemberRole(clubId, userId, "admin", slug), `${name} is an admin.`)}>
                <Shield className="size-4" aria-hidden />
                Make admin
              </Menu.Item>
            )}
            {isOwner && theirRole === "admin" && (
              <Menu.Item className={ITEM} onClick={() => run(() => setClubMemberRole(clubId, userId, "member", slug))}>
                <ShieldOff className="size-4" aria-hidden />
                Make member
              </Menu.Item>
            )}
            {isOwner && (
              <Menu.Item className={ITEM} onClick={transfer}>
                <Crown className="size-4" aria-hidden />
                Transfer ownership
              </Menu.Item>
            )}
            {canRemove && (
              <>
                <Menu.Item className={DANGER_ITEM} onClick={() => removeOrBan(false)}>
                  <UserMinus className="size-4" aria-hidden />
                  Remove
                </Menu.Item>
                <Menu.Item className={DANGER_ITEM} onClick={() => removeOrBan(true)}>
                  <Ban className="size-4" aria-hidden />
                  Ban
                </Menu.Item>
              </>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function UnbanButton({ clubId, slug, userId, name }: { clubId: string; slug: string; userId: string; name: string }) {
  const { pending, run } = useClubAction();
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => unbanClubMember(clubId, userId, slug), `${name} is unbanned.`)}>
      Unban
    </Button>
  );
}

/** Owner only: type the club's name to delete it. */
export function DeleteClubForm({ clubId, name }: { clubId: string; name: string }) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await deleteClub(clubId, typed);
          if (!res.ok) {
            toast({ kind: "error", message: res.error, durationMs: 5000 });
            return;
          }
          toast({ kind: "info", message: `${name} was deleted.`, durationMs: 3000 });
          router.push("/clubs");
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="confirm-name">
          Type <span className="font-semibold text-foreground">{name}</span> to confirm
        </Label>
        <Input id="confirm-name" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </div>
      <Button type="submit" variant="destructive" disabled={pending || typed.trim() !== name}>
        <Trash2 />
        Delete club
      </Button>
    </form>
  );
}
