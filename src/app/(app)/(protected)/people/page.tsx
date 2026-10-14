import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, PersonList, PersonRow } from "@/components/social/person-row";
import { FollowButton } from "@/components/social/follow-button";
import { PeopleSearch } from "@/components/social/people-search";
import { RequestActions } from "@/components/social/row-actions";
import { getUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getActivityFeed, getPendingRequests, getSuggestions } from "@/lib/social/dal";
import type { FeedItem } from "@/lib/social/types";
import { eventLabel, isTimerEvent } from "@/lib/timer/events";
import { formatMs } from "@/lib/timer/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "People — CubeHub", robots: { index: false } };

interface Props {
  searchParams: Promise<{ tab?: string; q?: string; scope?: string }>;
}

// "People", not "Friends": the system is follow and followers (pre-beta review,
// 2026-10-15). A mutual follow still shows a "Friends" chip on the profile.
// No leaderboard for now (founder, 2026-10-14): times can be faked by tapping
// the timer, so ranking waits for verified solves.
type Tab = "feed" | "find" | "requests";

const FEED_DAYS = 30;

const CATEGORY_LABEL: Record<string, string> = {
  single: "single",
  mean3: "Mo3",
  ao5: "Ao5",
  ao12: "Ao12",
  ao100: "Ao100",
};

export default async function PeoplePage({ searchParams }: Props) {
  const sp = await searchParams;
  const user = await getUser();
  const supabase = await createClient();
  const [requests, me] = await Promise.all([
    getPendingRequests(),
    user ? supabase.from("profiles").select("is_public").eq("id", user.id).single() : null,
  ]);

  // Requests only exist for a private profile; the tab stays while any are
  // waiting, so going public with requests pending doesn't hide them.
  const showRequests = me?.data?.is_public === false || requests.length > 0;
  const tabs: { id: Tab; label: string }[] = [
    { id: "feed", label: "Activity" },
    { id: "find", label: "Find people" },
    ...(showRequests ? [{ id: "requests" as const, label: "Requests" }] : []),
  ];
  const tab: Tab = tabs.some((t) => t.id === sp.tab) ? (sp.tab as Tab) : "feed";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">People</h1>

      <nav aria-label="People sections" className="hide-scrollbar -mx-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-1 rounded-xl border border-border bg-card/60 p-1">
          {tabs.map((t) => (
            <li key={t.id}>
              <Link
                href={`/people?tab=${t.id}`}
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

      {tab === "feed" && <Feed scope={sp.scope === "everyone" ? "everyone" : "following"} />}
      {tab === "requests" && <Requests requests={requests} />}
      {tab === "find" && (
        <PeopleSearch initialQuery={sp.q ?? ""}>
          <Suggestions />
        </PeopleSearch>
      )}
    </div>
  );
}

async function Feed({ scope }: { scope: "following" | "everyone" }) {
  let items = await getActivityFeed(scope, FEED_DAYS);
  // With a small group, the people you follow are often quiet: show everyone
  // rather than an empty page, and say so.
  const fellBack = scope === "following" && items.length === 0;
  if (fellBack) items = await getActivityFeed("everyone", FEED_DAYS);
  const shown = fellBack ? "everyone" : scope;

  return (
    <section className="space-y-3" aria-label="Activity">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-border bg-card/60 p-0.5 text-xs">
          {(["following", "everyone"] as const).map((s) => (
            <Link
              key={s}
              href={`/people?tab=feed&scope=${s}`}
              scroll={false}
              aria-current={s === shown ? "true" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium capitalize transition-colors",
                s === shown ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </Link>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Last {FEED_DAYS} days</p>
      </div>

      {fellBack && items.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Nobody you follow has been active lately, so here&apos;s everyone.{" "}
          <Link href="/people?tab=find" className="text-primary hover:underline">
            Find people to follow
          </Link>
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState title="Nothing here yet">
          Solves, new PBs, badges and learned cases from other cubers show up here.{" "}
          <Link href="/people?tab=find" className="text-primary hover:underline">
            Find people to follow
          </Link>
        </EmptyState>
      ) : (
        <PersonList>
          {items.map((item, i) => (
            <PersonRow key={`${item.kind}-${item.person.id}-${item.at}-${i}`} person={item.person} detail={feedDate(item.at)}>
              <span className="max-w-[12rem] text-right text-xs text-muted-foreground">{feedLine(item)}</span>
            </PersonRow>
          ))}
        </PersonList>
      )}
    </section>
  );
}

function eventName(puzzle: string | null): string {
  if (!puzzle) return "";
  return isTimerEvent(puzzle) ? eventLabel(puzzle) : puzzle;
}

function feedLine(item: FeedItem): React.ReactNode {
  const time = (ms: number | null) =>
    ms === null ? null : <span className="font-mono font-semibold text-foreground tabular-nums">{formatMs(ms)}</span>;
  switch (item.kind) {
    case "pb":
      return (
        <>
          New {eventName(item.puzzleType)} {CATEGORY_LABEL[item.category ?? ""] ?? item.category} PB {time(item.timeMs)}
        </>
      );
    case "practice":
      return (
        <>
          {item.n} {eventName(item.puzzleType)} solve{item.n === 1 ? "" : "s"}
          {item.timeMs !== null && <> · best {time(item.timeMs)}</>}
        </>
      );
    case "badge":
      return (
        <>
          Earned <span className="font-medium text-foreground">{item.label}</span>
        </>
      );
    case "learned":
      return (
        <>
          Learned {item.n} {item.label} case{item.n === 1 ? "" : "s"}
        </>
      );
  }
}

function feedDate(at: string): string {
  return new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

function Requests({ requests }: { requests: Awaited<ReturnType<typeof getPendingRequests>> }) {
  if (requests.length === 0) {
    return (
      <EmptyState title="No follow requests">
        Your profile is private, so people who want to follow you ask first. Their requests show up here.
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

async function Suggestions() {
  const suggestions = await getSuggestions();
  return (
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
              detail={
                [p.followsMe ? "Follows you" : null, p.ao12Ms ? `3x3 Ao12 ${formatMs(p.ao12Ms)}` : null]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
            >
              <FollowButton
                targetId={p.id}
                name={p.displayName || p.username}
                initial={p.followsMe ? "follow-back" : "follow"}
                isPrivate={false}
                size="xs"
              />
            </PersonRow>
          ))}
        </PersonList>
      )}
    </>
  );
}
