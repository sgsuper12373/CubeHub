"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInvite, revokeInvite } from "@/lib/clubs/actions";
import type { ClubInvite } from "@/lib/clubs/dal";
import { INVITE_EXPIRY_OPTIONS, inviteState, timeUntil, type InviteState } from "@/lib/clubs/types";
import { cn } from "@/lib/utils";
import { confirm } from "@/stores/confirm-store";
import { toast } from "@/stores/toast-store";

const STATE_LABEL: Record<InviteState, string> = {
  active: "Active",
  expired: "Expired",
  revoked: "Revoked",
  used_up: "Used up",
};

const SELECT =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function inviteUrl(token: string): string {
  return `${window.location.origin}/clubs/join/${token}`;
}

/** Copies a link and shows a tick for a moment. */
function CopyButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(inviteUrl(token));
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast({ kind: "error", message: "Couldn't copy. Select the link and copy it instead.", durationMs: 4000 });
        }
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}

/**
 * Manage → Invite links (owner/admins). A link joins the club directly, even
 * a private one; banned cubers can't use it.
 */
export function InviteLinks({ clubId, slug, invites }: { clubId: string; slug: string; invites: ClubInvite[] }) {
  const [days, setDays] = useState<string>("7");
  const [maxUses, setMaxUses] = useState("");
  const [pending, startTransition] = useTransition();
  const [now] = useState(() => Date.now());

  function create(e: React.FormEvent) {
    e.preventDefault();
    const uses = maxUses.trim() ? Number(maxUses) : null;
    startTransition(async () => {
      const res = await createInvite(clubId, days === "never" ? null : Number(days), uses, slug);
      if (!res.ok) {
        toast({ kind: "error", message: res.error, durationMs: 5000 });
        return;
      }
      setMaxUses("");
      try {
        await navigator.clipboard.writeText(inviteUrl(res.value));
        toast({ kind: "info", message: "Link made and copied.", durationMs: 3000 });
      } catch {
        toast({ kind: "info", message: "Link made. Copy it from the list.", durationMs: 3000 });
      }
    });
  }

  function revoke(invite: ClubInvite) {
    startTransition(async () => {
      const ok = await confirm({
        title: "Revoke this link?",
        body: "It stops working at once. Anyone who already joined stays in.",
        confirmLabel: "Revoke",
        destructive: true,
      });
      if (!ok) return;
      const res = await revokeInvite(invite.id, slug);
      if (!res.ok) toast({ kind: "error", message: res.error, durationMs: 4000 });
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={create} className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card/60 p-4">
        <div className="w-32 space-y-1.5">
          <Label htmlFor="invite-days">Expires after</Label>
          <select id="invite-days" value={days} onChange={(e) => setDays(e.target.value)} className={SELECT}>
            {INVITE_EXPIRY_OPTIONS.map((o) => (
              <option key={o.label} value={o.days === null ? "never" : String(o.days)}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-32 space-y-1.5">
          <Label htmlFor="invite-uses">Max uses</Label>
          <Input
            id="invite-uses"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="No limit"
          />
        </div>
        <Button type="submit" disabled={pending}>
          <Link2 />
          Make invite link
        </Button>
      </form>

      {invites.length > 0 && (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card/60 px-4" aria-label="Invite links">
          {invites.map((inv) => {
            const state = inviteState(inv, now);
            return (
              <li key={inv.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-foreground">/clubs/join/{inv.token.slice(0, 12)}…</p>
                  <p className="text-xs text-muted-foreground">
                    <span className={cn("font-medium", state === "active" ? "text-primary" : "text-muted-foreground")}>
                      {STATE_LABEL[state]}
                    </span>
                    {" · "}
                    {inv.uses} {inv.uses === 1 ? "use" : "uses"}
                    {inv.maxUses !== null && ` of ${inv.maxUses}`}
                    {state === "active" && (inv.expiresAt ? ` · expires ${timeUntil(inv.expiresAt, now)}` : " · never expires")}
                  </p>
                </div>
                {state === "active" && (
                  <div className="flex gap-2">
                    <CopyButton token={inv.token} />
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => revoke(inv)}>
                      Revoke
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
