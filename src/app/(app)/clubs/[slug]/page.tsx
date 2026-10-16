import { Lock, Settings, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClubBadge } from "@/components/clubs/club-badge";
import { TagList } from "@/components/clubs/club-card";
import { ClubJoinButton } from "@/components/clubs/club-join-button";
import { PostCard } from "@/components/clubs/post-card";
import { PostComposer } from "@/components/clubs/post-composer";
import { FollowButton } from "@/components/social/follow-button";
import { EmptyState, PersonList, PersonRow } from "@/components/social/person-row";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/auth/dal";
import {
  getClubActivity,
  getClubBySlug,
  getClubMembers,
  getClubPosts,
  getFollowRelations,
  getJoinRequests,
  getMembership,
} from "@/lib/clubs/dal";
import { canManage, clubTypeLabel, roleLabel, type ClubRole } from "@/lib/clubs/types";
import { followButtonState } from "@/lib/social/types";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; before?: string }>;
}

type Tab = "posts" | "members" | "activity";
const TABS: { id: Tab; label: string }[] = [
  { id: "posts", label: "Posts" },
  { id: "members", label: "Members" },
  { id: "activity", label: "Activity" },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const club = await getClubBySlug((await params).slug);
  if (!club) return { title: "Club not found — CubeHub" };
  return {
    title: `${club.name} — CubeHub`,
    description: club.description ?? `${clubTypeLabel(club.type)} cubing club on CubeHub.`,
    // Private clubs show their name in search, but their page has nothing to index.
    robots: club.isPublic ? undefined : { index: false },
  };
}

