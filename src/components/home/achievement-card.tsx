import { createElement } from "react";

import { HomeCard } from "@/components/home/home-card";
import { Progress } from "@/components/ui/progress";
import { nextAchievement } from "@/lib/home/next-achievement";
import { achievementIcon } from "@/lib/profile/achievement-icons";
import { getAchievements, getPublicProfile } from "@/lib/profile/dal";

/**
 * Next achievement (docs/home-plan.md → card 11): the unearned badge this
 * cuber is closest to, with how far along they are. Renders nothing when
 * every visible badge is earned or none can be measured.
 */
export async function AchievementCard({ profileId, username }: { profileId: string; username: string }) {
  const [badges, profile] = await Promise.all([getAchievements(profileId), getPublicProfile(username)]);
  if (!profile) return null;
  const bests: Record<string, number> = {};
  for (const pb of profile.personalBests) bests[`${pb.puzzleType}:${pb.category}`] = pb.timeMs;
  const next = nextAchievement(badges, {
    totalSolves: profile.stats.totalSolves,
    byEvent: profile.stats.byEvent,
    currentStreak: profile.stats.activity?.currentStreak ?? null,
    learning: profile.stats.learning ?? [],
    bests,
  });
  if (!next) return null;
  const percent = Math.round(next.progress * 100);
  return (
    <HomeCard id="achievement" title="Next achievement" seeAll={{ href: `/profile/${username}`, label: "All badges" }}>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {createElement(achievementIcon(next.slug), { className: "size-4", "aria-hidden": true })}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{next.title}</p>
          <p className="text-xs text-muted-foreground">{next.description}</p>
        </div>
      </div>
      <Progress value={percent} aria-label={`${next.title}: ${percent}%`} className="mt-3" />
      <p className="mt-1.5 text-xs text-muted-foreground" data-testid="next-achievement-detail">
        {next.detail}
      </p>
    </HomeCard>
  );
}
