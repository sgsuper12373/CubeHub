import { Lock, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AcceptInviteButton } from "@/components/clubs/accept-invite-button";
import { ClubBadge } from "@/components/clubs/club-badge";
import { TagList } from "@/components/clubs/club-card";
import { EmptyState } from "@/components/social/person-row";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/auth/dal";
import { getInvitePreview, getMembership } from "@/lib/clubs/dal";
import { clubTypeLabel } from "@/lib/clubs/types";

export const metadata: Metadata = { title: "Club invite — CubeHub", robots: { index: false } };

interface Props {
  params: Promise<{ token: string }>;
}

/**
 * An invite link's landing page. Works signed out (it shows the club and asks
 * them to sign in); `use_club_invite` re-checks everything when they join.
 */
export default async function JoinClubPage({ params }: Props) {
  const { token } = await params;
  const [preview, user] = await Promise.all([getInvitePreview(token), getUser()]);

  if (!preview) {
    return (
      <Shell>
        <EmptyState title="This invite link doesn't exist">
          Check you copied the whole link, or ask for a new one.{" "}
          <Link href="/clubs" className="text-primary hover:underline">
            Browse clubs
          </Link>
        </EmptyState>
      </Shell>
    );
  }

  const { club } = preview;
  // get_club_invite checks the link (revoked, expired, used up) before
  // membership, so whoever used a single-use link would read "used up".
  // Being in the club wins.
  const membership = user ? await getMembership(club.id) : null;
  const status = membership?.kind === "member" ? "member" : preview.status;
  const here = `/clubs/join/${token}`;

  return (
    <Shell>
      <div className="space-y-5 rounded-2xl border border-border bg-card/60 p-6 text-center">
        <p className="text-sm text-muted-foreground">You&apos;re invited to join</p>
        <div className="flex flex-col items-center gap-3">
          <ClubBadge name={club.name} slug={club.slug} size="lg" />
          <h1 className="text-2xl font-extrabold tracking-tight break-words text-foreground">{club.name}</h1>
          <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-muted-foreground">
            {clubTypeLabel(club.type)}
            <span aria-hidden>·</span>
            <Users className="size-4" aria-hidden />
            {club.memberCount} {club.memberCount === 1 ? "member" : "members"}
            {!club.isPublic && (
              <>
                <span aria-hidden>·</span>
                <Lock className="size-3.5" aria-hidden />
                Private
              </>
            )}
          </p>
          {club.tags.length > 0 && <TagList tags={club.tags} />}
          {club.description && <p className="max-w-md text-sm whitespace-pre-line text-foreground/90">{club.description}</p>}
        </div>

        {status === "member" ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground">You&apos;re already a member.</p>
            <Link href={`/clubs/${club.slug}`} className={buttonVariants({ size: "lg" })}>
              Open the club
            </Link>
          </div>
        ) : status === "banned" ? (
          <p className="text-sm text-muted-foreground">You can&apos;t join this club.</p>
        ) : status !== "valid" ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              This invite link {status === "revoked" ? "was turned off" : status === "used_up" ? "has been used up" : "has expired"}.
            </p>
            <p className="text-xs text-muted-foreground">
              {club.isPublic ? "The club is public, so you can still join from its page." : "Ask the club for a new link."}
            </p>
            {club.isPublic && (
              <Link href={`/clubs/${club.slug}`} className={buttonVariants({ variant: "outline" })}>
                Go to the club
              </Link>
            )}
          </div>
        ) : user ? (
          <div className="space-y-3">
            <AcceptInviteButton token={token} name={club.name} />
            <p className="text-xs text-muted-foreground">Members see how many solves you do each week (not your times).</p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            <Link href={`/login?next=${encodeURIComponent(here)}`} className={buttonVariants({ size: "lg" })}>
              Sign in to join
            </Link>
            <Link href={`/signup?next=${encodeURIComponent(here)}`} className={buttonVariants({ size: "lg", variant: "outline" })}>
              Create an account
            </Link>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-lg px-4 py-10">{children}</div>;
}
