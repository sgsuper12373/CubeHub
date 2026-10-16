import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  Box,
  Calendar,
  ExternalLink,
  Layers,
  Lock,
  Pencil,
  Settings,
  Swords,
  Timer as TimerIcon,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ProfileClubs } from "@/components/clubs/profile-clubs";
import { BackButton } from "@/components/layout/back-button";
import { AchievementCheck } from "@/components/profile/achievement-check";
import { AchievementsSection } from "@/components/profile/achievements-section";
import { ActivitySection } from "@/components/profile/activity-section";
import { LatestRecords } from "@/components/profile/latest-records";
import { LearningSection } from "@/components/profile/learning-section";
import { PbTimeline } from "@/components/profile/pb-timeline";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { FollowButton } from "@/components/social/follow-button";
import { NotificationBell } from "@/components/social/notification-bell";
import { ProfileActionsMenu } from "@/components/social/profile-actions-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/auth/dal";
import { getProfileClubs } from "@/lib/clubs/dal";
import {
  getAchievements,
  getPbProgression,
  getSetups,
  getPublicProfile,
  type PbProgression,
  type PublicProfile,
} from "@/lib/profile/dal";
import { getNotifications } from "@/lib/notifications/dal";
import { levelFor, methodLabel } from "@/lib/profile/level";
import { getFollowSummary } from "@/lib/social/dal";
import { countLabel, followButtonState, isFriend, type FollowSummary } from "@/lib/social/types";
import { countryFlag, countryName } from "@/lib/profile/validate";
import { eventLabel, isTimerEvent, TIMER_EVENTS, type TimerEventId } from "@/lib/timer/events";
import { formatMs } from "@/lib/timer/format";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ event?: string }>;
}

/** The PB categories an event tab shows, in order. */
const PB_CATEGORIES = [
  { category: "single", label: "Single" },
  { category: "mean3", label: "Mo3" },
  { category: "ao5", label: "Ao5" },
  { category: "ao12", label: "Ao12" },
  { category: "ao100", label: "Ao100" },
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return { title: "User not found — CubeHub" };

  const name = profile.displayName || profile.username;
  return {
    title: `${name} (@${profile.username}) — CubeHub`,
    description: profile.isPublic
      ? `${name}'s solve stats and personal bests on CubeHub.`
      : `${name} on CubeHub.`,
  };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const [{ username }, { event }] = await Promise.all([params, searchParams]);
  const [profile, user] = await Promise.all([getPublicProfile(username), getUser()]);
  if (!profile) notFound();

  const isOwner = user?.id === profile.id;
  const [summary, notifications] = await Promise.all([
    getFollowSummary(profile.id),
    isOwner ? getNotifications() : null,
  ]);
  const follow = {
    summary,
    state: followButtonState(summary, { signedIn: user !== null, isOwner }),
    signedIn: user !== null,
  };
  // The stats function withholds everything from non-owners of a private profile.
  const hidden = profile.stats.hidden;
  const events = practisedEvents(profile);
  const selected = pickEvent(profile, events, event);
  const [progression, achievements, setups, clubs] = hidden
    ? [null, [], {} as Record<string, string>, []]
    : await Promise.all([
        selected ? getPbProgression(profile.id, selected) : null,
        getAchievements(profile.id),
        getSetups(profile.id),
        getProfileClubs(profile.id),
      ]);
  const { activity, learning } = profile.stats;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <BackButton fallback={isOwner ? "/timer" : "/people"} className="-ml-3 text-muted-foreground" />

      <ProfileHeader
        profile={profile}
        isOwner={isOwner}
        hidden={hidden}
        follow={follow}
        notifications={notifications}
      />
      {isOwner && <AchievementCheck />}

      {isOwner && !profile.isPublic && (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" aria-hidden />
          Your profile is private. Others see only your name and photo.
        </p>
      )}

      {hidden ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-12 text-center">
          <Lock className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">This profile is private</p>
          <p className="text-xs text-muted-foreground">
            {follow.state === "requested"
              ? "Your follow request is waiting for approval."
              : `Follow ${profile.displayName || profile.username} to see their stats once they approve.`}
          </p>
        </div>
      ) : (
        <>
          <PublicStats profile={profile} />
          <ProfileClubs clubs={clubs} isOwner={isOwner} />
          {activity && (
            <ActivitySection activity={activity} hiddenNote={isOwner && !profile.showActivity} />
          )}
          <EventSection
            mainCube={selected ? (setups[selected] ?? null) : null}
            profile={profile}
            events={events}
            selected={selected}
            progression={progression}
            isOwner={isOwner}
          />
          <LatestRecords personalBests={profile.personalBests} />
          <AchievementsSection achievements={achievements} />
          {learning && (learning.length > 0 || isOwner) && (
            <LearningSection
              learning={learning}
              isOwner={isOwner}
              hiddenNote={isOwner && !profile.showLearning}
            />
          )}
        </>
      )}
    </div>
  );
}

