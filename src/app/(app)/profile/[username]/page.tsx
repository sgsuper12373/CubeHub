import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProfile } from "@/lib/profile/dal";
import { formatMs } from "@/lib/timer/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Calendar,
  ExternalLink,
  Flame,
  Zap,
  Timer as TimerIcon,
  ChevronLeft,
} from "lucide-react";

interface Props {
  params: Promise<{
    username: string;
  }>;
}

function getEloTier(rating: number) {
  if (rating < 900) return { name: "Scrambled", color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" };
  if (rating < 1100) return { name: "Beginner", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
  if (rating < 1300) return { name: "Intermediate", color: "text-teal-400 bg-teal-500/10 border-teal-500/20" };
  if (rating < 1500) return { name: "Advanced", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
  if (rating < 1700) return { name: "Expert", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
  if (rating < 1900) return { name: "Master", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
  return { name: "Grandmaster", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
}

function formatPuzzle(p: string) {
  if (p === "333") return "3x3";
  if (p === "222") return "2x2";
  if (p === "444") return "4x4";
  return p;
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
    description: `View ${name}'s solve statistics, personal bests, and competitive ranking on CubeHub.`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const resolvedParams = await params;
  const profile = await getPublicProfile(resolvedParams.username);

  if (!profile) {
    notFound();
  }

  const eloTier = getEloTier(profile.eloRating);
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
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${eloTier.color}`}
            >
              {eloTier.name} ({profile.eloRating})
            </span>
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
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-white/5 bg-muted/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <TimerIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Total Solves
              </p>
              <h3 className="text-2xl font-bold font-mono text-foreground">
                {profile.totalSolves}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-muted/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                3x3 ELO Rating
              </p>
              <h3 className="text-2xl font-bold font-mono text-foreground">
                {profile.eloRating}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-muted/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                3x3 Best Single
              </p>
              <h3 className="text-2xl font-bold font-mono text-foreground">
                {singlePb333 ? formatMs(singlePb333.timeMs) : "—"}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-muted/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                3x3 Best Ao5
              </p>
              <h3 className="text-2xl font-bold font-mono text-foreground">
                {ao5Pb333 ? formatMs(ao5Pb333.timeMs) : "—"}
              </h3>
            </div>
          </CardContent>
        </Card>
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
