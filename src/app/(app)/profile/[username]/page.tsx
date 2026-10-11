import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  Calendar,
  ChevronLeft,
  ExternalLink,
  Layers,
  Lock,
  Pencil,
  Settings,
  Timer as TimerIcon,
  type LucideIcon,
} from "lucide-react";

import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth/dal";
import { getPublicProfile, type PublicProfile } from "@/lib/profile/dal";
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
  // The stats function withholds everything from non-owners of a private profile.
  const hidden = profile.stats.hidden;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/timer" />}
        nativeButton={false}
        className="-ml-3 text-muted-foreground"
      >
        <ChevronLeft />
        Back to timer
      </Button>

      <ProfileHeader profile={profile} isOwner={isOwner} hidden={hidden} />

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
            {profile.displayName || profile.username} keeps their stats to themselves.
          </p>
        </div>
      ) : (
        <>
          <PublicStats profile={profile} />
          <EventSection profile={profile} requested={event} isOwner={isOwner} />
        </>
      )}
    </div>
  );
}

function ProfileHeader({
  profile,
  isOwner,
  hidden,
}: {
  profile: PublicProfile;
  isOwner: boolean;
  hidden: boolean;
}) {
  const name = profile.displayName || profile.username;
  return (
    <header className="flex flex-col gap-5 rounded-3xl border border-border bg-card/60 p-5 sm:flex-row sm:items-start sm:p-6">
      <ProfileAvatar url={profile.avatarUrl} name={name} size="lg" />

      <div className="min-w-0 flex-1 space-y-2">
        <h1 className="truncate text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{name}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-mono text-sm text-foreground/80">@{profile.username}</span>
          {!hidden && profile.country && (
            <span>
              {countryFlag(profile.country)} {countryName(profile.country)}
            </span>
          )}
          {!hidden && profile.wcaId && (
            <a
              href={`https://www.worldcubeassociation.org/persons/${profile.wcaId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
              title="Linked by the cuber; not verified by CubeHub"
            >
              <ExternalLink className="size-3" aria-hidden />
              WCA {profile.wcaId}
            </a>
          )}
        </div>
        {!hidden && profile.bio && (
          <p className="max-w-prose text-sm whitespace-pre-line text-foreground/90">{profile.bio}</p>
        )}
      </div>

      {isOwner && (
        <div className="flex shrink-0 gap-2">
          <Button size="sm" render={<Link href="/profile/edit" />} nativeButton={false}>
            <Pencil />
            Edit profile
          </Button>
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

function EventSection({
  profile,
  requested,
  isOwner,
}: {
  profile: PublicProfile;
  requested: string | undefined;
  isOwner: boolean;
}) {
  const { byEvent } = profile.stats;
  // Tabs for every event the cuber has solves or PBs on, in registry order.
  const events: TimerEventId[] = TIMER_EVENTS.filter(
    (e) => (byEvent[e.id] ?? 0) > 0 || profile.personalBests.some((pb) => pb.puzzleType === e.id),
  ).map((e) => e.id);

  if (events.length === 0) {
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

  // The asked-for event if it has data, otherwise the one practised most.
  const selected: TimerEventId =
    requested && isTimerEvent(requested) && events.includes(requested)
      ? requested
      : events.reduce((a, b) => ((byEvent[b] ?? 0) > (byEvent[a] ?? 0) ? b : a));
  const pbs = new Map(
    profile.personalBests.filter((pb) => pb.puzzleType === selected).map((pb) => [pb.category, pb]),
  );
  const solves = byEvent[selected] ?? 0;

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

      <p className="text-sm text-muted-foreground">
        {eventLabel(selected)} · {solves.toLocaleString("en-IN")} {solves === 1 ? "solve" : "solves"}
      </p>

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
              <p className="text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
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
    </section>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-4">
      <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-lg font-bold text-foreground">{value}</p>
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
