import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { EmptyState, PersonList, PersonRow } from "@/components/social/person-row";
import { FollowButton } from "@/components/social/follow-button";
import { RequestActions } from "@/components/social/row-actions";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getFriendsLeaderboard,
  getFriendsRecentPbs,
  getPendingRequests,
  getSuggestions,
  searchProfiles,
} from "@/lib/social/dal";
import { eventLabel, isTimerEvent, TIMER_EVENTS } from "@/lib/timer/events";
import { formatMs } from "@/lib/timer/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Friends — CubeHub", robots: { index: false } };

interface Props {
  searchParams: Promise<{ tab?: string; event?: string; cat?: string; q?: string }>;
}

const TABS = [
  { id: "leaderboard", label: "Leaderboard" },
  { id: "pbs", label: "Recent PBs" },
  { id: "requests", label: "Requests" },
  { id: "find", label: "Find people" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const CATEGORIES = [
  { id: "single", label: "Single" },
  { id: "ao5", label: "Ao5" },
  { id: "ao12", label: "Ao12" },
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  single: "single",
  mean3: "Mo3",
  ao5: "Ao5",
  ao12: "Ao12",
  ao100: "Ao100",
};

export default async function FriendsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as Tab) : "leaderboard";
  const requests = await getPendingRequests();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Friends</h1>

      <nav aria-label="Friends sections" className="hide-scrollbar -mx-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-1 rounded-xl border border-border bg-card/60 p-1">
          {TABS.map((t) => (
            <li key={t.id}>
              <Link
                href={`/friends?tab=${t.id}`}
                scroll={false}
                aria-current={t.id === tab ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                  t.id === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t.label}
                {t.id === "requests" && requests.length > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-xs font-bold",
                      t.id === tab ? "bg-primary-foreground/20" : "bg-primary/15 text-primary",
                    )}
                  >
                    {requests.length}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "leaderboard" && <Leaderboard event={sp.event} cat={sp.cat} />}
      {tab === "pbs" && <RecentPbs />}
      {tab === "requests" && <Requests requests={requests} />}
      {tab === "find" && <FindPeople query={sp.q ?? ""} />}
    </div>
  );
}

