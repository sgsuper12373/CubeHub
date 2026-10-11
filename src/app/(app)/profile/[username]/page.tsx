import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/auth/dal";
import { getPublicProfile } from "@/lib/profile/dal";
import { eventLabel } from "@/lib/timer/events";
import { formatMs } from "@/lib/timer/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Trophy,
  Calendar,
  ExternalLink,
  Settings,
  Zap,
  Timer as TimerIcon,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";

interface Props {
  params: Promise<{
    username: string;
  }>;
}

function formatPuzzle(p: string) {
  return eventLabel(p);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const profile = await getPublicProfile(resolvedParams.username);

  if (!profile) {
    return { title: "User Not Found | CubeHub" };
  }

  const name = profile.displayName || profile.username;
  return {
    title: `${name} (@${profile.username}) — CubeHub`,
    description: `${name}'s solve stats and personal bests on CubeHub.`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const resolvedParams = await params;
  const [profile, user] = await Promise.all([
    getPublicProfile(resolvedParams.username),
    getUser(),
  ]);

  if (!profile) {
    notFound();
  }

  const isOwner = user?.id === profile.id;
  const lastActive = profile.stats.lastSolveOn
    ? formatDay(profile.stats.lastSolveOn)
    : "—";
  const joinDate = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const singlePb333 = profile.personalBests.find(
    (pb) => pb.puzzleType === "333" && pb.category === "single",
  );
  const ao5Pb333 = profile.personalBests.find(
    (pb) => pb.puzzleType === "333" && pb.category === "ao5",
  );

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/timer" />}
          nativeButton={false}
          className="-ml-3 text-muted-foreground"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Timer
        </Button>
      </div>

      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 rounded-3xl bg-card/60 border border-white/5 backdrop-blur-md">
        {/* Avatar */}
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 text-2xl font-bold text-primary shrink-0 shadow-lg">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile.username}
              className="w-full h-full object-cover rounded-2xl"
            />
          ) : (
            (profile.displayName || profile.username).slice(0, 2).toUpperCase()
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              {profile.displayName || profile.username}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="font-mono text-sm text-foreground/80">
              @{profile.username}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Joined {joinDate}
            </span>
            {profile.wcaId && (
              <a
                href={`https://www.worldcubeassociation.org/persons/${profile.wcaId}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                WCA {profile.wcaId}
              </a>
            )}
          </div>
        </div>

        {isOwner && (
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/settings" />}
            nativeButton={false}
          >
            <Settings />
            Settings
          </Button>
        )}
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={TimerIcon} label="Total solves" value={profile.stats.totalSolves.toLocaleString("en-IN")} />
        <StatCard icon={Zap} label="3x3 best single" value={singlePb333 ? formatMs(singlePb333.timeMs) : "—"} />
        <StatCard icon={Trophy} label="3x3 best Ao5" value={ao5Pb333 ? formatMs(ao5Pb333.timeMs) : "—"} />
        <StatCard icon={Activity} label="Last active" value={lastActive} />
      </div>

      {/* Personal Bests Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Personal Bests</h2>
        {profile.personalBests.length > 0 ? (
          <div className="rounded-2xl border border-white/5 overflow-hidden bg-card/40 backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground border-b border-white/5">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Puzzle</th>
                    <th className="px-6 py-3.5 font-semibold">Category</th>
                    <th className="px-6 py-3.5 font-semibold">Time</th>
                    <th className="px-6 py-3.5 font-semibold">Achieved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {profile.personalBests.map((pb, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-sans font-medium text-foreground">
                        {formatPuzzle(pb.puzzleType)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground uppercase text-xs">
                        {pb.category}
                      </td>
                      <td className="px-6 py-4 font-semibold text-primary">
                        {formatMs(pb.timeMs)}
                      </td>
                      <td className="px-6 py-4 text-xs font-sans text-muted-foreground">
                        {new Date(pb.achievedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 rounded-2xl border border-dashed border-white/10 bg-muted/5 text-muted-foreground">
            <p className="text-sm">No recorded personal bests yet.</p>
          </div>
        )}
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

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card className="border-border bg-card/60">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="truncate font-mono text-2xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
