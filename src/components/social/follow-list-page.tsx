import { ChevronLeft, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState, PersonList, PersonRow } from "@/components/social/person-row";
import { RemoveFollowerButton } from "@/components/social/row-actions";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/auth/dal";
import { getPublicProfile } from "@/lib/profile/dal";
import { getFollowers, getFollowing } from "@/lib/social/dal";
import { cn } from "@/lib/utils";

/**
 * /profile/[username]/followers and /following. The lists are visible to
 * whoever can see the profile (public, the owner, or an approved follower);
 * otherwise a lock panel, like the profile itself.
 */
export async function FollowListPage({ username, kind }: { username: string; kind: "followers" | "following" }) {
  const [profile, user] = await Promise.all([getPublicProfile(username), getUser()]);
  if (!profile) notFound();

  const name = profile.displayName || profile.username;
  const isOwner = user?.id === profile.id;
  const people = profile.stats.hidden
    ? []
    : kind === "followers"
      ? await getFollowers(profile.id)
      : await getFollowing(profile.id);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8">
      <Link
        href={`/profile/${profile.username}`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3 text-muted-foreground")}
      >
        <ChevronLeft />
        {name}
      </Link>

      <nav aria-label="Lists" className="flex gap-1 rounded-xl border border-border bg-card/60 p-1">
        {(["followers", "following"] as const).map((k) => (
          <Link
            key={k}
            href={`/profile/${profile.username}/${k}`}
            aria-current={k === kind ? "page" : undefined}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-medium capitalize transition-colors",
              k === kind ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {k}
          </Link>
        ))}
      </nav>

      <h1 className="sr-only">
        {kind === "followers" ? `People following ${name}` : `People ${name} follows`}
      </h1>

      {profile.stats.hidden ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-12 text-center">
          <Lock className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">This profile is private</p>
          <p className="text-xs text-muted-foreground">Only approved followers can see who {name} follows and who follows them.</p>
        </div>
      ) : people.length === 0 ? (
        <EmptyState title={kind === "followers" ? "No followers yet" : "Not following anyone yet"}>
          {isOwner && (
            <Link href="/friends?tab=find" className="text-primary hover:underline">
              Find cubers to follow
            </Link>
          )}
        </EmptyState>
      ) : (
        <PersonList>
          {people.map((p) => (
            <PersonRow key={p.id} person={p}>
              {isOwner && kind === "followers" && (
                <RemoveFollowerButton followerId={p.id} name={p.displayName || p.username} />
              )}
            </PersonRow>
          ))}
        </PersonList>
      )}
    </div>
  );
}