export default async function ClubPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const club = await getClubBySlug(slug);
  if (!club) notFound();

  const membership = await getMembership(club.id);
  const isMember = membership.kind === "member";
  const canSeeInside = club.isPublic || isMember;
  const manager = canManage(membership);
  const requestCount = manager && !club.isPublic ? (await getJoinRequests(club.id)).length : 0;
  const tab: Tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as Tab) : "posts";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <Link href="/clubs" className="text-sm text-muted-foreground hover:text-foreground">
        ← Clubs
      </Link>

      <header className="space-y-4">
        <div className="flex flex-wrap items-start gap-4">
          <ClubBadge name={club.name} slug={club.slug} size="lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <h1 className="text-2xl font-extrabold tracking-tight break-words text-foreground">{club.name}</h1>
            <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
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
              {isMember && membership.role !== "member" && (
                <>
                  <span aria-hidden>·</span>
                  <span className="font-medium text-primary">You&apos;re {membership.role === "owner" ? "the owner" : "an admin"}</span>
                </>
              )}
            </p>
            {club.tags.length > 0 && <TagList tags={club.tags} />}
          </div>
          <div className="flex w-full flex-wrap items-start gap-2 sm:w-auto">
            {manager && (
              <Link href={`/clubs/${club.slug}/manage`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                <Settings />
                Manage
                {requestCount > 0 && (
                  <span className="rounded-full bg-primary/15 px-1.5 text-xs font-bold text-primary">{requestCount}</span>
                )}
              </Link>
            )}
            <ClubJoinButton
              clubId={club.id}
              slug={club.slug}
              name={club.name}
              isPublic={club.isPublic}
              membership={membership}
            />
          </div>
        </div>
        {club.description && <p className="text-sm whitespace-pre-line text-foreground/90">{club.description}</p>}
      </header>

      {!canSeeInside ? (
        <EmptyState title="This club is private">
          Members, posts and activity are visible to members only. Ask to join, and an admin will review it.
        </EmptyState>
      ) : (
        <>
          <nav aria-label="Club sections" className="hide-scrollbar -mx-4 overflow-x-auto px-4">
            <ul className="flex w-max gap-1 rounded-xl border border-border bg-card/60 p-1">
              {TABS.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/clubs/${club.slug}?tab=${t.id}`}
                    scroll={false}
                    aria-current={t.id === tab ? "page" : undefined}
                    className={cn(
                      "flex items-center rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                      t.id === tab
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {tab === "posts" && (
            <Posts
              clubId={club.id}
              slug={club.slug}
              isMember={isMember}
              canModerate={manager}
              before={sp.before}
            />
          )}
          {tab === "members" && <Members clubId={club.id} />}
          {tab === "activity" && <Activity clubId={club.id} />}
        </>
      )}
    </div>
  );
}

async function Posts({
  clubId,
  slug,
  isMember,
  canModerate,
  before,
}: {
  clubId: string;
  slug: string;
  isMember: boolean;
  canModerate: boolean;
  before?: string;
}) {
  const [{ pinned, posts, hasMore }, user] = await Promise.all([getClubPosts(clubId, before), getUser()]);
  const all = [...pinned, ...posts];
  const last = posts.at(-1);

  return (
    <section className="space-y-4" aria-label="Posts">
      {isMember && !before && <PostComposer clubId={clubId} slug={slug} />}
      {before && (
        <Link href={`/clubs/${slug}`} className="text-sm text-primary hover:underline">
          ← Newest posts
        </Link>
      )}
      {all.length === 0 ? (
        <EmptyState title={before ? "No older posts" : "No posts yet"}>
          {isMember
            ? "Share news, an algorithm or a video with the club."
            : "Announcements, algorithms and videos from members show up here."}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {all.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              clubId={clubId}
              slug={slug}
              viewerId={user?.id ?? null}
              canModerate={canModerate}
            />
          ))}
        </ul>
      )}
      {hasMore && last && (
        <Link
          href={`/clubs/${slug}?tab=posts&before=${encodeURIComponent(last.createdAt)}`}
          className={buttonVariants({ variant: "outline", className: "w-full" })}
        >
          Older posts
        </Link>
      )}
    </section>
  );
}

const GROUPS: { role: ClubRole; label: string }[] = [
  { role: "owner", label: "Owner" },
  { role: "admin", label: "Admins" },
  { role: "member", label: "Members" },
];

async function Members({ clubId }: { clubId: string }) {
  const [all, user] = await Promise.all([getClubMembers(clubId), getUser()]);
  // Blocked cubers stay in the club but aren't shown to each other.
  const members = all.filter((m) => !m.hidden);
  const relations = await getFollowRelations(members.map((m) => m.person.id));

  return (
    <div className="space-y-5">
      {GROUPS.map(({ role, label }) => {
        const group = members.filter((m) => (role === "member" ? m.role === "member" || m.role === "moderator" : m.role === role));
        if (group.length === 0) return null;
        return (
          <section key={role} className="space-y-2" aria-label={label}>
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {label} · {group.length}
            </h2>
            <PersonList>
              {group.map((m) => (
                <PersonRow key={m.person.id} person={m.person}>
                  <FollowButton
                    targetId={m.person.id}
                    name={m.person.displayName || m.person.username}
                    initial={followButtonState(relations.get(m.person.id) ?? null, {
                      signedIn: Boolean(user),
                      isOwner: user?.id === m.person.id,
                    })}
                    isPrivate={!m.isPublic}
                  />
                </PersonRow>
              ))}
            </PersonList>
          </section>
        );
      })}
    </div>
  );
}

async function Activity({ clubId }: { clubId: string }) {
  const rows = await getClubActivity(clubId);
  const total = rows.reduce((sum, r) => sum + r.solves, 0);
  const active = rows.filter((r) => r.solves > 0);

  return (
    <section className="space-y-3" aria-label="Activity this week">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm text-foreground">
          <span className="text-2xl font-bold tabular-nums">{total}</span> solves this week
        </p>
        <p className="text-xs text-muted-foreground">Monday to Sunday, IST · practice, not speed</p>
      </div>
      {active.length === 0 ? (
        <EmptyState title="Quiet week so far">Solves on the timer by members count here.</EmptyState>
      ) : (
        <PersonList>
          {active.map((r) => (
            <PersonRow key={r.person.id} person={r.person} detail={r.role === "member" ? undefined : roleLabel(r.role)}>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {r.solves} <span className="text-xs font-normal text-muted-foreground">{r.solves === 1 ? "solve" : "solves"}</span>
              </span>
            </PersonRow>
          ))}
        </PersonList>
      )}
      {active.length < rows.length && (
        <p className="text-xs text-muted-foreground">
          {rows.length - active.length} {rows.length - active.length === 1 ? "member hasn't" : "members haven't"} timed a solve yet this week.
        </p>
      )}
    </section>
  );
}