async function Leaderboard({ event, cat }: { event?: string; cat?: string }) {
  const selected = event && isTimerEvent(event) ? event : "333";
  const category = CATEGORIES.some((c) => c.id === cat) ? (cat as string) : "single";
  const rows = await getFriendsLeaderboard(selected, category);
  const href = (e: string, c: string) => `/friends?tab=leaderboard&event=${e}&cat=${c}`;

  return (
    <section className="space-y-4" aria-label="Friends leaderboard">
      <nav aria-label="Events" className="hide-scrollbar -mx-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-1">
          {TIMER_EVENTS.map((e) => (
            <li key={e.id}>
              <Link
                href={href(e.id, category)}
                scroll={false}
                aria-current={e.id === selected ? "page" : undefined}
                className={cn(
                  "block rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors",
                  e.id === selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {eventLabel(e.id)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex gap-1">
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={href(selected, c.id)}
            scroll={false}
            aria-current={c.id === category ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1 text-sm font-medium transition-colors",
              c.id === category ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title={`No ${eventLabel(selected)} ${CATEGORY_LABEL[category]} times yet`}>
          You and the cubers you follow show up here.{" "}
          <Link href="/friends?tab=find" className="text-primary hover:underline">
            Find people
          </Link>
        </EmptyState>
      ) : (
        <ol className="divide-y divide-border rounded-2xl border border-border bg-card/60 px-4">
          {rows.map((r, i) => (
            <li key={r.id} className={cn("flex items-center gap-3 py-2.5", r.isMe && "font-semibold")}>
              <span className="w-6 text-right font-mono text-sm text-muted-foreground tabular-nums">{i + 1}</span>
              <Link href={`/profile/${r.username}`} className="min-w-0 flex-1 truncate text-sm text-foreground hover:underline">
                {r.displayName || r.username}
                {r.isMe && <span className="ml-1.5 text-xs font-medium text-primary">You</span>}
              </Link>
              <span className="font-mono text-base font-semibold text-foreground tabular-nums">{formatMs(r.timeMs)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

async function RecentPbs() {
  const pbs = await getFriendsRecentPbs(14);
  if (pbs.length === 0) {
    return (
      <EmptyState title="No new PBs from people you follow in the last two weeks">
        <Link href="/friends?tab=find" className="text-primary hover:underline">
          Follow more cubers
        </Link>
      </EmptyState>
    );
  }
  return (
    <PersonList>
      {pbs.map((pb) => (
        <PersonRow
          key={`${pb.id}-${pb.puzzleType}-${pb.category}`}
          person={pb}
          detail={new Date(pb.achievedAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            timeZone: "Asia/Kolkata",
          })}
        >
          <span className="text-right">
            <span className="block font-mono text-base font-semibold text-foreground tabular-nums">
              {formatMs(pb.timeMs)}
            </span>
            <span className="block text-xs text-muted-foreground">
              {isTimerEvent(pb.puzzleType) ? eventLabel(pb.puzzleType) : pb.puzzleType}{" "}
              {CATEGORY_LABEL[pb.category] ?? pb.category}
            </span>
          </span>
        </PersonRow>
      ))}
    </PersonList>
  );
}

function Requests({ requests }: { requests: Awaited<ReturnType<typeof getPendingRequests>> }) {
  if (requests.length === 0) {
    return (
      <EmptyState title="No follow requests">
        Requests appear here when your profile is private.
      </EmptyState>
    );
  }
  return (
    <PersonList>
      {requests.map((r) => (
        <PersonRow key={r.id} person={r}>
          <RequestActions followerId={r.id} />
        </PersonRow>
      ))}
    </PersonList>
  );
}

async function FindPeople({ query }: { query: string }) {
  const q = query.trim();
  const [results, suggestions] = await Promise.all([
    q.length >= 2 ? searchProfiles(q) : Promise.resolve([]),
    q.length >= 2 ? Promise.resolve([]) : getSuggestions(),
  ]);

  return (
    <section className="space-y-4" aria-label="Find people">
      <form action="/friends" className="flex gap-2" role="search">
        <input type="hidden" name="tab" value="find" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search by username or name"
          aria-label="Search cubers"
          minLength={2}
          maxLength={40}
          autoComplete="off"
        />
        <button type="submit" className={buttonVariants({ variant: "outline" })} aria-label="Search">
          <Search />
        </button>
      </form>

      {q.length >= 2 ? (
        results.length === 0 ? (
          <EmptyState title={`No cubers match “${q}”`} />
        ) : (
          <PersonList>
            {results.map((p) => (
              <PersonRow key={p.id} person={p}>
                <FollowButton
                  targetId={p.id}
                  name={p.displayName || p.username}
                  initial={p.iFollow === "accepted" ? "following" : p.iFollow === "pending" ? "requested" : "follow"}
                  isPrivate={!p.isPublic}
                  size="xs"
                />
              </PersonRow>
            ))}
          </PersonList>
        )
      ) : (
        <>
          <h2 className="text-sm font-semibold text-foreground">Suggested for you</h2>
          {suggestions.length === 0 ? (
            <EmptyState title="No suggestions right now">Try searching for someone you know.</EmptyState>
          ) : (
            <PersonList>
              {suggestions.map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  detail={p.ao12Ms ? `3x3 Ao12 ${formatMs(p.ao12Ms)}` : undefined}
                >
                  <FollowButton
                    targetId={p.id}
                    name={p.displayName || p.username}
                    initial="follow"
                    isPrivate={false}
                    size="xs"
                  />
                </PersonRow>
              ))}
            </PersonList>
          )}
        </>
      )}
    </section>
  );
}