function ProfileHeader({
  profile,
  isOwner,
  hidden,
  follow,
  notifications,
}: {
  profile: PublicProfile;
  isOwner: boolean;
  hidden: boolean;
  follow: { summary: FollowSummary | null; state: ReturnType<typeof followButtonState>; signedIn: boolean };
  notifications: Awaited<ReturnType<typeof getNotifications>> | null;
}) {
  const name = profile.displayName || profile.username;
  const method = methodLabel(profile.mainMethod);
  return (
    <header className="flex flex-col gap-5 rounded-3xl border border-border bg-card/60 p-5 sm:flex-row sm:items-start sm:p-6">
      <ProfileAvatar url={profile.avatarUrl} name={name} size="lg" />

      <div className="min-w-0 flex-1 space-y-2">
        <h1 className="truncate text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{name}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-mono text-sm text-foreground/80">@{profile.username}</span>
          {isFriend(follow.summary) && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">Friends</span>
          )}
          {!isOwner && follow.summary?.followsMe && !isFriend(follow.summary) && (
            <span className="rounded-full bg-muted px-2 py-0.5 font-medium">Follows you</span>
          )}
          {!hidden && profile.country && (
            <span>
              {countryFlag(profile.country)} {countryName(profile.country)}
            </span>
          )}
          {/* Anyone can type any WCA ID, so until IDs are verified (WCA sign-in)
              only the owner sees theirs (founder, 2026-10-15). */}
          {isOwner && profile.wcaId && (
            <a
              href={`https://www.worldcubeassociation.org/persons/${profile.wcaId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
              title="Only you can see this until WCA IDs can be verified"
            >
              <ExternalLink className="size-3" aria-hidden />
              WCA {profile.wcaId} · only you see this
            </a>
          )}
        </div>
        {!hidden && (method || profile.learningNow) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {method && (
              <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 font-medium text-foreground">
                {method}
              </span>
            )}
            {profile.learningNow && (
              <span className="text-muted-foreground">
                Learning: <span className="text-foreground">{profile.learningNow}</span>
              </span>
            )}
          </div>
        )}
        {follow.summary && <FollowCounts username={profile.username} summary={follow.summary} linked={!hidden} />}
        {!hidden && profile.bio && (
          <p className="max-w-prose text-sm whitespace-pre-line text-foreground/90">{profile.bio}</p>
        )}
      </div>

      {!isOwner && (
        <div className="flex shrink-0 flex-wrap gap-2">
          <FollowButton targetId={profile.id} name={name} initial={follow.state} isPrivate={!profile.isPublic} />
          {follow.signedIn && !hidden && (
            <Link
              href={`/profile/${profile.username}/compare`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Swords />
              Compare
            </Link>
          )}
          {follow.signedIn && <ProfileActionsMenu targetId={profile.id} name={name} />}
        </div>
      )}

      {isOwner && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link href="/profile/edit" className={buttonVariants({ size: "sm" })}>
            <Pencil />
            Edit profile
          </Link>
          <Link href="/people" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Users />
            People
          </Link>
          {/* Phones have no top bar, so the bell lives here too. */}
          {notifications && (
            <div className="md:hidden">
              <NotificationBell items={notifications.items} unread={notifications.unread} />
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/settings" />}
            nativeButton={false}
            aria-label="Settings"
          >
            <Settings />
          </Button>
        </div>
      )}
    </header>
  );
}

function FollowCounts({ username, summary, linked }: { username: string; summary: FollowSummary; linked: boolean }) {
  const followers = countLabel(summary.followers, "follower", "followers");
  const following = `${summary.following.toLocaleString("en-IN")} following`;
  const cls = "font-semibold text-foreground";
  return (
    <p className="flex gap-4 text-sm text-muted-foreground">
      {linked ? (
        <>
          <Link href={`/profile/${username}/followers`} className="hover:underline">
            <FollowCount text={followers} cls={cls} />
          </Link>
          <Link href={`/profile/${username}/following`} className="hover:underline">
            <FollowCount text={following} cls={cls} />
          </Link>
        </>
      ) : (
        <>
          <FollowCount text={followers} cls={cls} />
          <FollowCount text={following} cls={cls} />
        </>
      )}
    </p>
  );
}

/** "12 followers" with the number emphasised. */
function FollowCount({ text, cls }: { text: string; cls: string }) {
  const [n, ...rest] = text.split(" ");
  return (
    <span>
      <span className={cls}>{n}</span> {rest.join(" ")}
    </span>
  );
}

function PublicStats({ profile }: { profile: PublicProfile }) {
  const { stats } = profile;
  const events = Object.keys(stats.byEvent).length;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard icon={TimerIcon} label="Total solves" value={stats.totalSolves.toLocaleString("en-IN")} />
      <StatCard icon={Layers} label="Events" value={String(events)} />
      <StatCard icon={Calendar} label="Member since" value={formatMonth(profile.createdAt)} />
      <StatCard
        icon={Activity}
        label="Last active"
        value={stats.lastSolveOn ? formatDay(stats.lastSolveOn) : "—"}
      />
    </div>
  );
}

/** Events the cuber has solves or PBs on, in registry order. */
function practisedEvents(profile: PublicProfile): TimerEventId[] {
  const { byEvent } = profile.stats;
  return TIMER_EVENTS.filter(
    (e) => (byEvent[e.id] ?? 0) > 0 || profile.personalBests.some((pb) => pb.puzzleType === e.id),
  ).map((e) => e.id);
}

/** The asked-for event if it has data, otherwise the one practised most. */
function pickEvent(
  profile: PublicProfile,
  events: TimerEventId[],
  requested: string | undefined,
): TimerEventId | null {
  if (events.length === 0) return null;
  if (requested && isTimerEvent(requested) && events.includes(requested)) return requested;
  const { byEvent } = profile.stats;
  return events.reduce((a, b) => ((byEvent[b] ?? 0) > (byEvent[a] ?? 0) ? b : a));
}

function EventSection({
  mainCube,
  profile,
  events,
  selected,
  progression,
  isOwner,
}: {
  mainCube: string | null;
  profile: PublicProfile;
  events: TimerEventId[];
  selected: TimerEventId | null;
  progression: PbProgression | null;
  isOwner: boolean;
}) {
  const { byEvent } = profile.stats;
  if (!selected) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">No solves yet.</p>
        {isOwner && (
          <Button size="sm" render={<Link href="/timer" />} nativeButton={false}>
            Start timing
          </Button>
        )}
      </div>
    );
  }

  const pbs = new Map(
    profile.personalBests.filter((pb) => pb.puzzleType === selected).map((pb) => [pb.category, pb]),
  );
  const solves = byEvent[selected] ?? 0;
  const level = levelFor(selected, profile.stats.levels[selected]);

  return (
    <section className="space-y-4" aria-labelledby="pbs-title">
      <h2 id="pbs-title" className="text-lg font-bold tracking-tight text-foreground">
        Personal bests
      </h2>

      <nav aria-label="Events" className="hide-scrollbar -mx-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-1 rounded-xl border border-border bg-card/60 p-1">
          {events.map((id) => (
            <li key={id}>
              <Link
                href={`?event=${id}`}
                scroll={false}
                aria-current={id === selected ? "page" : undefined}
                className={cn(
                  "block rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                  id === selected
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {eventLabel(id)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
        <span>
          {eventLabel(selected)} · {solves.toLocaleString("en-IN")} {solves === 1 ? "solve" : "solves"}
        </span>
        {level && (
          <span
            className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
            title={`From the best Ao12 timed on CubeHub (${formatMs(profile.stats.levels[selected])}), level ${level.tier} of ${level.of}`}
          >
            {level.label} · Ao12
          </span>
        )}
        {mainCube && (
          <span className="flex items-center gap-1.5">
            <Box className="size-3.5" aria-hidden />
            Main cube: <span className="text-foreground">{mainCube}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PB_CATEGORIES.map(({ category, label }) => {
          const pb = pbs.get(category);
          return (
            <div
              key={category}
              className={cn(
                "rounded-xl border bg-card/60 px-4 py-3",
                category === "single" ? "border-primary/40" : "border-border",
              )}
            >
              <p className="text-xs font-semibold text-muted-foreground">{label}</p>
              <p
                className={cn(
                  "mt-1 font-mono text-xl font-semibold tabular-nums",
                  pb ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {pb ? formatMs(pb.timeMs) : "—"}
              </p>
              <p className="mt-0.5 h-4 text-xs text-muted-foreground">{pb ? formatInstant(pb.achievedAt) : ""}</p>
            </div>
          );
        })}
      </div>

      {progression && (
        <PbTimeline
          progression={progression}
          eventName={eventLabel(selected)}
          lastActiveOn={profile.stats.lastSolveOn}
        />
      )}
    </section>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    // Icon above the text on phones, beside it from sm up: two columns of
    // side-by-side cards leave too little room for "11 Oct 2026".
    <div className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card/60 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
      <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary sm:p-2.5">
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-base font-bold text-foreground sm:text-lg">{value}</p>
      </div>
    </div>
  );
}

/** "2026-10-11" (an IST calendar date from the stats function) → "11 Oct 2026". */
function formatDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** A timestamp as the India date it happened on. */
function formatInstant(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}
