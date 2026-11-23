import Link from "next/link";

import { HomeCard } from "@/components/home/home-card";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { feedDate, feedLine } from "@/components/social/feed-line";
import { getClubPosts, getMyClubs } from "@/lib/clubs/dal";
import { getActivityFeed, getSuggestions } from "@/lib/social/dal";
import { formatMs } from "@/lib/timer/format";

/** Friends activity (docs/home-plan.md → card 8): the last five items from people you follow. */
export async function FriendsCard() {
  const items = (await getActivityFeed("following", 7)).slice(0, 5);
  if (items.length > 0) {
    return (
      <HomeCard id="friends" title="Friends activity" seeAll={{ href: "/people?tab=feed" }}>
        <ul className="flex flex-col gap-2.5">
          {items.map((item, i) => {
            const name = item.person.displayName || item.person.username;
            return (
              <li key={`${item.kind}-${item.person.id}-${item.at}-${i}`} className="flex items-start gap-2.5">
                <ProfileAvatar url={item.person.avatarUrl} name={name} size="xs" className="size-7 rounded-md text-[10px]" />
                <p className="min-w-0 text-xs text-muted-foreground">
                  <Link href={`/profile/${item.person.username}`} className="font-semibold text-foreground hover:underline">
                    {name}
                  </Link>{" "}
                  {feedLine(item)} · {feedDate(item.at)}
                </p>
              </li>
            );
          })}
        </ul>
      </HomeCard>
    );
  }

  const suggestions = (await getSuggestions()).slice(0, 2);
  return (
    <HomeCard id="friends" title="Friends activity">
      <p className="text-sm text-muted-foreground">
        Follow cubers to see their PBs here.{" "}
        <Link href="/people?tab=find" className="font-medium text-primary hover:underline">
          Find people
        </Link>
      </p>
      {suggestions.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {suggestions.map((p) => {
            const name = p.displayName || p.username;
            return (
              <li key={p.id}>
                <Link href={`/profile/${p.username}`} className="flex items-center gap-2.5 rounded-lg hover:bg-muted/50">
                  <ProfileAvatar url={p.avatarUrl} name={name} size="xs" className="size-7 rounded-md text-[10px]" />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{name}</span>
                  {p.ao12Ms && <span className="font-mono text-xs tabular-nums text-muted-foreground">Ao12 {formatMs(p.ao12Ms)}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </HomeCard>
  );
}

/** How many clubs get their newest post read: one query each. */
const CLUBS_SHOWN = 3;

function firstLine(text: string | null): string | null {
  const line = text?.split("\n").find((l) => l.trim())?.trim();
  return line ? (line.length > 80 ? `${line.slice(0, 79)}…` : line) : null;
}

/** Your clubs (docs/home-plan.md → card 9): each with its newest post's first line. */
export async function ClubsCard() {
  const clubs = (await getMyClubs()).slice(0, CLUBS_SHOWN);
  if (clubs.length === 0) {
    return (
      <HomeCard id="clubs" title="Your clubs">
        <p className="text-sm text-muted-foreground">
          <Link href="/clubs" className="font-medium text-primary hover:underline">
            Join your college club
          </Link>{" "}
          to see its posts here.
        </p>
      </HomeCard>
    );
  }

  const newest = await Promise.all(
    clubs.map(async (c) => {
      const { pinned, posts } = await getClubPosts(c.id);
      const post = [...posts, ...pinned].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
      if (!post) return null;
      return firstLine(post.body) ?? (post.kind === "alg" ? post.alg : post.kind === "video" ? "Shared a video" : null);
    }),
  );

  return (
    <HomeCard id="clubs" title="Your clubs" seeAll={{ href: "/people?tab=clubs" }}>
      <ul className="flex flex-col gap-2">
        {clubs.map((c, i) => (
          <li key={c.id}>
            <Link href={`/clubs/${c.slug}`} className="block rounded-lg bg-muted/40 px-3 py-2 hover:bg-muted">
              <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
              <p className="truncate text-xs text-muted-foreground">{newest[i] ?? "No posts yet"}</p>
            </Link>
          </li>
        ))}
      </ul>
    </HomeCard>
  );
}
