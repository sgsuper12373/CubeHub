import type { Metadata } from "next";
import { ChevronLeft, Lock } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { buttonVariants } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { getPublicProfile, type PublicProfile } from "@/lib/profile/dal";
import { levelFor } from "@/lib/profile/level";
import { compareTimes, sharedEventOrder, tally, type CompareCell } from "@/lib/social/compare";
import { eventLabel, TIMER_EVENTS } from "@/lib/timer/events";
import { formatMs } from "@/lib/timer/format";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `You vs @${username} — CubeHub`, robots: { index: false } };
}

const CATEGORIES = [
  { id: "single", label: "Single" },
  { id: "mean3", label: "Mo3" },
  { id: "ao5", label: "Ao5" },
  { id: "ao12", label: "Ao12" },
  { id: "ao100", label: "Ao100" },
] as const;

function pbTime(profile: PublicProfile, event: string, category: string): number | null {
  return profile.personalBests.find((pb) => pb.puzzleType === event && pb.category === category)?.timeMs ?? null;
}

export default async function ComparePage({ params }: Props) {
  const { username } = await params;
  const me = await getProfile();
  if (!me) redirect(`/login?next=${encodeURIComponent(`/profile/${username}/compare`)}`);
  if (me.username.toLowerCase() === username.toLowerCase()) redirect(`/profile/${me.username}`);

  const [mine, theirs] = await Promise.all([getPublicProfile(me.username), getPublicProfile(username)]);
  if (!theirs || !mine) notFound();

  const theirName = theirs.displayName || theirs.username;
  const myName = mine.displayName || mine.username;
  const events = theirs.stats.hidden
    ? []
    : sharedEventOrder(
        TIMER_EVENTS.map((e) => e.id),
        mine.personalBests,
        theirs.personalBests,
      );
  // Only the categories at least one of you has; an event with none drops out.
  const rows = events
    .map((event) => ({
      event,
      cells: CATEGORIES.map((c) => ({
        ...c,
        cell: compareTimes(pbTime(mine, event, c.id), pbTime(theirs, event, c.id)),
      })).filter(({ cell }) => cell.mine !== null || cell.theirs !== null),
    }))
    .filter((r) => r.cells.length > 0);
  const score = tally(rows.flatMap((r) => r.cells.map((c) => c.cell)));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <Link
        href={`/profile/${theirs.username}`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3 text-muted-foreground")}
      >
        <ChevronLeft />
        {theirName}
      </Link>

      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-3xl border border-border bg-card/60 p-5">
        <Contender profile={mine} name={myName} label="You" />
        <div className="text-center">
          <h1 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Head to head</h1>
          {rows.length > 0 && (
            <p className="mt-1 font-mono text-2xl font-extrabold text-foreground tabular-nums">
              {score.me} – {score.them}
            </p>
          )}
        </div>
        <Contender profile={theirs} name={theirName} label={`@${theirs.username}`} alignEnd />
      </header>

      {theirs.stats.hidden ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-12 text-center">
          <Lock className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">{theirName}&apos;s profile is private</p>
          <p className="text-xs text-muted-foreground">Once they approve your follow request, you can compare.</p>
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          Neither of you has a personal best yet.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map(({ event, cells }) => (
            <section key={event} className="space-y-2" aria-labelledby={`cmp-${event}`}>
              <div className="flex items-baseline justify-between gap-2">
                <h2 id={`cmp-${event}`} className="text-sm font-bold text-foreground">
                  {eventLabel(event)}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {levelLine(mine, event)} · {levelLine(theirs, event)}
                </p>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-border bg-card/60">
                <table className="w-full min-w-md text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">
                        <span className="sr-only">Category</span>
                      </th>
                      <th className="px-3 py-2 text-right font-medium">You</th>
                      <th className="px-3 py-2 text-right font-medium">{theirName}</th>
                      <th className="px-3 py-2 text-right font-medium">Gap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cells.map(({ id, label, cell }) => (
                      <tr key={id}>
                        <th scope="row" className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                          {label}
                        </th>
                        <TimeCell ms={cell.mine} faster={cell.faster === "me"} />
                        <TimeCell ms={cell.theirs} faster={cell.faster === "them"} />
                        <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground tabular-nums">
                          {gapText(cell)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {!theirs.stats.hidden && (
        <div className="grid grid-cols-2 gap-3 text-center">
          <Totals profile={mine} />
          <Totals profile={theirs} />
        </div>
      )}
    </div>
  );
}

function Contender({
  profile,
  name,
  label,
  alignEnd,
}: {
  profile: PublicProfile;
  name: string;
  label: string;
  alignEnd?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", alignEnd && "flex-row-reverse text-right")}>
      <ProfileAvatar url={profile.avatarUrl} name={name} size="md" />
      <div className="min-w-0">
        <p className="truncate text-base font-bold text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function TimeCell({ ms, faster }: { ms: number | null; faster: boolean }) {
  return (
    <td
      className={cn(
        "px-3 py-2 text-right font-mono tabular-nums",
        ms === null ? "text-muted-foreground" : faster ? "font-bold text-primary" : "text-foreground",
      )}
    >
      {ms === null ? "—" : formatMs(ms)}
    </td>
  );
}

function gapText(cell: CompareCell): string {
  if (cell.faster === null) return "";
  if (cell.faster === "tie") return "tie";
  return `${cell.faster === "me" ? "you −" : "them −"}${formatMs(cell.gapMs ?? 0)}`;
}

function levelLine(profile: PublicProfile, event: string): string {
  const level = levelFor(event, profile.stats.levels[event]);
  return level ? level.label : "—";
}

function Totals({ profile }: { profile: PublicProfile }) {
  const { stats } = profile;
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <p className="font-mono text-lg font-bold text-foreground tabular-nums">{stats.totalSolves.toLocaleString("en-IN")}</p>
      <p className="text-xs text-muted-foreground">
        solves
        {stats.activity ? ` · ${stats.activity.currentStreak}-day streak` : ""}
      </p>
    </div>
  );
}
